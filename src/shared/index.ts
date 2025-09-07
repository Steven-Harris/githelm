// Shared Utilities Exports

// Authentication
export { authService } from './auth/auth.service';
export { authContext, authState, hasError, isAuthenticated, isLoading } from './auth/auth.state';

// Error Handling
export { errorService } from './error/error.service';

// Logging
export { loggerService } from './logging/logger.service';

// Storage
export { clearSiteData, getStorageObject, setStorageObject } from './storage/storage';

// Commands
export { commandExecutor } from './commands/repository.commands';

// Filter Service
export { filterService } from './filter/filter.service';

// Navigation
export { breadcrumbService } from './navigation/breadcrumb.service';
export type { BreadcrumbItem } from './navigation/breadcrumb.service';

// Syntax Highlighting
export { detectLanguage, getFileTypeIcon, highlightCode } from './utils/syntax-highlighter';

// UI Components
export { default as Breadcrumb } from './navigation/Breadcrumb.svelte';
export { default as CountBadge } from './ui/CountBadge.svelte';
export { default as Loading } from './ui/Loading.svelte';
export { default as RateLimitModal } from './ui/RateLimitModal.svelte';
export { default as ReloadPrompt } from './ui/ReloadPrompt.svelte';

