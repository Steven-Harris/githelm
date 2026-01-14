# Pull Request Review Implementation Plan

## Overview

This document outlines the comprehensive plan for implementing in-app pull request review functionality in GitHelm. The goal is to enable users to review pull requests directly within the application without redirecting to GitHub, providing a seamless and efficient code review experience.

## Related Plans

- Review workflow redesign: [docs/pr-review-review-workflow-plan.md](docs/pr-review-review-workflow-plan.md)

## Executive Summary

The implementation involves creating a new PR review interface that leverages GitHub's REST and GraphQL APIs to:

- Display PR file changes with syntax highlighting
- Support line-by-line commenting
- Enable multi-file review sessions
- Provide approval/rejection workflows
- Handle review thread management and resolution

## API Research Findings

### GitHub REST API Endpoints

#### Core Pull Request Management

- **List PRs**: `GET /repos/{owner}/{repo}/pulls`
- **Get specific PR**: `GET /repos/{owner}/{repo}/pulls/{pull_number}`
- **Update PR**: `PATCH /repos/{owner}/{repo}/pulls/{pull_number}`

#### Pull Request Files

- **List files**: `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`
  - Returns: filename, status, additions, deletions, changes, patch (diff content)
  - Supports pagination for large PRs
  - Essential for displaying file changes and diff content

#### Reviews Management

- **List reviews**: `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
- **Create review**: `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
- **Get specific review**: `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}`
- **Update review**: `PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}`
- **Delete review**: `DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}`
- **Submit review**: `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events`

#### Review Comments (Line-specific)

- **List comments**: `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments`
- **Create comment**: `POST /repos/{owner}/{repo}/pulls/{pull_number}/comments`
- **Get comment**: `GET /repos/{owner}/{repo}/pulls/comments/{comment_id}`
- **Update comment**: `PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}`
- **Delete comment**: `DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}`

#### Review States

- `APPROVED`: Review approves the changes
- `REQUEST_CHANGES`: Review requests changes before merging
- `COMMENT`: General feedback without explicit approval/rejection

### GitHub GraphQL API Schema

#### PullRequest Object

Key fields for review functionality:

- `files`: List of changed files with metadata
- `reviews`: All reviews associated with the PR
- `reviewThreads`: Threaded comment discussions
- `reviewDecision`: Overall review status (APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED)
- `viewerCanUpdate`: Permission to modify the PR
- `mergeable`: Whether PR can be merged

#### PullRequestReview Object

- `state`: Review state (APPROVED, CHANGES_REQUESTED, COMMENTED)
- `body`: Overall review comment
- `comments`: Line-specific comments
- `submittedAt`: When review was submitted
- `author`: Review author information

#### PullRequestReviewComment Object

- `body`: Comment text
- `path`: File path being commented on
- `line`: Line number (new file line numbers)
- `originalLine`: Original line number
- `diffHunk`: Surrounding diff context
- `outdated`: Whether comment is outdated due to new commits
- `position`: Diff position (deprecated)

#### PullRequestReviewThread Object

- `comments`: All comments in the thread
- `isResolved`: Thread resolution status
- `path`: File path
- `line`: Line number
- `viewerCanResolve`: Permission to resolve thread

### Authentication Requirements

- **Fine-grained personal access tokens** with "Pull requests" repository permissions
- Required scopes:
  - `pull_requests:read` - View PR content and reviews
  - `pull_requests:write` - Create and modify reviews
  - `contents:read` - Access file content for diff display

## Technical Architecture

### Data Layer

#### API Integration Strategy

1. **Hybrid Approach**: Use GraphQL for bulk data fetching and REST for specific operations
2. **GraphQL Queries**: Fetch PR overview, existing reviews, and file lists
3. **REST Endpoints**: Handle review creation, comment submission, and file content

#### Data Models

```typescript
interface PullRequestReview {
  id: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  body: string;
  submittedAt: string;
  author: GitHubUser;
  comments: PullRequestReviewComment[];
}

interface PullRequestReviewComment {
  id: string;
  body: string;
  path: string;
  line: number;
  originalLine?: number;
  diffHunk: string;
  createdAt: string;
  updatedAt: string;
  author: GitHubUser;
  outdated: boolean;
}

interface PullRequestFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch: string; // Diff content
  contents_url: string;
}

interface ReviewThread {
  id: string;
  path: string;
  line: number;
  comments: PullRequestReviewComment[];
  isResolved: boolean;
  resolvedBy?: GitHubUser;
}
```

#### State Management

```typescript
interface ReviewState {
  currentPR: PullRequest;
  files: PullRequestFile[];
  reviews: PullRequestReview[];
  threads: ReviewThread[];
  draftReview: DraftReview;
  activeFile: string;
  selectedLines: Set<number>;
  commentMode: 'single' | 'range';
}

interface DraftReview {
  body: string;
  comments: DraftComment[];
  state: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
}

interface DraftComment {
  path: string;
  line: number;
  body: string;
  side: 'LEFT' | 'RIGHT';
}
```

