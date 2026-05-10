import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Rocket,
  FolderKanban,
  MessageSquare,
  ClipboardCheck,
  Layers,
  Library,
  Download,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type Section = {
  icon: typeof Rocket;
  title: string;
  intro?: string;
  steps?: { title: string; body: string }[];
  tips?: string[];
};

const sections: Section[] = [
  {
    icon: Rocket,
    title: '1. Get started in 60 seconds',
    intro:
      'StoryFlow AI turns rough product ideas into well-formed user stories through a guided conversation, then evaluates them against industry quality frameworks.',
    steps: [
      {
        title: 'Sign in',
        body:
          'Create an account with email/password or Google from the sign-in screen. Your data is isolated to your account.',
      },
      {
        title: 'Create a Product Context',
        body:
          'Open Product Context from the sidebar and add your product mission, persona, strategy, north-star metric, and objectives. Use **Demo Content** if you just want to explore the flow.',
      },
      {
        title: 'Start drafting',
        body:
          'Pick the active context from the sidebar dropdown, then describe an idea in the chat. The agent takes it from there.',
      },
    ],
  },
  {
    icon: FolderKanban,
    title: '2. Manage Product Contexts',
    intro:
      'A Product Context is the strategic backdrop the AI uses on every request. You can keep one per product or initiative and switch between them at any time.',
    steps: [
      {
        title: 'Create a new context',
        body:
          'Click **+ New Project** in the sidebar dropdown. Newly created contexts appear in the dropdown immediately and become the active context.',
      },
      {
        title: 'Edit or delete',
        body:
          'Open Product Context, pick a context from the list, edit any field, and Save. Deletion is protected by a confirmation dialog.',
      },
      {
        title: 'Switch contexts',
        body:
          'Use the sidebar dropdown to switch the active context. All chats and stories in the workspace use the active context for the next request.',
      },
    ],
  },
  {
    icon: MessageSquare,
    title: '3. Draft a story with the AI',
    intro:
      'The drafting flow is a 4-phase coached conversation: brain dump, clarification, draft, evaluation.',
    steps: [
      {
        title: 'Brain dump',
        body:
          'Type the rough idea — one sentence is enough. The empty workspace deliberately omits suggestions to encourage an unguided first message.',
      },
      {
        title: 'Clarification wizard',
        body:
          'The agent asks up to **4 clarifying questions** (4–6 for complex stories) in a stepped wizard. Answer with the suggested chips, type free text, skip a question, or skip directly to the draft.',
      },
      {
        title: 'Review the ACC',
        body:
          'After clarifications you confirm the **As a / I want / So that** lines and acceptance criteria. The agent never auto-fills "So that" — business value is yours to define.',
      },
      {
        title: 'Auto-evaluation',
        body:
          'When you confirm the story looks good, evaluation runs automatically — no extra confirmation step.',
      },
    ],
    tips: [
      'Press **Shift+Enter** for a new line in the chat input; **Enter** sends.',
      'The chat and story panels scroll independently in a fixed-height workspace.',
    ],
  },
  {
    icon: ClipboardCheck,
    title: '4. Quality evaluation',
    intro:
      'Every story is scored against INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable) and Definition of Ready criteria.',
    steps: [
      {
        title: 'Read the scorecard',
        body:
          'Each criterion shows PASS or FAIL with an explanation. Inline amber banners appear on the parts of the story that need work.',
      },
      {
        title: 'Apply suggestions',
        body:
          'Click **Apply** on any inline suggestion to accept the AI improvement, or edit the field directly — changes auto-sync on blur.',
      },
      {
        title: 'Re-run evaluation',
        body:
          'Use the **Evaluate** button in the Story Draft header at any time. The same button is available on split sub-stories and library stories.',
      },
      {
        title: 'Status badges',
        body:
          'Stories show **Draft**, **Evaluated · Passed**, or **Needs work**. The same dot appears next to sessions and child stories in the sidebar.',
      },
    ],
  },
  {
    icon: Layers,
    title: '5. Epics & splitting',
    intro:
      'When a story is too large, the evaluator flags it as a likely epic and offers to split it into smaller, independent stories.',
    steps: [
      {
        title: 'Discuss the split',
        body:
          'The agent proposes 3–6 sub-stories. Discuss in chat — keep all, drop some, or refine — then confirm.',
      },
      {
        title: 'Edit sub-stories',
        body:
          'Confirmed sub-stories appear as **swipeable cards** you can edit and evaluate individually.',
      },
      {
        title: 'Save',
        body:
          'Save sub-stories one by one, or use **Save All** to commit them together. They appear nested under the epic in the sidebar and on the **/epics** dashboard.',
      },
    ],
  },
  {
    icon: Library,
    title: '6. Workspace, sidebar & library',
    intro:
      'The sidebar is your navigation hub: chat sessions, epics, child stories, and quick links.',
    steps: [
      {
        title: 'Sessions',
        body:
          'Each chat is a session. Click to reopen — message history and the right-side story rehydrate exactly as you left them.',
      },
      {
        title: 'Epics dashboard',
        body:
          'Open **/epics** to see every saved epic with its sub-stories, status, and evaluation summary.',
      },
      {
        title: 'Delete with confirmation',
        body:
          'Deleting sessions, contexts, or stories is always protected by a confirmation dialog — there is no silent destructive action.',
      },
    ],
  },
  {
    icon: Download,
    title: '7. Export to your tracker',
    steps: [
      {
        title: 'Copy menu',
        body:
          'Use the **Copy** menu in the Story Draft header to copy as plain text or as **Jira-compatible Markdown** with categorized acceptance criteria.',
      },
      {
        title: 'Paste into Jira / Linear / Azure DevOps',
        body:
          'The Markdown export uses standard headings and bullet groups, ready to paste into any modern tracker.',
      },
    ],
  },
  {
    icon: Settings,
    title: '8. Account & settings',
    steps: [
      {
        title: 'Sign out',
        body: 'Use the avatar menu at the bottom of the sidebar.',
      },
      {
        title: 'Admin dashboard',
        body:
          'Admins see an extra **AI Quality Dashboard** link in the sidebar with metrics, story traces, INVEST scorecards, and per-model token/cost usage.',
      },
    ],
  },
  {
    icon: HelpCircle,
    title: '9. Troubleshooting',
    tips: [
      'If a request fails with **rate limit** or **credits exhausted**, the app surfaces a clear inline error — wait a moment and retry. The agent also retries transient errors automatically with exponential backoff.',
      'If a newly created Product Context does not appear in the dropdown, the list refreshes automatically — but you can also reopen the dropdown to force a refresh.',
      'Refreshing during evaluation is safe: re-run it from the **Evaluate** button.',
      'For privacy and data-handling questions see the **Security & Privacy FAQ** in the sidebar.',
    ],
  },
];

function renderBold(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function UserManual() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-6 gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Button>

        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            StoryFlow AI — User Manual
          </h1>
          <p className="mt-2 text-muted-foreground">
            A practical, end-to-end guide to drafting, evaluating, splitting, and exporting user stories.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((s) => (
            <Card key={s.title} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                {s.intro && <p>{renderBold(s.intro)}</p>}

                {s.steps && (
                  <ol className="space-y-3">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{step.title}</p>
                          <p className="mt-0.5">{renderBold(step.body)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {s.tips && (
                  <ul className="list-disc space-y-1.5 pl-5">
                    {s.tips.map((t, i) => (
                      <li key={i}>{renderBold(t)}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Last updated: May 2026 · Looking for security or data-handling info? See the{' '}
          <button
            type="button"
            onClick={() => navigate('/faq')}
            className="underline-offset-2 hover:underline"
          >
            Security &amp; Privacy FAQ
          </button>
          .
        </p>
      </div>
    </div>
  );
}
