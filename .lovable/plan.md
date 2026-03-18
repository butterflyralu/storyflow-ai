

## Plan: Clone Chat History per Sub-Story & Improve Epic Naming

### Problem
Currently, when splitting an epic into sub-stories:
1. All child stories share the same `session_id` (the parent chat session) — they don't get their own independent chat history
2. The epic title is just the original story's title — not a suggestive/descriptive epic name
3. The epic description doesn't preserve the full original story details (as_a, i_want, so_that, acceptance criteria)

### Changes

#### 1. Enhance `saveEpicWithStories` in `src/hooks/useStorySaver.ts`
- For each child story, **create a new chat session** (via `usePersistedChat.createSession`) with a title matching the child story's title
- **Copy all chat messages** from the parent session (`dbSessionId`) into each new child session
- Save each child story with its own new `session_id`
- Use `epicSummary` (from the AI split response) as the epic title instead of the original story title
- Build a rich description for the epic that includes the original story's full details: title, as_a, i_want, so_that, description, and acceptance criteria

#### 2. Update `createEpic` in `src/hooks/useStorySaver.ts`
- Accept an optional `epicSummary` parameter to use as the epic title (falling back to original story title)
- Compose the epic description from the original story fields: format as a readable block with the user story template and acceptance criteria

#### 3. Update `SplitStoriesView.tsx` → `handleSaveAll`
- Pass `epicSummary` and the parent `dbSessionId` to the updated `saveEpicWithStories`
- The hook handles cloning chat sessions internally

#### 4. Update `usePersistedChat.ts`
- Add a `cloneSession` method that creates a new session and copies all messages from an existing session into it

### Data Flow
```text
handleSaveAll()
  → createEpic(originalStory, { epicSummary, description: formatted })
  → for each childStory:
      → cloneSession(parentDbSessionId, childStory.title) → newSessionId
      → saveGeneratedStory(childStory, { sessionId: newSessionId, epicId })
```

### Epic Title & Description Format
- **Title**: Uses `epicSummary` from AI (e.g., "Order Management & Scheduling System") 
- **Description**: Structured from original story:
  ```
  Original Story: {title}
  As a {asA}, I want to {iWant}, so that {soThat}.
  
  {description}
  
  Acceptance Criteria:
  - [Category]: item1, item2...
  ```