### UI Components Architecture

#### Component Hierarchy

```text
PRReviewPage
├── PRHeader (title, status, author, reviewers)
├── PRTabs (files, conversation, checks)
├── PRFileList (changed files overview)
├── PRDiffViewer
│   ├── FileHeader (filename, stats)
│   ├── DiffView (unified/split view)
│   ├── LineNumbers
│   ├── CommentThread (for each line)
│   └── AddCommentButton
├── PRReviewPanel
│   ├── ReviewForm (overall comment, state)
│   ├── DraftComments (pending comments)
│   └── SubmitReview
└── PRSidebar
    ├── ReviewSummary
    ├── Reviewers
    └── Labels/Assignees
```

#### Key Components

##### 1. PRDiffViewer Component

```typescript
interface PRDiffViewerProps {
  file: PullRequestFile;
  comments: PullRequestReviewComment[];
  onAddComment: (line: number, body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolveThread: (threadId: string) => void;
}
```

**Features**:

- Syntax highlighting for file content
- Side-by-side or unified diff view
- Expandable context lines
- Collapsible unchanged sections
- Comment indicators and threads
- Line selection for range comments

##### 2. CommentThread Component

```typescript
interface CommentThreadProps {
  thread: ReviewThread;
  onReply: (body: string) => void;
  onEdit: (commentId: string, body: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: () => void;
  canModerate: boolean;
}
```

**Features**:

- Threaded comment display
- Reply functionality
- Edit/delete permissions
- Resolve/unresolve actions
- Outdated comment indicators

##### 3. ReviewPanel Component

```typescript
interface ReviewPanelProps {
  draftReview: DraftReview;
  onUpdateBody: (body: string) => void;
  onUpdateState: (state: ReviewState) => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
}
```

**Features**:

- Review state selection (approve/request changes/comment)
- Overall review comment
- Draft comment management
- Submit review workflow

### Service Layer

#### PRReviewService

```typescript
class PRReviewService {
  // File management
  async getFiles(owner: string, repo: string, prNumber: number): Promise<PullRequestFile[]>
  async getFileContent(file: PullRequestFile): Promise<string>
  
  // Review management
  async getReviews(owner: string, repo: string, prNumber: number): Promise<PullRequestReview[]>
  async createReview(owner: string, repo: string, prNumber: number, review: DraftReview): Promise<PullRequestReview>
  async updateReview(owner: string, repo: string, prNumber: number, reviewId: string, updates: Partial<PullRequestReview>): Promise<PullRequestReview>
  async submitReview(owner: string, repo: string, prNumber: number, reviewId: string, state: ReviewState): Promise<PullRequestReview>
  
  // Comment management
  async createComment(owner: string, repo: string, prNumber: number, comment: DraftComment): Promise<PullRequestReviewComment>
  async updateComment(owner: string, repo: string, commentId: string, body: string): Promise<PullRequestReviewComment>
  async deleteComment(owner: string, repo: string, commentId: string): Promise<void>
  
  // Thread management
  async getThreads(owner: string, repo: string, prNumber: number): Promise<ReviewThread[]>
  async resolveThread(owner: string, repo: string, threadId: string): Promise<ReviewThread>
}
```

#### DiffParser Service

