import type { Action } from 'svelte/action';

export interface SortableOptions {
  /** Called with the source and destination indices once a drag completes. */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Selector for the sortable items. Each item must carry a `data-index` attribute. */
  itemSelector?: string;
  /** Selector for the region of an item that initiates a drag. Defaults to the whole item. */
  handleSelector?: string;
  /** When true all drag interaction is ignored. */
  disabled?: boolean;
  /** Optional hook used to announce reordering to assistive technology. */
  onAnnounce?: (message: string) => void;
}

interface ItemMetrics {
  element: HTMLElement;
  index: number;
  /** Top offset in viewport coordinates, refreshed whenever a scroll occurs. */
  top: number;
  height: number;
  /** Vertical offset currently applied by the live reorder preview. */
  offset: number;
}

const DRAG_THRESHOLD_PX = 4;
const EDGE_SCROLL_ZONE_PX = 90;
const EDGE_SCROLL_MAX_SPEED = 22;

export const useSortable: Action<HTMLElement, SortableOptions> = (node, options) => {
  let config: SortableOptions = { itemSelector: '[data-sortable-item]', ...options };

  let pointerId: number | null = null;
  let pointerStart = { x: 0, y: 0 };
  let pointerClient = { x: 0, y: 0 };
  let grabOffsetY = 0;
  let sourceElement: HTMLElement | null = null;
  let sourceIndex = -1;
  let targetIndex = -1;
  let metrics: ItemMetrics[] = [];
  let slotSize = 0;
  let floating: HTMLElement | null = null;
  let active = false;
  let scrollFrame: number | null = null;
  let suppressNextClick = false;
  let scrollContainer: HTMLElement | null = null;
  let lastScrollTop = 0;

  // Keyboard reordering state.
  let keyboardIndex = -1;
  let keyboardStart = -1;

  function itemSelector(): string {
    return config.itemSelector ?? '[data-sortable-item]';
  }

  function getItems(): HTMLElement[] {
    return Array.from(node.querySelectorAll<HTMLElement>(itemSelector()));
  }

  function indexOf(element: HTMLElement): number {
    const raw = element.dataset.index;
    const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? -1 : parsed;
  }

  /**
   * The nearest ancestor that actually scrolls vertically. The app shell scrolls an
   * inner `<main>` rather than the window, so auto-scroll has to target that element.
   */
  function findScrollContainer(): HTMLElement | null {
    let element: HTMLElement | null = node.parentElement;
    while (element && element !== document.body && element !== document.documentElement) {
      const overflowY = getComputedStyle(element).overflowY;
      const scrollable = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
      if (scrollable && element.scrollHeight > element.clientHeight + 1) return element;
      element = element.parentElement;
    }
    return null;
  }

  function scrollTopOf(): number {
    return scrollContainer ? scrollContainer.scrollTop : window.scrollY;
  }

  function scrollBounds(): { top: number; bottom: number } {
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
    }
    return { top: 0, bottom: window.innerHeight };
  }

  function measure(): void {
    metrics = getItems()
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, index: indexOf(element), top: rect.top, height: rect.height, offset: 0 };
      })
      .filter((entry) => entry.index >= 0)
      .sort((a, b) => a.index - b.index);

    const source = metrics.find((entry) => entry.index === sourceIndex);
    const gap = readGap();
    slotSize = (source?.height ?? 0) + gap;
  }

  /**
   * Keeps the cached viewport positions in sync with the scroll container. Tracking the
   * scroll delta is exact and, unlike re-reading rects, is immune to in-flight transitions.
   */
  function syncScroll(): void {
    const current = scrollTopOf();
    const delta = current - lastScrollTop;
    if (delta === 0) return;
    lastScrollTop = current;
    for (const entry of metrics) entry.top -= delta;
  }

  function readGap(): number {
    if (metrics.length > 1) {
      const measured = metrics[1].top - (metrics[0].top + metrics[0].height);
      if (Number.isFinite(measured) && measured >= 0) return measured;
    }
    const parsed = Number.parseFloat(getComputedStyle(node).rowGap || '0');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function createFloating(source: HTMLElement): void {
    const rect = source.getBoundingClientRect();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-index');
    clone.removeAttribute('data-sortable-item');
    clone.classList.add('sortable-floating');
    Object.assign(clone.style, {
      position: 'fixed',
      margin: '0',
      top: '0',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform: `translateY(${rect.top}px)`,
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(clone);
    floating = clone;
  }

  function moveFloating(): void {
    if (!floating) return;
    floating.style.transform = `translateY(${pointerClient.y - grabOffsetY}px)`;
  }

  /**
   * The destination index equals the number of non-dragged items whose midpoint
   * sits above the dragged item's centre, which matches splice-remove-then-insert.
   */
  function computeTargetIndex(): number {
    const center = pointerClient.y - grabOffsetY + slotSize / 2;
    let index = 0;
    for (const entry of metrics) {
      if (entry.index === sourceIndex) continue;
      if (center > entry.top + entry.height / 2) index += 1;
    }
    return index;
  }

  function applyShift(): void {
    for (const entry of metrics) {
      if (entry.index === sourceIndex) continue;
      let offset = 0;
      if (sourceIndex < targetIndex && entry.index > sourceIndex && entry.index <= targetIndex) {
        offset = -slotSize;
      } else if (targetIndex < sourceIndex && entry.index >= targetIndex && entry.index < sourceIndex) {
        offset = slotSize;
      }
      entry.offset = offset;
      entry.element.style.transform = offset === 0 ? '' : `translate3d(0, ${offset}px, 0)`;
    }
  }

  function clearShift(): void {
    for (const entry of metrics) {
      entry.offset = 0;
      entry.element.style.transform = '';
      entry.element.classList.remove('sortable-shifting');
    }
  }

  function handleScrollDuringDrag(): void {
    if (!active) return;
    syncScroll();
    updateTarget();
  }

  function startAutoScroll(): void {
    if (scrollFrame !== null) return;
    const step = () => {
      if (!active) {
        scrollFrame = null;
        return;
      }
      const bounds = scrollBounds();
      const zone = Math.min(EDGE_SCROLL_ZONE_PX, Math.max(24, (bounds.bottom - bounds.top) / 4));
      const y = pointerClient.y;
      let delta = 0;
      if (y < bounds.top + zone) {
        delta = -EDGE_SCROLL_MAX_SPEED * Math.min(1, (bounds.top + zone - y) / zone);
      } else if (y > bounds.bottom - zone) {
        delta = EDGE_SCROLL_MAX_SPEED * Math.min(1, (y - (bounds.bottom - zone)) / zone);
      }

      if (delta !== 0) {
        const before = scrollTopOf();
        if (scrollContainer) {
          scrollContainer.scrollTop = before + delta;
        } else {
          window.scrollBy(0, delta);
        }
        if (scrollTopOf() !== before) {
          // Items slid under a stationary pointer: re-anchor positions and retarget.
          syncScroll();
          updateTarget();
        }
      }
      scrollFrame = requestAnimationFrame(step);
    };
    scrollFrame = requestAnimationFrame(step);
  }

  function stopAutoScroll(): void {
    if (scrollFrame !== null) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
    }
  }

  function updateTarget(): void {
    const next = computeTargetIndex();
    if (next === targetIndex) return;
    targetIndex = next;
    applyShift();
  }

  function beginDrag(): void {
    if (!sourceElement) return;
    active = true;
    targetIndex = sourceIndex;
    scrollContainer = findScrollContainer();
    lastScrollTop = scrollTopOf();
    measure();
    createFloating(sourceElement);
    moveFloating();
    sourceElement.classList.add('sortable-source');
    node.classList.add('sortable-active');
    document.body.classList.add('sortable-dragging');
    for (const entry of metrics) {
      if (entry.index !== sourceIndex) entry.element.classList.add('sortable-shifting');
    }
    window.addEventListener('scroll', handleScrollDuringDrag, true);
    startAutoScroll();
  }

  function finishDrag(commit: boolean): void {
    stopAutoScroll();
    window.removeEventListener('scroll', handleScrollDuringDrag, true);
    clearShift();
    floating?.remove();
    floating = null;
    sourceElement?.classList.remove('sortable-source');
    node.classList.remove('sortable-active');
    document.body.classList.remove('sortable-dragging');

    const from = sourceIndex;
    const to = targetIndex;
    const wasActive = active;

    active = false;
    pointerId = null;
    sourceElement = null;
    sourceIndex = -1;
    targetIndex = -1;
    metrics = [];
    scrollContainer = null;

    if (wasActive) suppressNextClick = true;
    if (commit && wasActive && from >= 0 && to >= 0 && from !== to) {
      config.onReorder(from, to);
      config.onAnnounce?.(`Moved item from position ${from + 1} to position ${to + 1}.`);
    }
  }

  function handlePointerDown(event: PointerEvent): void {
    suppressNextClick = false;
    if (config.disabled || active || pointerId !== null) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (!(event.target instanceof Element)) return;

    const item = event.target.closest<HTMLElement>(itemSelector());
    if (!item || !node.contains(item)) return;

    const inHandle = Boolean(event.target.closest('[data-drag-handle]'));
    if (config.handleSelector && !event.target.closest(config.handleSelector) && !inHandle) return;
    if (!inHandle && event.target.closest('button, a, input, select, textarea, [data-no-drag]')) return;

    const index = indexOf(item);
    if (index < 0) return;

    pointerId = event.pointerId;
    sourceElement = item;
    sourceIndex = index;
    pointerStart = { x: event.clientX, y: event.clientY };
    pointerClient = { x: event.clientX, y: event.clientY };
    grabOffsetY = event.clientY - item.getBoundingClientRect().top;

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('keydown', handleDragKeydown, true);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (pointerId === null || event.pointerId !== pointerId) return;

    pointerClient = { x: event.clientX, y: event.clientY };

    if (!active) {
      const travelled = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      if (travelled < DRAG_THRESHOLD_PX) return;
      beginDrag();
    }

    if (event.cancelable) event.preventDefault();
    moveFloating();
    updateTarget();
  }

  function handlePointerUp(event: PointerEvent): void {
    if (pointerId === null || event.pointerId !== pointerId) return;
    teardownPointerListeners();
    finishDrag(true);
  }

  function handlePointerCancel(event: PointerEvent): void {
    if (pointerId === null || event.pointerId !== pointerId) return;
    teardownPointerListeners();
    targetIndex = sourceIndex;
    finishDrag(false);
  }

  function handleDragKeydown(event: KeyboardEvent): void {
    if (!active || event.key !== 'Escape') return;
    event.preventDefault();
    teardownPointerListeners();
    targetIndex = sourceIndex;
    finishDrag(false);
  }

  function teardownPointerListeners(): void {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
    window.removeEventListener('keydown', handleDragKeydown, true);
  }

  function handleClickCapture(event: MouseEvent): void {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function setKeyboardMode(item: HTMLElement, index: number): void {
    for (const element of getItems()) element.classList.remove('sortable-keyboard');
    keyboardIndex = index;
    keyboardStart = index;
    item.classList.add('sortable-keyboard');
  }

  function exitKeyboardMode(): void {
    for (const element of getItems()) element.classList.remove('sortable-keyboard');
    keyboardIndex = -1;
    keyboardStart = -1;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (config.disabled || active) return;
    if (!(event.target instanceof Element)) return;

    const item = event.target.closest<HTMLElement>(itemSelector());
    if (!item || !node.contains(item)) return;
    const index = indexOf(item);
    if (index < 0) return;

    const total = getItems().length;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (keyboardIndex === -1) {
        setKeyboardMode(item, index);
        config.onAnnounce?.(`Grabbed item at position ${index + 1} of ${total}. Use arrow keys to move, space to drop, escape to cancel.`);
      } else {
        const dropped = keyboardIndex;
        exitKeyboardMode();
        config.onAnnounce?.(`Dropped at position ${dropped + 1} of ${total}.`);
      }
      return;
    }

    if (event.key === 'Escape' && keyboardIndex !== -1) {
      event.preventDefault();
      const from = keyboardIndex;
      const to = keyboardStart;
      exitKeyboardMode();
      if (from !== to) config.onReorder(from, to);
      config.onAnnounce?.('Reorder cancelled.');
      return;
    }

    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    const direction = event.key === 'ArrowUp' ? -1 : 1;

    // Outside grab mode, arrows only reorder with a modifier so plain arrows stay navigational.
    if (keyboardIndex === -1) {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
      const to = Math.min(total - 1, Math.max(0, index + direction));
      event.preventDefault();
      if (to === index) return;
      config.onReorder(index, to);
      config.onAnnounce?.(`Moved to position ${to + 1} of ${total}.`);
      return;
    }

    event.preventDefault();
    const next = Math.min(total - 1, Math.max(0, keyboardIndex + direction));
    if (next === keyboardIndex) return;
    config.onReorder(keyboardIndex, next);
    keyboardIndex = next;
    config.onAnnounce?.(`Position ${next + 1} of ${total}.`);
  }

  node.addEventListener('pointerdown', handlePointerDown);
  node.addEventListener('click', handleClickCapture, true);
  node.addEventListener('keydown', handleKeydown);

  return {
    update(next: SortableOptions) {
      config = { itemSelector: '[data-sortable-item]', ...next };
      if (config.disabled && active) {
        teardownPointerListeners();
        targetIndex = sourceIndex;
        finishDrag(false);
      }
    },
    destroy() {
      teardownPointerListeners();
      stopAutoScroll();
      window.removeEventListener('scroll', handleScrollDuringDrag, true);
      floating?.remove();
      floating = null;
      document.body.classList.remove('sortable-dragging');
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('click', handleClickCapture, true);
      node.removeEventListener('keydown', handleKeydown);
    },
  };
};


