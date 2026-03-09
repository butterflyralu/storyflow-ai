# PO StoryFlow AI

An AI-powered Product Owner assistant that helps teams craft high-quality user stories through guided conversation, automated evaluation, and intelligent epic splitting.

---

## 🎯 Business Overview

### Problem

Writing good user stories is hard. Product Owners often produce stories that are too vague, too large (epics in disguise), or missing clear acceptance criteria. Poor stories lead to misaligned development, scope creep, and wasted sprints.

### Solution

PO StoryFlow AI acts as an always-available PO coach that:

- **Guides** users from a rough idea to a complete, sprint-ready user story through structured conversation
- **Evaluates** stories against industry-standard frameworks (INVEST + Definition of Ready)
- **Coaches** users on writing better business value statements instead of auto-generating them
- **Detects** stories that are actually epics and offers to split them into independent, deliverable sub-stories
- **Learns** by surfacing insights and suggesting custom checklist rules based on recurring patterns

### Target Users

- Product Owners & Product Managers
- Scrum Masters coaching teams on story quality
- Business Analysts translating requirements into agile artifacts
- Development teams wanting clearer, more actionable stories

---

## 🧩 Functional Overview

### Core Workflow

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐     ┌─────────────┐
│  1. Product  │ ──▶ │  2. Chat     │ ──▶ │ 3. Story   │ ──▶ │ 4. Evaluate │
│   Context    │     │   with AI    │     │   Preview  │     │   & Finish  │
└─────────────┘     └──────────────┘     └────────────┘     └─────────────┘
```

#### Step 1 — Product Context Setup
Users define their product's mission, North Star metric, target persona, strategy, and current objectives. This context anchors all AI interactions, ensuring generated stories align with business goals.

#### Step 2 — Conversational Story Drafting
The AI agent guides users through a 4-phase flow:
1. **Topic Selection** — Suggests relevant story topics based on product context
2. **Clarification** — Asks implementation-specific questions to remove ambiguity
3. **Drafting** — Incrementally populates story fields (title → role → capability → value → description → acceptance criteria)
4. **Confirmation Gate** — Presents the completed story for user review before evaluation

**Business Value Rule**: The AI deliberately does *not* auto-fill the "so that…" (business value) field. Instead, it coaches the user to articulate a specific, measurable outcome — building the skill over time.

#### Step 3 — Live Story Preview
A real-time preview card displays the story as it's being drafted, showing the user role statement, description, acceptance criteria (plain text or Gherkin), and metadata.

#### Step 4 — Evaluation & Scoring
Stories are scored against:
- **INVEST Framework** — Independent, Negotiable, Valuable, Estimable, Small, Testable
- **Definition of Ready** — Acceptance criteria quality, description clarity
- **Custom Checklist Rules** — User-defined rules accumulated over time

Results include a pass/fail scorecard, an AI-improved version of the story, and a learning insight with coaching feedback.

### Epic Splitting

When the evaluator flags a story as "likely epic" (too large for a single sprint), the app offers an intelligent splitting workflow:

1. The AI proposes 3–6 independent sub-stories in the chat
2. The user discusses, merges, drops, or refines the proposed split
3. Confirmed stories appear as swipeable cards in a carousel
4. Each sub-story can be independently edited, evaluated, and saved
5. A parent **epic record** is created in the database, with all child stories linked via `epic_id`

### Data Persistence

All data is persisted per-user:
- **Product Contexts** — Multiple contexts per user (e.g., different products)
- **Chat Sessions** — Full conversation history with the AI
- **Generated Stories** — Complete story drafts with evaluation results
- **Epics** — Parent records with linked child stories
- **Profiles** — Display name and avatar

### Sidebar & History

The sidebar provides quick access to:
- Saved product contexts (switchable)
- Chat session history (resumable)
- Epic groupings with nested child stories
- New story / new context actions

### Admin Dashboard

A protected admin view (email-gated) for monitoring platform usage.

---

## 🏗 Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, CSS design tokens (HSL) |
| **State** | React Context (WizardContext, AuthContext) |
| **Routing** | React Router v6 |
| **Data Fetching** | TanStack React Query, Supabase JS SDK |
| **Backend** | Supabase (Lovable Cloud) |
| **AI** | Google Gemini 2.5 Flash via Lovable AI Gateway |
| **Auth** | Supabase Auth (Email/Password + Google OAuth) |
| **Database** | PostgreSQL (Supabase-managed) |

### Project Structure

```
src/
├── components/
│   ├── Wizard.tsx              # Main wizard orchestrator
│   ├── ChatPanel.tsx           # AI chat interface
│   ├── StoryPreview.tsx        # Live story preview card
│   ├── EvaluationCard.tsx      # INVEST scorecard display
│   ├── SplitStoriesView.tsx    # Epic split carousel
│   ├── ContextWizard.tsx       # Product context setup form
│   ├── AppSidebar.tsx          # Navigation sidebar
│   ├── ProductContextSettings.tsx
│   └── ui/                     # shadcn/ui components
├── context/
│   ├── AuthContext.tsx          # Auth state provider
│   └── WizardContext.tsx        # Wizard state machine
├── hooks/
│   ├── usePersistedChat.ts     # Chat CRUD operations
│   ├── usePersistedContext.ts  # Product context CRUD
│   ├── useStorySaver.ts        # Story & epic persistence
│   └── useIsAdmin.ts           # Admin role check
├── pages/
│   ├── Index.tsx               # Main app (wizard)
│   ├── Auth.tsx                # Login / signup
│   ├── FAQ.tsx                 # Help & documentation
│   └── AdminDashboard.tsx      # Admin analytics
├── services/
│   ├── api.ts                  # Edge function API client
│   └── types.ts                # Shared TypeScript types
└── types/
    └── wizard.ts               # Wizard-specific types