```typescript
class DiffParser {
  parsePatch(patch: string): DiffBlock[]
  getLineMapping(diffBlocks: DiffBlock[]): LineMapping
  getContextLines(patch: string, targetLine: number, context: number): string[]
}

interface DiffBlock {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldNumber?: number;
  newNumber?: number;
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Basic PR viewing and file navigation

**Tasks**:

1. Create PR review routing (`/pr/{owner}/{repo}/{number}`)
2. Implement basic PR data fetching
3. Build file list component
4. Create simple diff viewer without commenting
5. Add basic navigation between files

**Acceptance Criteria**:

- Users can navigate to PR review page
- PR metadata displays correctly
- File list shows all changed files
- Basic diff view renders properly
- Navigation between files works

### Phase 2: Comment Display (Week 3)

**Goal**: Show existing comments and reviews

**Tasks**:

1. Fetch and display existing reviews
2. Parse and display line comments
3. Implement comment threading
4. Add comment positioning in diff view
5. Handle outdated comments

**Acceptance Criteria**:

- All existing reviews display correctly
- Line comments appear at correct positions
- Comment threads expand/collapse properly
- Outdated comments are clearly marked

### Phase 3: Comment Creation (Week 4-5)

**Goal**: Enable adding new comments

**Tasks**:

1. Implement line selection for comments
2. Create comment composition UI
3. Add draft comment management
4. Implement comment persistence
5. Handle comment validation and errors

**Acceptance Criteria**:

- Users can click lines to add comments
- Comment composition interface is intuitive
- Draft comments persist across page refreshes
- Comments save successfully to GitHub
- Error handling provides clear feedback

### Phase 4: Review Workflow (Week 6-7)

**Goal**: Complete review submission process

**Tasks**:

1. Implement review state selection
2. Create overall review comment interface
3. Add review submission workflow
4. Implement draft review saving
5. Handle review updates and deletion

**Acceptance Criteria**:

- Users can select approval/rejection/comment states
- Overall review comments can be added
- Review submission works end-to-end
- Draft reviews can be saved and resumed
- Review updates reflect immediately

### Phase 5: Advanced Features (Week 8-9)

**Goal**: Enhanced review experience

**Tasks**:

1. Add thread resolution functionality
2. Implement suggested changes
3. Create keyboard shortcuts
4. Add review templates
5. Optimize performance for large PRs

**Acceptance Criteria**:

- Comment threads can be resolved/unresolve
- Suggested changes render properly
- Keyboard navigation is efficient
- Templates speed up common reviews
- Large PRs load and navigate smoothly

### Phase 6: Integration & Polish (Week 10)

**Goal**: Seamless GitHelm integration

**Tasks**:

1. Integrate with existing GitHelm navigation
2. Add review status to PR list view
3. Implement notifications for review changes
4. Add analytics tracking
5. Performance optimization and testing

**Acceptance Criteria**:

- Review interface integrates seamlessly with GitHelm
- PR list shows review status indicators
- Users receive appropriate notifications
- Performance meets acceptable standards
- All functionality is thoroughly tested

## Technical Challenges & Solutions

### Challenge 1: Large Pull Request Performance

**Problem**: PRs with many files and comments may load slowly

**Solutions**:

- Implement file virtualization for large PR file lists
- Lazy load file contents and comments on demand
- Use progressive enhancement for diff rendering
- Implement efficient caching strategies
- Add loading states and skeleton screens

### Challenge 2: Comment Positioning Accuracy

**Problem**: Mapping comments to correct line numbers after rebases

**Solutions**:

- Use GitHub's line and originalLine fields correctly
- Implement robust diff parsing and line mapping
- Handle outdated comments gracefully
- Provide visual indicators for comment context
- Fall back to diff hunk display when lines shift

### Challenge 3: Draft State Management

**Problem**: Managing uncommitted comments across browser sessions

**Solutions**:

- Use localStorage for draft persistence
- Implement auto-save functionality
- Provide clear draft indicators
- Handle conflicts between local drafts and server state
- Add draft recovery mechanisms

### Challenge 4: Real-time Updates

**Problem**: Showing updates when other reviewers add comments

**Solutions**:

- Implement polling for review updates
- Use optimistic updates for immediate feedback
- Handle conflict resolution for concurrent edits
- Add notifications for new activity
- Provide refresh mechanisms for stale data

### Challenge 5: Mobile Responsiveness

**Problem**: Code review on mobile devices

**Solutions**:

- Design mobile-first review interface
- Implement swipe gestures for file navigation
- Use collapsible sections for small screens
- Provide simplified mobile review workflows
- Test extensively on various device sizes

## Security Considerations

### Authentication & Authorization

- Validate GitHub token permissions before enabling review features
- Check repository access levels for review capabilities
- Implement proper error handling for permission denied scenarios
- Store tokens securely and handle refresh flows

### Data Validation

- Sanitize all user input for comments and review content
- Validate file paths and line numbers from API responses
- Implement rate limiting for API calls
- Handle malicious diff content safely

### Privacy & Compliance

- Respect repository visibility settings
- Handle private repository data appropriately
- Implement proper error logging without exposing sensitive data
- Ensure GDPR compliance for user data handling

## Performance Optimization

### API Efficiency

- Use GraphQL for bulk data fetching where possible
- Implement intelligent caching strategies
- Batch API requests to minimize round trips
- Use conditional requests with ETags

### UI Performance

- Implement virtual scrolling for large file lists
- Use code splitting for review-specific components
- Optimize syntax highlighting with web workers
- Implement progressive loading for file contents

### Memory Management

- Clean up event listeners and subscriptions
- Implement proper component unmounting
- Use efficient data structures for diff parsing
- Monitor and prevent memory leaks

## Testing Strategy

### Unit Testing

- Test all service layer functions with mocked GitHub API
- Test diff parsing logic with various patch formats
- Test comment positioning algorithms
- Test state management and data transformations

### Integration Testing

- Test complete review workflows end-to-end
- Test error handling and edge cases
- Test mobile responsiveness
- Test performance with large datasets

### User Acceptance Testing

- Test with real GitHub repositories and PRs
- Gather feedback from target users
- Test accessibility compliance
- Validate against GitHub's native review experience

## Success Metrics

### Functional Metrics

- Successful PR review completion rate
- Comment creation and submission success rate
- Review state change accuracy
- Error rate and user-reported issues

### Performance Metrics

- Page load time for PR review interface
- Time to first meaningful paint
- API response times and success rates
- Mobile performance benchmarks

### User Experience Metrics

- User adoption rate of in-app reviews
- User satisfaction scores
- Time spent in review interface vs. GitHub
- Feature usage analytics

## Future Enhancements

### Short-term Improvements

- Bulk comment operations
- Review request workflows
- Advanced diff viewing options
- Keyboard shortcuts and accessibility improvements

### Medium-term Features

- Suggested changes with apply functionality
- Review templates and automated checks
- Integration with external tools (linters, etc.)
- Collaborative review sessions

### Long-term Vision

- AI-powered review assistance
- Advanced analytics and reporting
- Custom review workflows
- Integration with project management tools

## Detailed Implementation Guide

### File Structure Organization

Based on GitHelm's existing architecture, the PR review feature should be organized as follows:

```text
src/features/pr-review/
├── components/
│   ├── diff/
│   │   ├── DiffViewer.svelte
│   │   ├── DiffLine.svelte
│   │   ├── DiffHeader.svelte
│   │   └── DiffSplitView.svelte
│   ├── comments/
│   │   ├── CommentThread.svelte
│   │   ├── CommentForm.svelte
│   │   ├── CommentReply.svelte
│   │   └── CommentBubble.svelte
│   ├── review/
│   │   ├── ReviewPanel.svelte
│   │   ├── ReviewSummary.svelte
│   │   └── ReviewStateSelector.svelte
│   └── navigation/
│       ├── FileTree.svelte
│       ├── FileNavigator.svelte
│       └── PRBreadcrumb.svelte
├── services/
│   ├── pr-review-api.ts
│   ├── diff-parser.ts
│   ├── comment-manager.ts
│   └── review-state.ts
├── stores/
│   ├── pr-review.store.ts
│   ├── draft-comments.store.ts
│   └── review-navigation.store.ts
├── types/
│   ├── pr-review.types.ts
│   └── github-api.types.ts
├── utils/
│   ├── diff-utils.ts
│   ├── line-mapper.ts
│   └── syntax-highlighter.ts
└── index.ts
```

### Core Implementation Examples

#### 1. PR Review Store Implementation

```typescript
// src/features/pr-review/stores/pr-review.store.ts
import { writable, derived, get } from 'svelte/store';
import type { PullRequest, PullRequestFile, PullRequestReview, DraftReview } from '../types/pr-review.types.js';
import { PRReviewAPI } from '../services/pr-review-api.js';

