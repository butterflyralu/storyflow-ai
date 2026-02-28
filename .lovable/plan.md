

# Plan: Simplify greeting, add Copy to Clipboard button

## Changes

### 1. Simplify initial greeting in `ChatPanel.tsx` (lines 29-47)
- Remove the product context echo (mission, north star, persona) from the greeting
- Remove the options array entirely — let the user brain dump freely
- Simple greeting: "What user story would you like to draft? Just describe what you have in mind — I'll help shape it."

### 2. Add "Copy to Clipboard" button in `StoryPreview.tsx` (header, next to Save)
- Add a `Copy` button (using `Copy` icon from lucide-react) next to the Save Story button
- Only show when `story.title` exists
- On click, format the story as Jira-friendly text:
  ```
  Title: {title}
  
  As a {asA}, I want to {iWant}, so that {soThat}
  
  Description:
  {description}
  
  Acceptance Criteria:
  [{category}]
  - {item}
  - {item}
  ```
- Copy to clipboard using `navigator.clipboard.writeText()`
- Show a toast: "Copied to clipboard! Paste it into Jira."