supabase/
└── functions/
    ├── story-agent/            # Conversational story drafting AI
    ├── evaluate-story/         # INVEST + DoR evaluation AI
    └── split-story/            # Epic → sub-stories AI
```

### Database Schema

```
┌──────────────────┐     ┌──────────────────┐
│  product_contexts │     │    profiles       │
│──────────────────│     │──────────────────│
│  id (PK)         │     │  id (PK, = user)  │
│  user_id         │     │  display_name     │
│  product_name    │     │  avatar_url       │
│  industry        │     └──────────────────┘
│  mission         │
│  north_star      │     ┌──────────────────┐
│  persona         │     │   chat_sessions   │
│  strategy        │◀────│──────────────────│
│  objectives      │     │  id (PK)         │
│  ac_format       │     │  user_id         │
└──────────────────┘     │  context_id (FK) │
                         │  title           │
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │  chat_messages    │
                         │──────────────────│
                         │  id (PK)         │
                         │  session_id (FK) │
                         │  role            │
                         │  content         │
                         │  options (JSON)  │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│     epics         │     │generated_stories │
│──────────────────│     │──────────────────│
│  id (PK)         │◀────│  id (PK)         │
│  user_id         │     │  user_id         │
│  context_id (FK) │     │  context_id (FK) │
│  session_id (FK) │     │  session_id (FK) │
│  title           │     │  epic_id (FK)    │
│  description     │     │  title           │
│  original_as_a   │     │  as_a / i_want   │
│  original_i_want │     │  so_that         │
│  original_so_that│     │  acceptance_crit │
└──────────────────┘     │  evaluation_*    │
                         │  is_likely_epic  │
                         └──────────────────┘
```

### Security

- **Row Level Security (RLS)** on all tables — users can only access their own data
- **Admin access** via a `is_admin()` database function (email-gated, server-side)
- **Auth** handled by Supabase Auth with session management
- **Edge Functions** secured via Supabase service role keys (server-side only)

### AI Integration

All three edge functions use the **Lovable AI Gateway** with Google Gemini 2.5 Flash. They employ **tool calling** (function calling) to guarantee structured JSON responses matching the application's TypeScript types. No user-provided API keys required.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Local Development

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### Deployment

The app is deployed via [Lovable](https://lovable.dev) with automatic builds. Backend (database, auth, edge functions) is powered by Lovable Cloud.

---

## 📄 License

Private project. All rights reserved.