interface PRReviewState {
  pullRequest: PullRequest | null;
  files: PullRequestFile[];
  reviews: PullRequestReview[];
  currentFileIndex: number;
  loading: boolean;
  error: string | null;
  draftReview: DraftReview;
}

const initialState: PRReviewState = {
  pullRequest: null,
  files: [],
  reviews: [],
  currentFileIndex: 0,
  loading: false,
  error: null,
  draftReview: {
    body: '',
    comments: [],
    state: 'COMMENT'
  }
};

function createPRReviewStore() {
  const { subscribe, set, update } = writable<PRReviewState>(initialState);
  const api = new PRReviewAPI();

  return {
    subscribe,
    
    async loadPR(owner: string, repo: string, prNumber: number) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const [pullRequest, files, reviews] = await Promise.all([
          api.getPullRequest(owner, repo, prNumber),
          api.getFiles(owner, repo, prNumber),
          api.getReviews(owner, repo, prNumber)
        ]);
        
        update(state => ({
          ...state,
          pullRequest,
          files,
          reviews,
          loading: false
        }));
      } catch (error) {
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
      }
    },
    
    setCurrentFile(index: number) {
      update(state => ({ ...state, currentFileIndex: index }));
    },
    
    addDraftComment(path: string, line: number, body: string) {
      update(state => ({
        ...state,
        draftReview: {
          ...state.draftReview,
          comments: [
            ...state.draftReview.comments,
            { path, line, body, side: 'RIGHT' }
          ]
        }
      }));
    },
    
    async submitReview() {
      const state = get({ subscribe });
      if (!state.pullRequest) return;
      
      try {
        const review = await api.createReview(
          state.pullRequest.base.repo.owner.login,
          state.pullRequest.base.repo.name,
          state.pullRequest.number,
          state.draftReview
        );
        
        update(currentState => ({
          ...currentState,
          reviews: [...currentState.reviews, review],
          draftReview: initialState.draftReview
        }));
      } catch (error) {
        update(currentState => ({
          ...currentState,
          error: error.message
        }));
      }
    }
  };
}

export const prReviewStore = createPRReviewStore();

// Derived stores for computed values
export const currentFile = derived(
  prReviewStore,
  $store => $store.files[$store.currentFileIndex]
);

export const hasChanges = derived(
  prReviewStore,
  $store => $store.draftReview.body.length > 0 || $store.draftReview.comments.length > 0
);
```

#### 2. Diff Parser Service

```typescript
// src/features/pr-review/services/diff-parser.ts
export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldNumber?: number;
  newNumber?: number;
  position: number;
}

