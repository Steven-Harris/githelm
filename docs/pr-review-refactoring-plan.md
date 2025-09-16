# PR Review Feature Refactoring Plan

## Current Issues

### 1. **Component Complexity**
- `PullRequestReview.svelte` - 600+ lines, handles too many concerns
- `CommentsSidebar.svelte` - Multiple forms, complex state management
- `FileDiff.svelte` - Diff rendering + line selection + commenting logic
- Mixed presentation and business logic

### 2. **State Management Problems**
- `pr-review.store.svelte.ts` - Monolithic store with 20+ methods
- State scattered across components
- Complex prop drilling
- Tight coupling between UI and business logic

### 3. **Code Duplication**
- Form handling patterns repeated
- API call patterns duplicated
- Similar event handling across components

### 4. **Testing & Maintainability**
- Hard to test individual pieces
- Difficult to reason about data flow
- Components doing too many things

## Refactoring Strategy: Svelte 5 Best Practices

### Phase 1: Extract Business Logic (Composables & Services)

#### 1.1 Create Composables (`/composables/`)
```typescript
// useReviewActions.svelte.ts - Handle all review actions
// useLineSelection.svelte.ts - Line selection logic
// useCommentForms.svelte.ts - Form state management
// usePRData.svelte.ts - Data fetching and caching
// useOptimisticUpdates.svelte.ts - Optimistic UI updates
```

#### 1.2 Specialized Services (`/services/`)
```typescript
// review-actions.service.ts - Review submission logic
// diff-parser.service.ts - Diff parsing and processing
// comment-manager.service.ts - Comment CRUD operations
// pr-data.service.ts - PR data fetching and caching
```

#### 1.3 Domain Stores (`/stores/`)
```typescript
// pr-data.store.svelte.ts - PR, files, commits, checks
// review-state.store.svelte.ts - Reviews, comments, approvals
// ui-state.store.svelte.ts - Tabs, selections, preferences
// comment-forms.store.svelte.ts - Form states and validation
```

### Phase 2: Component Decomposition

#### 2.1 Break Down Large Components

**PullRequestReview.svelte** → Multiple focused components:
```
PullRequestReview.svelte (orchestrator - 100 lines)
├── PRHeader.svelte (title, status, metadata)
├── PRTabs.svelte (navigation between views)
├── PRContent.svelte (main content area)
│   ├── OverviewTab.svelte
│   ├── FilesTab.svelte
│   ├── CommitsTab.svelte
│   └── ChecksTab.svelte
└── PRSidebars.svelte (file tree + comments)
```

**CommentsSidebar.svelte** → Focused components:
```
CommentsSidebar.svelte (container - 50 lines)
├── ReviewActions.svelte (action buttons + forms)
├── PendingComments.svelte (line-based comments)
├── ReviewList.svelte (approvals/reviews)
└── CommentsList.svelte (general comments)
```

**FileDiff.svelte** → Separated concerns:
```
FileDiff.svelte (orchestrator - 100 lines)
├── DiffHeader.svelte (file info, expand/collapse)
├── DiffContent.svelte (actual diff rendering)
│   ├── DiffLine.svelte (individual line)
│   └── DiffLineNumbers.svelte (line numbers + selection)
└── DiffComments.svelte (inline comment indicators)
```

#### 2.2 Reusable UI Components (`/ui/`)
```typescript
// Button.svelte - Consistent button styles
// Modal.svelte - Modal wrapper
// Form.svelte - Form handling
// TextArea.svelte - Enhanced textarea
// LoadingSpinner.svelte - Loading states
// ErrorBoundary.svelte - Error handling
```

### Phase 3: State Management Refactor

#### 3.1 Composable-Based State Management
```typescript
// Instead of large store, use focused composables
function usePRReview(owner: string, repo: string, prNumber: number) {
  const prData = usePRData(owner, repo, prNumber);
  const reviewActions = useReviewActions(owner, repo, prNumber);
  const lineSelection = useLineSelection();
  const commentForms = useCommentForms();
  
  return {
    ...prData,
    ...reviewActions,
    ...lineSelection,
    ...commentForms
  };
}
```

#### 3.2 Event-Driven Architecture
```typescript
// Use custom events instead of prop drilling
dispatch('line:selected', { filename, lineNumber, side });
dispatch('comment:submitted', { commentId, type });
dispatch('review:approved', { reviewId });
```

#### 3.3 Context-Based State Sharing
```typescript
// PRReviewContext.svelte.ts - Share state across components
const PRReviewContext = createContext<PRReviewState>();
```

### Phase 4: Performance & Developer Experience

#### 4.1 Performance Optimizations
- Lazy load diff content
- Virtual scrolling for large files
- Debounced search and filtering
- Memoized computed values with `$derived`

#### 4.2 Type Safety Improvements
```typescript
// Strict typing for all events and state
interface LineSelectedEvent {
  filename: string;
  lineNumber: number;
  side: 'left' | 'right';
  content: string;
}

// Type-safe event dispatching
dispatch<LineSelectedEvent>('line:selected', eventData);
```

