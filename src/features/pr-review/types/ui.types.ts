// UI-specific types and interfaces

export interface ButtonVariant {
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface FormFieldState {
  value: string;
  error?: string;
  touched: boolean;
  required?: boolean;
}

export interface FormState {
  fields: Record<string, FormFieldState>;
  isValid: boolean;
  isSubmitting: boolean;
  errors: string[];
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Diff view specific types
export interface DiffLineProps {
  lineNumber?: number;
  content: string;
  type: 'addition' | 'deletion' | 'context';
  side: 'left' | 'right';
  isSelected?: boolean;
  onLineClick?: (lineNumber: number, side: 'left' | 'right', content: string) => void;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  changes: number;
}

// Loading states for different operations
export interface LoadingStates {
  prData: boolean;
  files: boolean;
  commits: boolean;
  reviews: boolean;
  checks: boolean;
  submittingComment: boolean;
  submittingReview: boolean;
}