export interface DiffBlock {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export class DiffParser {
  static parsePatch(patch: string): DiffBlock[] {
    const lines = patch.split('\n');
    const blocks: DiffBlock[] = [];
    let currentBlock: DiffBlock | null = null;
    let position = 0;
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (const line of lines) {
      position++;

      // Parse hunk header (@@)
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
      if (hunkMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }

        const [, oldStart, oldCount = '1', newStart, newCount = '1', header] = hunkMatch;
        oldLineNumber = parseInt(oldStart);
        newLineNumber = parseInt(newStart);

        currentBlock = {
          header: header.trim(),
          oldStart: parseInt(oldStart),
          oldLines: parseInt(oldCount),
          newStart: parseInt(newStart),
          newLines: parseInt(newCount),
          lines: []
        };
        continue;
      }

      if (!currentBlock) continue;

      // Parse diff lines
      const diffLine: DiffLine = {
        type: this.getLineType(line),
        content: line.slice(1), // Remove +, -, or space prefix
        position
      };

      switch (line[0]) {
        case '+':
          diffLine.newNumber = newLineNumber++;
          break;
        case '-':
          diffLine.oldNumber = oldLineNumber++;
          break;
        case ' ':
          diffLine.oldNumber = oldLineNumber++;
          diffLine.newNumber = newLineNumber++;
          break;
        case '\\':
          diffLine.type = 'context';
          break;
      }

      currentBlock.lines.push(diffLine);
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  private static getLineType(line: string): DiffLine['type'] {
    switch (line[0]) {
      case '+': return 'add';
      case '-': return 'remove';
      case '@': return 'header';
      default: return 'context';
    }
  }

  static getLinePosition(blocks: DiffBlock[], lineNumber: number, side: 'left' | 'right'): number | null {
    for (const block of blocks) {
      for (const line of block.lines) {
        const targetLineNumber = side === 'left' ? line.oldNumber : line.newNumber;
        if (targetLineNumber === lineNumber) {
          return line.position;
        }
      }
    }
    return null;
  }
}
```

#### 3. Comment Thread Component

```svelte
<!-- src/features/pr-review/components/comments/CommentThread.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ReviewThread, PullRequestReviewComment } from '../../types/pr-review.types.js';
  
  export let thread: ReviewThread;
  export let canModerate: boolean = false;
  
  const dispatch = createEventDispatcher<{
    reply: { body: string };
    edit: { commentId: string; body: string };
    delete: { commentId: string };
    resolve: void;
  }>();
  
  let replyBody = '';
  let showReplyForm = false;
  let editingCommentId: string | null = null;
  let editBody = '';
  
  function handleReply() {
    if (replyBody.trim()) {
      dispatch('reply', { body: replyBody });
      replyBody = '';
      showReplyForm = false;
    }
  }
  
  function startEdit(comment: PullRequestReviewComment) {
    editingCommentId = comment.id;
    editBody = comment.body;
  }
  
  function handleEdit() {
    if (editingCommentId && editBody.trim()) {
      dispatch('edit', { commentId: editingCommentId, body: editBody });
      editingCommentId = null;
      editBody = '';
    }
  }
  
  function handleDelete(commentId: string) {
    if (confirm('Are you sure you want to delete this comment?')) {
      dispatch('delete', { commentId });
    }
  }
</script>

<div class="comment-thread" class:resolved={thread.isResolved}>
  <div class="thread-header">
    <div class="thread-info">
      <span class="file-path">{thread.path}</span>
      <span class="line-number">Line {thread.line}</span>
    </div>
    
