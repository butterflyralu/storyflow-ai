import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Brain, Lock, Database, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const faqs = [
  {
    icon: Brain,
    category: 'AI & Data Usage',
    items: [
      {
        q: 'What AI model does the app use?',
        a: 'The app uses **Google Gemini 2.5 Flash** via a secure AI gateway. This model is optimized for speed and structured reasoning — ideal for drafting and evaluating user stories. The AI runs on Google\'s infrastructure and does not store or learn from your data.',
      },
      {
        q: 'How does the AI use my data?',
        a: 'The AI receives your current conversation history and product context **only for the duration of a single request** to generate relevant responses. Your data is **not used to train the model**, is **not stored by Google**, and is **not shared with any third party**. Each request is stateless from the AI\'s perspective.',
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
        a: 'You are redirected to **Google\'s own login page**. The app **never sees or stores your Google password**. After you authenticate, Google sends back only your **email address, display name, and profile photo**. This is standard OAuth 2.0 — the industry-standard secure protocol used by virtually all modern apps.',
      },
      {
        q: 'What if I sign in with email and password?',
        a: 'Your password is **hashed using bcrypt** before being stored — meaning the actual password is never saved in plain text. The authentication system is managed by an enterprise-grade infrastructure provider and follows industry best practices for secure credential storage.',
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
        a: 'The app stores: your **profile** (display name, avatar URL), your **product context** (product name, industry, personas, etc.), your **chat sessions** (conversation history with the AI), and **message content** (your messages and AI responses). Story drafts exist in-memory during a session and are preserved within chat history.',
      },
      {
        q: 'Who can see my data?',
        a: 'Only **you**. All database tables are protected by Row-Level Security (RLS) policies, which means every query is filtered by your authenticated user ID. No other user — including other testers — can access your data.',
      },
      {
        q: 'Where is my data stored?',
        a: 'Your data is stored in a secure, managed PostgreSQL database hosted on enterprise cloud infrastructure with encryption at rest and in transit (TLS/SSL).',
      },
      {
        q: 'Can I delete my data?',
        a: 'Yes. You can delete individual chat sessions from the sidebar. If you need a full data wipe, contact the app administrator.',
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
        a: 'The app follows data minimization principles — we only collect what\'s needed for functionality. Data is per-user isolated and can be deleted on request. For a formal GDPR assessment for production use, consult your legal/compliance team.',
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
            Security & Privacy FAQ
          </h1>
          <p className="mt-2 text-muted-foreground">
            Everything you need to know about how your data is handled, stored, and protected.
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
          Last updated: March 2026 · Questions? Contact your app administrator.
        </p>
      </div>
    </div>
  );
}
