import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useDraggable } from './useDraggable';

// Mock console methods to avoid clutter during tests
vi.mock('console', () => ({
  log: vi.fn(),
  warn: vi.fn(),
}));

describe('useDraggable', () => {
  let container: HTMLElement;
  let mockOnReorder: Mock<(fromIndex: number, toIndex: number) => void>;
  let directive: ReturnType<typeof useDraggable>;

  beforeEach(() => {
    // Create a test container
    container = document.createElement('div');
    container.innerHTML = `
      <div data-index="0" draggable="true">Item 1</div>
      <div data-index="1" draggable="true">Item 2</div>
      <div data-index="2" draggable="true">Item 3</div>
    `;
    document.body.appendChild(container);

    // Mock the onReorder callback
    mockOnReorder = vi.fn<(fromIndex: number, toIndex: number) => void>();

    // Initialize the directive
    directive = useDraggable(container, { onReorder: mockOnReorder });
  });

  afterEach(() => {
    // Clean up
    if (directive && typeof directive === 'object' && 'destroy' in directive) {
      directive.destroy();
    }
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  it('should prevent form submission during drag operation', () => {
    const firstItem = container.querySelector('[data-index="0"]') as HTMLElement;

    // Simulate drag start
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    firstItem.dispatchEvent(dragStartEvent);

    // Create a form and try to submit it during drag
    const form = document.createElement('form');
    document.body.appendChild(form);

    const submitHandler = vi.fn();
    form.addEventListener('submit', submitHandler);

    // Try to submit the form during drag operation
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    // The form submission should be prevented
    expect(submitHandler).not.toHaveBeenCalled();

    // Clean up
    document.body.removeChild(form);
  });

  it('should prevent click events during drag operation', () => {
    const firstItem = container.querySelector('[data-index="0"]') as HTMLElement;

    // Simulate drag start
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    firstItem.dispatchEvent(dragStartEvent);

    // Create a button and try to click it during drag
    const button = document.createElement('button');
    button.type = 'submit';
    document.body.appendChild(button);

    const clickHandler = vi.fn();
    button.addEventListener('click', clickHandler);

    // Try to click the button during drag operation
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(clickEvent);

    // The click should be prevented
    expect(clickHandler).not.toHaveBeenCalled();

    // Clean up
    document.body.removeChild(button);
  });

  it('should allow form submission after drag operation ends', () => {
    const firstItem = container.querySelector('[data-index="0"]') as HTMLElement;

    // Simulate drag start
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    firstItem.dispatchEvent(dragStartEvent);

    // Simulate drag end
    const dragEndEvent = new DragEvent('dragend', { bubbles: true });
    firstItem.dispatchEvent(dragEndEvent);

    // Create a form and try to submit it after drag ends
    const form = document.createElement('form');
    document.body.appendChild(form);

    const submitHandler = vi.fn((e) => e.preventDefault()); // Prevent actual submission
    form.addEventListener('submit', submitHandler);

    // Try to submit the form after drag operation
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    // The form submission should be allowed now
    expect(submitHandler).toHaveBeenCalled();

    // Clean up
    document.body.removeChild(form);
  });

  it('should properly handle drop events and call onReorder', () => {
    const firstItem = container.querySelector('[data-index="0"]') as HTMLElement;
    const thirdItem = container.querySelector('[data-index="2"]') as HTMLElement;

    // Simulate drag start on first item
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    firstItem.dispatchEvent(dragStartEvent);

    // Simulate drop on third item
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });

    // Set up the drop event to target the third item
    Object.defineProperty(dropEvent, 'target', {
      value: thirdItem,
      writable: false,
    });

    thirdItem.dispatchEvent(dropEvent);

    // The onReorder callback should be called with correct indices
    expect(mockOnReorder).toHaveBeenCalledWith(0, 2);
  });

  it('should prevent default on drop events', () => {
    const firstItem = container.querySelector('[data-index="0"]') as HTMLElement;
    const secondItem = container.querySelector('[data-index="1"]') as HTMLElement;

    // Simulate drag start
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    firstItem.dispatchEvent(dragStartEvent);

    // Simulate drop event
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });

    Object.defineProperty(dropEvent, 'target', {
      value: secondItem,
      writable: false,
    });

    const preventDefaultSpy = vi.spyOn(dropEvent, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(dropEvent, 'stopPropagation');

    secondItem.dispatchEvent(dropEvent);

    // Both preventDefault and stopPropagation should be called
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('should not call onReorder when dropping on the same item', () => {
    const firstItem = container.querySelector('[data-index="0"]') as HTMLElement;

    // Simulate drag start on first item
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    firstItem.dispatchEvent(dragStartEvent);

    // Simulate drop on the same item
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });

    Object.defineProperty(dropEvent, 'target', {
      value: firstItem,
      writable: false,
    });

    firstItem.dispatchEvent(dropEvent);

    // The onReorder callback should not be called
    expect(mockOnReorder).not.toHaveBeenCalled();
  });
});