import '@testing-library/jest-dom';

// Polyfill for DragEvent which is not available in Node.js test environment
class MockDragEvent extends Event {
  dataTransfer: DataTransfer;

  constructor(type: string, eventInitDict?: DragEventInit) {
    super(type, eventInitDict);
    this.dataTransfer = eventInitDict?.dataTransfer || new DataTransfer();
  }
}

// Polyfill for DataTransfer which is not available in Node.js test environment
class MockDataTransfer {
  effectAllowed: string = 'uninitialized';
  dropEffect: string = 'none';
  files: FileList = {} as FileList;
  items: DataTransferItemList = {} as DataTransferItemList;
  types: readonly string[] = [];

  clearData(_format?: string): void {
    // Mock implementation
  }

  getData(_format: string): string {
    return '';
  }

  setData(_format: string, _data: string): void {
    // Mock implementation
  }

  setDragImage(_image: Element, _x: number, _y: number): void {
    // Mock implementation
  }
}

// Add to global scope
globalThis.DragEvent = MockDragEvent as any;
globalThis.DataTransfer = MockDataTransfer as any;
