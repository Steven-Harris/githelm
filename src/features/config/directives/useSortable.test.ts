import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useSortable } from './useSortable';

const ITEM_HEIGHT = 50;
const ITEM_GAP = 10;

function stubRects(container: HTMLElement): void {
  const items = Array.from(container.querySelectorAll<HTMLElement>('[data-sortable-item]'));
  items.forEach((item, index) => {
    const top = index * (ITEM_HEIGHT + ITEM_GAP);
    item.getBoundingClientRect = () =>
      ({
        top,
        bottom: top + ITEM_HEIGHT,
        left: 0,
        right: 200,
        width: 200,
        height: ITEM_HEIGHT,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
  });
}

function pointer(type: string, clientY: number, extra: Record<string, unknown> = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: 10,
    clientY,
    ...extra,
  });
}

describe('useSortable', () => {
  let container: HTMLElement;
  let onReorder: Mock<(from: number, to: number) => void>;
  let directive: ReturnType<typeof useSortable>;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);

    container = document.createElement('div');
    container.innerHTML = `
      <div data-sortable-item data-index="0"><button data-drag-handle>h</button><button class="edit">e</button></div>
      <div data-sortable-item data-index="1"><button data-drag-handle>h</button><button class="edit">e</button></div>
      <div data-sortable-item data-index="2"><button data-drag-handle>h</button><button class="edit">e</button></div>
    `;
    document.body.appendChild(container);
    stubRects(container);

    onReorder = vi.fn<(from: number, to: number) => void>();
    directive = useSortable(container, { onReorder });
  });

  afterEach(() => {
    if (directive && typeof directive === 'object' && 'destroy' in directive) {
      directive.destroy();
    }
    container.remove();
    document.querySelectorAll('.sortable-floating').forEach((el) => el.remove());
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function handle(index: number): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-index="${index}"] [data-drag-handle]`)!;
  }

  function drag(fromIndex: number, toClientY: number): void {
    const start = fromIndex * (ITEM_HEIGHT + ITEM_GAP) + ITEM_HEIGHT / 2;
    handle(fromIndex).dispatchEvent(pointer('pointerdown', start));
    window.dispatchEvent(pointer('pointermove', start + (toClientY > start ? 10 : -10)));
    window.dispatchEvent(pointer('pointermove', toClientY));
    window.dispatchEvent(pointer('pointerup', toClientY));
  }

  it('does not start a drag before the movement threshold is exceeded', () => {
    handle(0).dispatchEvent(pointer('pointerdown', 25));
    window.dispatchEvent(pointer('pointermove', 27));

    expect(document.querySelector('.sortable-floating')).toBeNull();
    expect(container.querySelector('.sortable-source')).toBeNull();
  });

  it('creates a floating clone and marks the source once dragging starts', () => {
    handle(0).dispatchEvent(pointer('pointerdown', 25));
    window.dispatchEvent(pointer('pointermove', 60));

    expect(document.querySelector('.sortable-floating')).not.toBeNull();
    expect(container.querySelector('[data-index="0"]')!.classList.contains('sortable-source')).toBe(true);
    expect(document.body.classList.contains('sortable-dragging')).toBe(true);
  });

  it('shifts neighbouring items to preview the drop position', () => {
    handle(0).dispatchEvent(pointer('pointerdown', 25));
    window.dispatchEvent(pointer('pointermove', 60));
    window.dispatchEvent(pointer('pointermove', 95));

    const second = container.querySelector<HTMLElement>('[data-index="1"]')!;
    expect(second.style.transform).toContain('-60px');
  });

  it('reorders downward and clears preview transforms on drop', () => {
    drag(0, 145);

    expect(onReorder).toHaveBeenCalledWith(0, 2);
    container.querySelectorAll<HTMLElement>('[data-sortable-item]').forEach((item) => {
      expect(item.style.transform).toBe('');
    });
    expect(document.querySelector('.sortable-floating')).toBeNull();
    expect(document.body.classList.contains('sortable-dragging')).toBe(false);
  });

  it('reorders upward', () => {
    drag(2, 5);

    expect(onReorder).toHaveBeenCalledWith(2, 0);
  });

  it('does not reorder when the item is dropped in its original slot', () => {
    drag(1, 68);

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('cancels the drag on Escape without reordering', () => {
    handle(0).dispatchEvent(pointer('pointerdown', 25));
    window.dispatchEvent(pointer('pointermove', 60));
    window.dispatchEvent(pointer('pointermove', 145));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(document.querySelector('.sortable-floating')).toBeNull();
  });

  it('suppresses the click that follows a drag so row buttons do not fire', () => {
    const editButton = container.querySelector<HTMLElement>('[data-index="0"] .edit')!;
    const clickHandler = vi.fn();
    editButton.addEventListener('click', clickHandler);

    drag(0, 145);
    editButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(clickHandler).not.toHaveBeenCalled();
  });

  it('allows clicks when no drag occurred', () => {
    const editButton = container.querySelector<HTMLElement>('[data-index="0"] .edit')!;
    const clickHandler = vi.fn();
    editButton.addEventListener('click', clickHandler);

    editButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(clickHandler).toHaveBeenCalled();
  });

  it('ignores drags initiated from non-handle interactive elements', () => {
    const editButton = container.querySelector<HTMLElement>('[data-index="0"] .edit')!;
    editButton.dispatchEvent(pointer('pointerdown', 25));
    window.dispatchEvent(pointer('pointermove', 145));

    expect(document.querySelector('.sortable-floating')).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('ignores drags while disabled', () => {
    if (directive && typeof directive === 'object' && 'update' in directive) {
      directive.update!({ onReorder, disabled: true });
    }

    drag(0, 145);

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('moves an item with a modifier plus arrow key', () => {
    handle(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, ctrlKey: true }));

    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it('supports grab, move and drop with the keyboard', () => {
    const target = handle(1);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(container.querySelector('[data-index="1"]')!.classList.contains('sortable-keyboard')).toBe(true);

    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(onReorder).toHaveBeenCalledWith(1, 0);

    target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(container.querySelector('.sortable-keyboard')).toBeNull();
  });

  it('restores the original position when a keyboard reorder is cancelled', () => {
    const target = handle(0);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(onReorder).toHaveBeenLastCalledWith(0, 1);

    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onReorder).toHaveBeenLastCalledWith(1, 0);
  });

  it('cleans up global state on destroy', () => {
    handle(0).dispatchEvent(pointer('pointerdown', 25));
    window.dispatchEvent(pointer('pointermove', 60));

    (directive as { destroy: () => void }).destroy();

    expect(document.querySelector('.sortable-floating')).toBeNull();
    expect(document.body.classList.contains('sortable-dragging')).toBe(false);
  });
});
