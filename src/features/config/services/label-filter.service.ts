export interface FilterState {
  newFilter: string;
  showResults: boolean;
  searchTimeout: ReturnType<typeof setTimeout> | null;
  filteredOptions: string[];
}

export class LabelFilterService {
  private static instance: LabelFilterService;

  private constructor() {}

  static getInstance(): LabelFilterService {
    if (!LabelFilterService.instance) {
      LabelFilterService.instance = new LabelFilterService();
    }
    return LabelFilterService.instance;
  }

  createInitialState(): FilterState {
    return {
      newFilter: '',
      showResults: false,
      searchTimeout: null,
      filteredOptions: [],
    };
  }

  filterOptions(
    newFilter: string,
    availableOptions: string[],
    onStateUpdate: (updates: Partial<FilterState>) => void,
    delay: number = 300
  ): ReturnType<typeof setTimeout> {
    if (newFilter.trim()) {
      const filtered = availableOptions.filter((option) =>
        option.toLowerCase().includes(newFilter.toLowerCase())
      );
      onStateUpdate({
        filteredOptions: filtered,
        showResults: true,
      });
    } else {
      onStateUpdate({
        filteredOptions: [],
        showResults: false,
      });
    }

    return setTimeout(() => {}, delay); // Placeholder for debouncing if needed
  }

  addFilter(
    newFilter: string,
    currentFilters: string[]
  ): { filters: string[]; newFilter: string } {
    if (!newFilter.trim()) {
      return { filters: currentFilters, newFilter: '' };
    }

    const filter = newFilter.trim();
    if (!currentFilters.includes(filter)) {
      return {
        filters: [...currentFilters, filter],
        newFilter: '',
      };
    }

    return { filters: currentFilters, newFilter: '' };
  }

  removeFilter(filter: string, currentFilters: string[]): string[] {
    return currentFilters.filter((f) => f !== filter);
  }

  selectOption(option: string): string {
    return option;
  }

  getDisplayName(option: string, title: string): string {
    if (title.toLowerCase() === 'workflow') {
      return option.replace(/\.(ya?ml)$/, '');
    }
    return option;
  }

  handleInputKeydown(
    event: KeyboardEvent,
    filteredOptions: string[],
    onAddFilter: () => void,
    onCloseResults: () => void,
    onFocusFirstResult: () => void
  ): void {
    if (event.key === 'Enter') {
      onAddFilter();
    } else if (event.key === 'Escape') {
      onCloseResults();
    } else if (event.key === 'ArrowDown' && filteredOptions.length > 0) {
      onFocusFirstResult();
    }
  }

  handleOptionKeydown(
    event: KeyboardEvent,
    option: string,
    index: number,
    onSelectOption: (option: string) => void,
    onCloseResults: () => void,
    onFocusInput: () => void,
    onFocusNextResult: (index: number) => void,
    onFocusPrevResult: (index: number) => void
  ): void {
    if (event.key === 'Enter') {
      onSelectOption(option);
    } else if (event.key === 'Escape') {
      onCloseResults();
      onFocusInput();
    } else if (event.key === 'ArrowDown') {
      onFocusNextResult(index);
    } else if (event.key === 'ArrowUp') {
      if (index === 0) {
        onFocusInput();
      } else {
        onFocusPrevResult(index);
      }
    }
  }

  clearSearchTimeout(timeout: ReturnType<typeof setTimeout> | null): void {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  shouldShowResults(newFilter: string, availableOptions: string[]): boolean {
    return newFilter.trim().length > 0 && availableOptions.length > 0;
  }

  isWorkflowFilter(title: string): boolean {
    return title.toLowerCase() === 'workflow';
  }

  isWorkflowRequired(title: string): boolean {
    return this.isWorkflowFilter(title);
  }
}

export const labelFilterService = LabelFilterService.getInstance();