#### 4.3 Error Handling & Loading States
```typescript
// Consistent error and loading patterns
const { data, loading, error } = usePRData(owner, repo, prNumber);
```

## Implementation Plan

### Step 1: Create Foundation (Week 1)
1. Set up new directory structure
2. Create base composables and services
3. Extract core types and interfaces
4. Set up testing framework

### Step 2: Extract Business Logic (Week 2)
1. Create `usePRData` composable
2. Create `useReviewActions` composable
3. Create `useLineSelection` composable
4. Create `useCommentForms` composable

### Step 3: Component Decomposition (Week 3)
1. Break down `PullRequestReview.svelte`
2. Decompose `CommentsSidebar.svelte`
3. Refactor `FileDiff.svelte`
4. Create reusable UI components

### Step 4: Integration & Testing (Week 4)
1. Wire up new components
2. Add comprehensive tests
3. Performance testing and optimization
4. Documentation and cleanup

## Directory Structure After Refactoring

```
src/features/pr-review/
├── PullRequestReview.svelte              # Main orchestrator (100 lines)
├── types/                                # Type definitions
│   ├── pr-review.types.ts
│   ├── events.types.ts
│   └── ui.types.ts
├── composables/                          # Business logic hooks
│   ├── usePRData.svelte.ts
│   ├── useReviewActions.svelte.ts
│   ├── useLineSelection.svelte.ts
│   ├── useCommentForms.svelte.ts
│   └── useOptimisticUpdates.svelte.ts
├── components/                           # Feature components
│   ├── header/
│   │   ├── PRHeader.svelte
│   │   └── PRTabs.svelte
│   ├── content/
│   │   ├── OverviewTab.svelte
│   │   ├── FilesTab.svelte
│   │   ├── CommitsTab.svelte
│   │   └── ChecksTab.svelte
│   ├── diff/
│   │   ├── FileDiff.svelte
│   │   ├── DiffHeader.svelte
│   │   ├── DiffContent.svelte
│   │   ├── DiffLine.svelte
│   │   └── DiffLineNumbers.svelte
│   ├── comments/
│   │   ├── CommentsSidebar.svelte
│   │   ├── ReviewActions.svelte
│   │   ├── PendingComments.svelte
│   │   ├── ReviewList.svelte
│   │   └── CommentsList.svelte
│   └── sidebars/
│       ├── FileTreeSidebar.svelte
│       └── PRSidebars.svelte
├── ui/                                   # Reusable UI components
│   ├── Button.svelte
│   ├── Modal.svelte
│   ├── Form.svelte
│   ├── TextArea.svelte
│   ├── LoadingSpinner.svelte
│   └── ErrorBoundary.svelte
├── services/                             # Business logic services
│   ├── pr-data.service.ts
│   ├── review-actions.service.ts
│   ├── diff-parser.service.ts
│   └── comment-manager.service.ts
├── stores/                               # Domain-specific stores
│   ├── pr-data.store.svelte.ts
│   ├── review-state.store.svelte.ts
│   ├── ui-state.store.svelte.ts
│   └── comment-forms.store.svelte.ts
├── utils/                                # Utility functions
│   ├── diff-parser.ts
│   ├── syntax-highlighter.ts
│   └── file-type-detector.ts
└── __tests__/                            # Tests
    ├── composables/
    ├── components/
    ├── services/
    └── integration/
```

## Benefits of This Refactoring

### 1. **Maintainability**
- Single responsibility principle
- Clear separation of concerns
- Easy to reason about individual pieces

### 2. **Testability**
- Composables can be tested in isolation
- Services have clear interfaces
- Components are focused and mockable

### 3. **Reusability**
- Composables can be reused across features
- UI components are generic
- Services can be shared

### 4. **Performance**
- Better tree-shaking
- Lazy loading opportunities
- Optimized re-renders

### 5. **Developer Experience**
- Better TypeScript support
- Clear file organization
- Easier onboarding for new developers

### 6. **Scalability**
- Easy to add new features
- Clear patterns to follow
- Modular architecture

## Migration Strategy

### Option A: Big Bang (Risky)
- Refactor everything at once
- Potentially disruptive
- Hard to debug issues

### Option B: Gradual Migration (Recommended)
1. Create new architecture alongside existing
2. Migrate one composable/component at a time
3. Keep existing functionality working
4. Remove old code when new is stable

### Option C: Feature Flag Approach
- Use feature flags to toggle between old/new
- Allows for easy rollback
- Can test in production safely

## Next Steps

1. **Review and approve this plan**
2. **Choose migration strategy**
3. **Set up new directory structure**
4. **Start with extracting one composable** (e.g., `usePRData`)
5. **Create corresponding tests**
6. **Gradually migrate components**

This refactoring will significantly improve the codebase's maintainability, testability, and developer experience while following Svelte 5 best practices.