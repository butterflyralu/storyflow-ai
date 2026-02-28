

# PO Agent – Wizard-Style Implementation Plan

## Overview
A single-page wizard experience that guides Product Owners step-by-step from product context through story drafting, AI evaluation, and finalization. Each step flows naturally into the next with clear progress indication and smooth transitions.

## Wizard Structure (Single Route: `/`)

### Step Indicator (Top Bar)
- Horizontal stepper showing: **Context → Draft → Evaluate → Finalize**
- Clickable completed steps to go back, disabled future steps
- Current step highlighted with progress animation

### Step 1: Product Context
- One-field-at-a-time guided input (mission → north star → persona → strategy → objectives)
- Each field has helper text, placeholder examples, and a "Skip with default" option
- Mini progress within the step (e.g., "2 of 5")
- "Next: Start Drafting →" button when complete

### Step 2: Story Drafting (Split View)
- **Left panel**: Chat interface with AI assistant
  - AI greets with context summary and asks "What story do you want to draft?"
  - Clickable option tiles for quick replies
  - Free-text input with send button
  - AI asks clarifying questions, suggests defaults, always offers next action
- **Right panel**: Live story draft card
  - Sections: As a… / I want… / So that… / Description / Acceptance Criteria / Metadata
  - Sections populate and update as conversation progresses
  - Inline editing on any section
- "Ready to Evaluate →" button appears when story has minimum viable content

### Step 3: Evaluation
- Right panel morphs to show evaluation results:
  - Quality check badges (completeness, testability, clarity, specificity)
  - Improvement suggestions as actionable bullets
  - Improved version with highlighted differences
  - Learning checklist insights
- Left panel shows AI summary of evaluation
- Three action buttons: "Accept Improved" / "Keep Original" / "Continue Editing"
- "Continue Editing" returns to Step 2 with chosen version

### Step 4: Finalize
- Final story preview (read-only, polished card)
- Metadata review (priority, size, tags — editable)
- "Save Story" and "Start New Story" buttons
- Confirmation toast on save

## Key Components
- `Wizard` – manages step state, transitions, and step validation
- `StepIndicator` – top stepper bar with clickable completed steps
- `ContextWizard` – one-at-a-time field input within Step 1
- `ChatPanel` – message list, input bar, option tiles
- `OptionTiles` – clickable suggestion chips
- `StoryPreview` – structured story card with inline editing
- `EvaluationCard` – quality checks, suggestions, improved version
- `LearningChecklist` – accumulated best-practice rules

## State Management
- Single `WizardContext` provider holding: current step, product context, story draft, chat history, evaluation results, saved stories
- Step transitions validate required data before advancing

## Mock Services
- `mockAIChat()` – returns clarifying questions + story field updates with realistic delay
- `mockEvaluateStory()` – returns quality scores, suggestions, improved version
- `mockSaveStory()` – persists to local state

## Design
- Calm slate/blue palette, clean typography
- Wizard container centered with max-width ~1200px
- Subtle step transition animations (fade/slide)
- Cards with soft shadows, clear section hierarchy
- Always visible: where you are, what's next, what action is needed

