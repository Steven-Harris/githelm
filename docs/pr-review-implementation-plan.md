# Pull Request Review Implementation Plan

## Overview

This document outlines the comprehensive plan for implementing in-app pull request review functionality in GitHelm. The goal is to enable users to review pull requests directly within the application without redirecting to GitHub, providing a seamless and efficient code review experience.

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

## Conclusion

This implementation plan provides a comprehensive roadmap for building robust in-app pull request review functionality in GitHelm. The phased approach ensures steady progress while maintaining code quality and user experience standards. The technical architecture leverages GitHub's comprehensive APIs effectively while providing a user-friendly interface that integrates seamlessly with GitHelm's existing functionality.

The plan addresses key technical challenges proactively and establishes clear success metrics to measure the implementation's effectiveness. Regular review and adjustment of the plan will ensure the final implementation meets user needs and performs reliably in production environments.