    {#if canModerate}
      <button 
        class="resolve-button"
        class:resolved={thread.isResolved}
        on:click={() => dispatch('resolve')}
      >
        {thread.isResolved ? 'Unresolve' : 'Resolve'}
      </button>
    {/if}
  </div>
  
  <div class="comments">
    {#each thread.comments as comment (comment.id)}
      <div class="comment" class:outdated={comment.outdated}>
        <div class="comment-header">
          <img src={comment.author.avatar_url} alt={comment.author.login} class="avatar" />
          <span class="author">{comment.author.login}</span>
          <time class="timestamp">{new Date(comment.createdAt).toLocaleString()}</time>
          
          {#if comment.outdated}
            <span class="outdated-badge">Outdated</span>
          {/if}
        </div>
        
        <div class="comment-body">
          {#if editingCommentId === comment.id}
            <div class="edit-form">
              <textarea 
                bind:value={editBody}
                placeholder="Edit comment..."
                rows="3"
              ></textarea>
              <div class="edit-actions">
                <button class="save-button" on:click={handleEdit}>Save</button>
                <button class="cancel-button" on:click={() => editingCommentId = null}>Cancel</button>
              </div>
            </div>
          {:else}
            <div class="comment-content">
              {@html comment.body}
            </div>
            
            {#if canModerate}
              <div class="comment-actions">
                <button class="edit-action" on:click={() => startEdit(comment)}>Edit</button>
                <button class="delete-action" on:click={() => handleDelete(comment.id)}>Delete</button>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  </div>
  
  {#if showReplyForm}
    <div class="reply-form">
      <textarea 
        bind:value={replyBody}
        placeholder="Reply to this thread..."
        rows="3"
      ></textarea>
      <div class="reply-actions">
        <button class="reply-button" on:click={handleReply}>Reply</button>
        <button class="cancel-button" on:click={() => showReplyForm = false}>Cancel</button>
      </div>
    </div>
  {:else}
    <button class="show-reply-button" on:click={() => showReplyForm = true}>
      Reply
    </button>
  {/if}
</div>

<style>
  .comment-thread {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin: 8px 0;
    background: var(--background-color);
  }
  
  .comment-thread.resolved {
    opacity: 0.7;
    border-color: var(--success-color);
  }
  
  .thread-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--header-background);
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid var(--border-color);
  }
  
  .thread-info {
    display: flex;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .file-path {
    font-family: monospace;
    font-weight: 500;
  }
  
  .resolve-button {
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.75rem;
  }
  
  .resolve-button.resolved {
    background: var(--success-color);
    color: white;
    border-color: var(--success-color);
  }
  
  .comment {
    padding: 12px;
    border-bottom: 1px solid var(--border-light);
  }
  
  .comment:last-child {
    border-bottom: none;
  }
  
  .comment.outdated {
    background: var(--warning-background);
  }
  
  .comment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }
  
  .author {
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .timestamp {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  
  .outdated-badge {
    background: var(--warning-color);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 500;
  }
  
  .comment-content {
    line-height: 1.5;
    color: var(--text-primary);
  }
  
  .comment-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
  
  .edit-action, .delete-action {
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 4px;
  }
  
  .edit-action:hover, .delete-action:hover {
    color: var(--text-primary);
  }
  
  .edit-form textarea, .reply-form textarea {
    width: 100%;
    min-height: 80px;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
  }
  
  .edit-actions, .reply-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
  
  .save-button, .reply-button {
    padding: 6px 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .cancel-button {
    padding: 6px 12px;
    background: var(--secondary-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .show-reply-button {
    width: 100%;
    padding: 8px;
    background: var(--background-light);
    border: none;
    border-top: 1px solid var(--border-light);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .show-reply-button:hover {
    background: var(--background-hover);
    color: var(--text-primary);
  }
</style>
```

### Integration with Existing GitHelm Architecture

#### 1. Routing Integration

Update `src/routes/pr/[owner]/[repo]/[number]/+page.svelte`:

```svelte
<!-- src/routes/pr/[owner]/[repo]/[number]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { prReviewStore } from '$features/pr-review/stores/pr-review.store.js';
  import PullRequestReview from '$features/pr-review/PullRequestReview.svelte';
  
  $: owner = $page.params.owner;
  $: repo = $page.params.repo;
  $: prNumber = parseInt($page.params.number);
  
  onMount(() => {
    prReviewStore.loadPR(owner, repo, prNumber);
  });
</script>

<svelte:head>
  <title>PR #{prNumber} • {owner}/{repo} • GitHelm</title>
</svelte:head>

<PullRequestReview />
```

#### 2. Navigation Integration

Update `src/features/pull-requests/List.svelte` to add review links:

```svelte
<!-- Enhanced PR list item with review link -->
<div class="pr-item">
  <!-- Existing PR content -->
  
  <div class="pr-actions">
    <a href="/pr/{pr.base.repo.owner.login}/{pr.base.repo.name}/{pr.number}" 
       class="review-link">
      Review
    </a>
    <a href={pr.html_url} target="_blank" class="github-link">
      View on GitHub
    </a>
  </div>
</div>
```

### Performance Optimizations

#### 1. Virtual Scrolling for Large Diffs

```typescript
// src/features/pr-review/utils/virtual-scroller.ts
export class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleItems: number;
  private scrollTop = 0;
  
  constructor(container: HTMLElement, itemHeight: number) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2; // Buffer
    
    container.addEventListener('scroll', this.handleScroll.bind(this));
  }
  
  getVisibleRange(totalItems: number): { start: number; end: number } {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + this.visibleItems, totalItems);
    
    return { start: Math.max(0, start), end };
  }
  
  private handleScroll() {
    this.scrollTop = this.container.scrollTop;
  }
}
```

#### 2. Intelligent File Loading

```typescript
// src/features/pr-review/services/file-loader.ts
export class FileLoader {
  private loadedFiles = new Map<string, PullRequestFile>();
  private loadingFiles = new Set<string>();
  
  async loadFile(owner: string, repo: string, prNumber: number, filename: string): Promise<PullRequestFile> {
    const key = `${owner}/${repo}/${prNumber}/${filename}`;
    
    if (this.loadedFiles.has(key)) {
      return this.loadedFiles.get(key)!;
    }
    
    if (this.loadingFiles.has(key)) {
      // Wait for existing request
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (this.loadedFiles.has(key)) {
            resolve(this.loadedFiles.get(key)!);
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });
    }
    
    this.loadingFiles.add(key);
    
    try {
      const file = await this.fetchFile(owner, repo, prNumber, filename);
      this.loadedFiles.set(key, file);
      return file;
    } finally {
      this.loadingFiles.delete(key);
    }
  }
  
  preloadAdjacentFiles(currentIndex: number, files: string[], owner: string, repo: string, prNumber: number) {
    // Preload next and previous files
    const toPreload = [
      files[currentIndex - 1],
      files[currentIndex + 1]
    ].filter(Boolean);
    
    toPreload.forEach(filename => {
      this.loadFile(owner, repo, prNumber, filename).catch(() => {
        // Ignore preload failures
      });
    });
  }
}
```

### Error Handling & User Experience

#### 1. Error Boundary Component

```svelte
<!-- src/features/pr-review/components/ErrorBoundary.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let error: Error | null = null;
  export let context: string = 'PR Review';
  
  const dispatch = createEventDispatcher<{ retry: void }>();
  
  function handleRetry() {
    error = null;
    dispatch('retry');
  }
</script>

{#if error}
  <div class="error-boundary">
    <div class="error-content">
      <h3>Something went wrong</h3>
      <p>An error occurred while loading {context.toLowerCase()}.</p>
      
      <details class="error-details">
        <summary>Error Details</summary>
        <pre>{error.message}</pre>
      </details>
      
      <div class="error-actions">
        <button class="retry-button" on:click={handleRetry}>
          Try Again
        </button>
        <button class="report-button" on:click={() => window.open('https://github.com/Steven-Harris/githelm/issues/new')}>
          Report Issue
        </button>
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    padding: 2rem;
  }
  
  .error-content {
    text-align: center;
    max-width: 500px;
  }
  
  .error-content h3 {
    color: var(--error-color);
    margin-bottom: 1rem;
  }
  
  .error-details {
    margin: 1rem 0;
    text-align: left;
  }
  
  .error-details pre {
    background: var(--code-background);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.875rem;
  }
  
  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }
  
  .retry-button {
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .report-button {
    padding: 0.5rem 1rem;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
```

### Analytics and Monitoring

#### 1. Review Analytics Service

```typescript
// src/features/pr-review/services/analytics.ts
interface ReviewEvent {
  action: 'view_pr' | 'add_comment' | 'submit_review' | 'resolve_thread';
  pr_id: string;
  file_count?: number;
  comment_count?: number;
  review_state?: string;
  time_spent?: number;
}

export class ReviewAnalytics {
  private startTime: number = Date.now();
  private events: ReviewEvent[] = [];
  
  trackPRView(prId: string, fileCount: number) {
    this.track({
      action: 'view_pr',
      pr_id: prId,
      file_count: fileCount
    });
  }
  
  trackCommentAdd(prId: string) {
    this.track({
      action: 'add_comment',
      pr_id: prId
    });
  }
  
  trackReviewSubmit(prId: string, state: string, commentCount: number) {
    this.track({
      action: 'submit_review',
      pr_id: prId,
      review_state: state,
      comment_count: commentCount,
      time_spent: Date.now() - this.startTime
    });
  }
  
  private track(event: ReviewEvent) {
    this.events.push({
      ...event,
      timestamp: Date.now()
    });
    
    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    this.sendToAnalytics(event);
  }
  
  private async sendToAnalytics(event: ReviewEvent) {
    // Implementation depends on chosen analytics platform
    console.log('Analytics Event:', event);
  }
}
```

### Accessibility Considerations

#### 1. Keyboard Navigation

```typescript
// src/features/pr-review/utils/keyboard-navigation.ts
export class KeyboardNavigation {
  private currentFileIndex = 0;
  private currentLineIndex = 0;
  private maxFiles: number;
  private maxLines: number;
  
  constructor(private onNavigate: (fileIndex: number, lineIndex?: number) => void) {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }
  
  private handleKeydown(event: KeyboardEvent) {
    // Only handle if focus is on review interface
    if (!this.isReviewFocused()) return;
    
    switch (event.key) {
      case 'j':
        this.navigateToNextFile();
        event.preventDefault();
        break;
      case 'k':
        this.navigateToPreviousFile();
        event.preventDefault();
        break;
      case 'n':
        this.navigateToNextComment();
        event.preventDefault();
        break;
      case 'p':
        this.navigateToPreviousComment();
        event.preventDefault();
        break;
      case 'c':
        this.startComment();
        event.preventDefault();
        break;
      case 'Enter':
        if (event.ctrlKey || event.metaKey) {
          this.submitReview();
          event.preventDefault();
        }
        break;
    }
  }
  
  private isReviewFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement?.closest('.pr-review-container') !== null;
  }
  
  // Additional navigation methods...
}
```

#### 2. Screen Reader Support

```svelte
<!-- Enhanced accessibility in diff viewer -->
<div class="diff-line" 
     role="button"
     tabindex="0"
     aria-label="Line {line.newNumber || line.oldNumber}: {line.content}"
     aria-describedby="line-{line.position}-description"
     on:click={handleLineClick}
     on:keydown={handleLineKeydown}>
  
  <span class="line-number" aria-hidden="true">
    {line.newNumber || line.oldNumber}
  </span>
  
  <span class="line-content">
    {line.content}
  </span>
  
  <div id="line-{line.position}-description" class="sr-only">
    {line.type === 'add' ? 'Added line' : line.type === 'remove' ? 'Removed line' : 'Unchanged line'}
    {#if hasComments}
      , {commentCount} comments
    {/if}
  </div>
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

### Testing Strategy Implementation

#### 1. Unit Test Examples

```typescript
// tests/features/pr-review/services/diff-parser.test.ts
import { describe, it, expect } from 'vitest';
import { DiffParser } from '$features/pr-review/services/diff-parser.js';

describe('DiffParser', () => {
  const samplePatch = `@@ -1,4 +1,6 @@
 function hello() {
-  console.log("Hello");
+  console.log("Hello World");
+  console.log("Added line");
 }
 
 function goodbye() {`;

  it('should parse patch correctly', () => {
    const blocks = DiffParser.parsePatch(samplePatch);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].oldStart).toBe(1);
    expect(blocks[0].newStart).toBe(1);
    expect(blocks[0].lines).toHaveLength(6);
  });
  
  it('should identify line types correctly', () => {
    const blocks = DiffParser.parsePatch(samplePatch);
    const lines = blocks[0].lines;
    
    expect(lines[0].type).toBe('context');
    expect(lines[1].type).toBe('remove');
    expect(lines[2].type).toBe('add');
    expect(lines[3].type).toBe('add');
  });
  
  it('should assign line numbers correctly', () => {
    const blocks = DiffParser.parsePatch(samplePatch);
    const lines = blocks[0].lines;
    
    expect(lines[0].oldNumber).toBe(1);
    expect(lines[0].newNumber).toBe(1);
    expect(lines[1].oldNumber).toBe(2);
    expect(lines[1].newNumber).toBeUndefined();
    expect(lines[2].oldNumber).toBeUndefined();
    expect(lines[2].newNumber).toBe(2);
  });
});
```

#### 2. Integration Test Example

```typescript
// tests/features/pr-review/pr-review.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PullRequestReview from '$features/pr-review/PullRequestReview.svelte';
import { prReviewStore } from '$features/pr-review/stores/pr-review.store.js';

// Mock GitHub API responses
vi.mock('$integrations/github/api-client', () => ({
  GitHubAPIClient: vi.fn(() => ({
    getPullRequest: vi.fn().mockResolvedValue(mockPR),
    getFiles: vi.fn().mockResolvedValue(mockFiles),
    getReviews: vi.fn().mockResolvedValue(mockReviews)
  }))
}));

describe('PR Review Integration', () => {
  beforeEach(() => {
    prReviewStore.reset();
  });
  
  it('should load and display PR data', async () => {
    render(PullRequestReview, {
      props: {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: 123
      }
    });
    
    // Should show loading state initially
    expect(screen.getByText('Loading pull request...')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test PR Title')).toBeInTheDocument();
    });
    
    // Should display file list
    expect(screen.getByText('src/test.ts')).toBeInTheDocument();
    expect(screen.getByText('src/another.ts')).toBeInTheDocument();
  });
  
  it('should allow adding comments to lines', async () => {
    render(PullRequestReview, {
      props: {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: 123
      }
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test PR Title')).toBeInTheDocument();
    });
    
    // Click on a line to add comment
    const diffLine = screen.getByText('console.log("Hello");');
    fireEvent.click(diffLine);
    
    // Should show comment form
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });
    
    // Add comment text
    const commentInput = screen.getByPlaceholderText('Add a comment...');
    fireEvent.input(commentInput, { target: { value: 'This needs improvement' } });
    
    // Submit comment
    const submitButton = screen.getByText('Add Comment');
    fireEvent.click(submitButton);
    
    // Should show draft comment
    await waitFor(() => {
      expect(screen.getByText('This needs improvement')).toBeInTheDocument();
    });
  });
});
```

## Conclusion

This comprehensive implementation plan provides a detailed roadmap for building robust in-app pull request review functionality in GitHelm. The phased approach ensures steady progress while maintaining code quality and user experience standards. The technical architecture leverages GitHub's comprehensive APIs effectively while providing a user-friendly interface that integrates seamlessly with GitHelm's existing functionality.

The plan addresses key technical challenges proactively and establishes clear success metrics to measure the implementation's effectiveness. The detailed code examples, component structure, and integration patterns provide concrete guidance for implementation while maintaining consistency with GitHelm's existing architecture.

Key benefits of this implementation include:

- **Seamless Integration**: Builds upon GitHelm's existing Svelte 5 architecture and design patterns
- **Performance Optimized**: Includes virtual scrolling, intelligent caching, and progressive loading
- **Accessibility Focused**: Comprehensive keyboard navigation and screen reader support
- **User Experience Driven**: Intuitive interface with real-time feedback and error handling
- **Maintainable Code**: Well-structured components, services, and type definitions
- **Thoroughly Tested**: Comprehensive testing strategy covering unit, integration, and E2E tests

Regular review and adjustment of the plan will ensure the final implementation meets user needs and performs reliably in production environments.
