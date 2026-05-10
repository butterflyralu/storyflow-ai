import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Brain, Lock, Database, ArrowLeft, Sparkles, ClipboardCheck, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const faqs = [
  {
    icon: Sparkles,
    category: 'Getting Started',
    items: [
      {
        q: 'What is StoryFlow AI?',
        a: 'StoryFlow AI is a Product Owner assistant that helps you turn rough ideas into well-formed user stories. It coaches you through a conversation, drafts a story (title, As a / I want / So that, description, acceptance criteria), evaluates it against industry frameworks (INVEST and Definition of Ready), and helps you split stories that are too large into smaller ones.',
      },
      {
        q: 'How do I start a new story?',
        a: 'After creating a **product context** (mission, persona, strategy, north-star, objectives), open the workspace and just describe your idea in the chat. The agent will ask up to 4 — or 4–6 for complex stories — **clarifying questions in a stepped wizard** before drafting. You can answer with the suggested chips or free text, skip individual questions, or skip to draft.',
      },
      {
        q: 'What is the product context for?',
        a: 'It is the strategic backdrop the agent uses on every request: your product mission, target persona, competitive strategy, north-star metric, and objectives. You can manage multiple contexts and switch between them from the sidebar. New accounts can also load **demo content** to explore the flow without filling everything in.',
      },
    ],
  },
  {
    icon: ClipboardCheck,
    category: 'Drafting & Evaluation',
    items: [
      {
        q: 'How does story evaluation work?',
        a: 'After the draft is ready, the agent runs a **quality evaluation** against INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable) and your team\'s Definition of Ready criteria. You see a scorecard with **three possible verdicts** per criterion — **Pass**, **Pass with caveat**, or **Fail** — plus inline annotations on the parts of the story that need work, with a one-click "Apply" to accept the suggested improvement.',
      },
      {
        q: 'What does "Pass with caveat" mean?',
        a: 'It is the middle verdict between Pass and Fail. The story **meets the criterion**, but with a noted limitation, soft dependency, or condition the team should be aware of (for example, an assumed integration that exists but should be confirmed). The summary count shows it as a separate category — e.g. "3 passed · 2 with caveats · 1 failed" — and the "with caveats" segment is hidden when there are none.',
      },
      {
        q: 'Can I customize the Definition of Ready criteria?',
        a: 'Yes. Open **Product Context** in the sidebar and scroll to **Definition of Ready Rules**. Each context comes seeded with the two defaults (Acceptance Criteria, Description) which you can rename, edit, delete, or extend with your own rules (name + short description). The evaluator uses the rules of the **active product context** on every evaluation, so different products can have different DoR.',
      },
      {
        q: 'What if I refresh during evaluation, or want to re-run it?',
        a: 'Use the **Evaluate** button in the Story Draft header. It re-runs the quality checks on demand for the current story — the same is available on each card in the split view and on stories opened from the sidebar.',
      },
      {
        q: 'How do I know which stories were evaluated?',
        a: 'Every story shows a **status badge**: "Draft" (neutral), "Evaluated · Passed" (green), or "Needs work" (amber). The same dot indicator is shown next to sessions and child stories in the sidebar so you can see at a glance which ones still need a quality pass.',
      },
      {
        q: 'Why does the agent never auto-fill "So that"?',
        a: 'The "So that" clause captures **business value** — and that is your call as the Product Owner. The agent will ask about value but never invent it, to keep the story honest and aligned with your strategy.',
      },
      {
        q: 'How do I export a story?',
        a: 'Use the **Copy** menu in the Story Draft header. You can copy as plain text or as **Jira-compatible Markdown** with categorized acceptance criteria, ready to paste into your tracker.',
      },
    ],
  },
  {
    icon: Layers,
    category: 'Epics & Splitting',
    items: [
      {
        q: 'What happens if my story is too big?',
        a: 'The evaluator flags it as a **likely epic** and offers to split it. You discuss the proposed sub-stories in chat — keep all, drop some, or refine — then confirm. The chosen sub-stories appear as **swipeable cards** you can edit, evaluate, and save individually, or "Save All" at once.',
      },
      {
        q: 'How are epics organised?',
        a: 'When you save split stories, an **epic record** is created with the original story details and each sub-story is linked to it. Epics and their child stories appear grouped in the sidebar; clicking a child loads it into the workspace. There is also an `/epics` dashboard with all your epics in one place.',
      },
    ],
  },
  {
    icon: Brain,
    category: 'AI & Data Usage',
    items: [
      {
        q: 'What AI model does the app use?',
        a: 'The app uses **Google Gemini 2.5 Flash** via a secure AI gateway. The model is optimised for speed and structured reasoning. The AI runs on Google\'s infrastructure and does not store or learn from your data.',
      },
      {
        q: 'How does the AI use my data?',
        a: 'Each request sends only your current conversation, the active product context, and (for evaluation) the story draft — strictly for the duration of that request. Your data is **not used to train the model**, **not retained by Google**, and **not shared with third parties**.',
      },
      {
        q: 'What about reliability and rate limits?',
        a: 'The app uses **exponential backoff retries (1s/2s/4s)** and surfaces clear, actionable messages for rate-limit (429) and credit (402) errors so you know whether to wait or top up.',
      },
      {
        q: 'Can the AI access data from other users?',
        a: 'No. Each AI request only contains your own conversation and product context. The AI has no access to any other user\'s data, sessions, or stories.',
      },
    ],
  },
  {
    icon: Lock,
    category: 'Authentication & Credentials',
    items: [
      {
        q: 'What happens when I sign in with Google?',
        a: 'You are redirected to **Google\'s own login page**. The app **never sees or stores your Google password**. After authentication, Google sends back only your **email, display name, and profile photo**. This is standard OAuth 2.0.',
      },
      {
        q: 'What if I sign in with email and password?',
        a: 'Your password is **hashed using bcrypt** before being stored — the actual password is never saved in plain text. Authentication is managed by enterprise-grade infrastructure following industry best practices.',
      },
      {
        q: 'Can the app developers see my password?',
        a: 'No. Passwords are hashed irreversibly. Neither the app developers nor the infrastructure provider can retrieve your original password.',
      },
    ],
  },
  {
    icon: Database,
    category: 'Data Storage',
    items: [
      {
        q: 'What data does the app store?',
        a: 'Your **profile** (display name, avatar), **product contexts**, **chat sessions** with message history (including clarification-wizard answers so they resume after a refresh), **generated stories** (title, As a / I want / So that, description, acceptance criteria, evaluation result and scorecard), and **epics** with their linked child stories. Admins also see anonymised **API usage logs** (token counts, model, USD cost) for monitoring.',
      },
      {
        q: 'Who can see my data?',
        a: 'Only **you**. All tables are protected by Row-Level Security (RLS) policies — every query is filtered by your authenticated user ID. No other tester can access your data.',
      },
      {
        q: 'Where is my data stored?',
        a: 'In a secure managed PostgreSQL database hosted on enterprise cloud infrastructure with encryption at rest and in transit (TLS/SSL).',
      },
      {
        q: 'Can I delete my data?',
        a: 'Yes. You can delete individual chat sessions from the sidebar (a confirmation dialog protects the action). For a full data wipe, contact the app administrator.',
      },
    ],
  },
  {
    icon: Shield,
    category: 'Security & Privacy',
    items: [
      {
        q: 'Is my connection to the app secure?',
        a: 'Yes. All communication between your browser and the app is encrypted using **HTTPS/TLS**. API calls to the AI gateway are also encrypted end-to-end.',
      },
      {
        q: 'Is this app GDPR-compliant?',
        a: 'The app follows data minimisation principles — we only collect what is needed for functionality. Data is per-user isolated and can be deleted on request. For a formal GDPR assessment for production use, consult your legal/compliance team.',
      },
      {
        q: 'What happens during the testing period?',
        a: 'During testing, all the same security measures apply. Your test data is real data protected by the same authentication and access controls as production. After testing, data can be retained or wiped as needed.',
      },
    ],
  },
];

export default function FAQ() {
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
            StoryFlow AI — FAQ
          </h1>
          <p className="mt-2 text-muted-foreground">
            How the app works, how the AI drafts and evaluates your stories, and how your data is protected.
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((section) => (
            <Card key={section.category} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  {section.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {section.items.map((item, i) => (
                    <AccordionItem key={i} value={`${section.category}-${i}`} className="border-border/50">
                      <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {item.a.split('**').map((part, j) =>
                          j % 2 === 1 ? (
                            <strong key={j} className="font-semibold text-foreground">{part}</strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Last updated: May 2026 · Questions? Contact your app administrator.
        </p>
      </div>
    </div>
  );
}
