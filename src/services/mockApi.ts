import { ChatMessage, EvaluationResult, StoryDraft, ProductContext, OptionTile } from '@/types/wizard';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
let msgId = 100;

// ---------------------------------------------------------------------------
// Helpers: pick a random item, detect keywords
// ---------------------------------------------------------------------------
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function detectDomain(text: string): string {
  const lower = text.toLowerCase();
  if (/auth|login|sign.?up|password|sso|oauth|credential/i.test(lower)) return 'auth';
  if (/dashboard|analytics|chart|report|metric|insight/i.test(lower)) return 'dashboard';
  if (/notif|alert|email|sms|push|remind/i.test(lower)) return 'notifications';
  if (/payment|billing|invoice|checkout|subscription|stripe/i.test(lower)) return 'payments';
  if (/profile|settings|account|preference/i.test(lower)) return 'settings';
  if (/search|filter|sort|browse|catalog/i.test(lower)) return 'search';
  if (/onboard|welcome|tutorial|walkthrough/i.test(lower)) return 'onboarding';
  if (/team|collaborat|invite|share|permission|role/i.test(lower)) return 'collaboration';
  return 'general';
}

// ---------------------------------------------------------------------------
// Context-aware initial options
// ---------------------------------------------------------------------------
function getContextualOptions(ctx: ProductContext): OptionTile[] {
  const base: OptionTile[] = [];
  const mission = (ctx.mission + ' ' + ctx.objectives).toLowerCase();

  if (/auth|login|secur|access/i.test(mission)) {
    base.push({ label: '🔐 Authentication story', value: 'I want to draft a user authentication and login story' });
  }
  if (/dashboard|analytic|report|data|metric/i.test(mission)) {
    base.push({ label: '📊 Dashboard feature', value: 'I want to draft a dashboard analytics story' });
  }
  if (/notif|alert|engage|commun/i.test(mission)) {
    base.push({ label: '🔔 Notifications', value: 'I want to draft a notification system story' });
  }
  if (/onboard|sign.?up|welcome|trial/i.test(mission)) {
    base.push({ label: '🚀 Onboarding flow', value: 'I want to draft a user onboarding story' });
  }
  if (/pay|billing|subscri|monetiz|checkout/i.test(mission)) {
    base.push({ label: '💳 Payments', value: 'I want to draft a payments and billing story' });
  }
  if (/search|discover|filter|catalog/i.test(mission)) {
    base.push({ label: '🔍 Search & filter', value: 'I want to draft a search and filtering story' });
  }
  if (/team|collaborat|share|invite/i.test(mission)) {
    base.push({ label: '👥 Collaboration', value: 'I want to draft a team collaboration story' });
  }

  // Always offer some defaults if fewer than 3 matched
  const defaults: OptionTile[] = [
    { label: '🔐 Authentication story', value: 'I want to draft a user authentication and login story' },
    { label: '📊 Dashboard feature', value: 'I want to draft a dashboard analytics story' },
    { label: '🔔 Notifications', value: 'I want to draft a notification system story' },
  ];
  for (const d of defaults) {
    if (base.length >= 3) break;
    if (!base.find(b => b.label === d.label)) base.push(d);
  }

  base.push({ label: '✏️ Something else', value: '' });
  return base;
}

// ---------------------------------------------------------------------------
// Initial greeting — context-aware
// ---------------------------------------------------------------------------
export function getInitialGreeting(ctx: ProductContext): ChatMessage {
  const personaSnippet = ctx.persona
    ? `Your primary persona is *${ctx.persona}* — I'll keep their needs front and center.`
    : '';

  const strategySnippet = ctx.strategy
    ? `\n\nI see your strategy centers on **${ctx.strategy}** — I'll make sure our stories align with that direction.`
    : '';

  return {
    id: String(msgId++),
    role: 'assistant',
    content: [
      `Great, I have your product context! Here's what I understand:`,
      '',
      `**Mission:** ${ctx.mission || 'Not set'}`,
      `**North Star:** ${ctx.northStar || 'Not set'}`,
      `**Persona:** ${ctx.persona || 'Not set'}`,
      personaSnippet,
      strategySnippet,
      '',
      `What user story would you like to draft? I've suggested some options based on your context, or feel free to describe your own.`,
    ].filter(Boolean).join('\n'),
    options: getContextualOptions(ctx),
  };
}

// ---------------------------------------------------------------------------
// Domain-specific persona suggestions
// ---------------------------------------------------------------------------
const PERSONA_OPTIONS: Record<string, OptionTile[]> = {
  auth: [
    { label: 'New sign-up user', value: 'a new user signing up for the first time' },
    { label: 'Returning user', value: 'a returning user who needs quick access' },
    { label: 'Admin managing access', value: 'an admin managing user access and permissions' },
  ],
  dashboard: [
    { label: 'Data analyst', value: 'a data analyst who needs actionable insights' },
    { label: 'Manager', value: 'a manager reviewing team performance metrics' },
    { label: 'End user', value: 'an end user tracking their own activity' },
  ],
  notifications: [
    { label: 'Busy professional', value: 'a busy professional who needs timely alerts' },
    { label: 'Team lead', value: 'a team lead monitoring project updates' },
    { label: 'End user', value: 'an end user who wants to stay informed' },
  ],
  payments: [
    { label: 'Customer', value: 'a customer making a purchase' },
    { label: 'Subscriber', value: 'a subscriber managing their billing' },
    { label: 'Finance admin', value: 'a finance admin reviewing transactions' },
  ],
  settings: [
    { label: 'Power user', value: 'a power user customizing their experience' },
    { label: 'Privacy-conscious user', value: 'a user managing their privacy and data settings' },
    { label: 'Admin', value: 'an admin configuring system-wide settings' },
  ],
  search: [
    { label: 'Browser/shopper', value: 'a user browsing and exploring available options' },
    { label: 'Researcher', value: 'a researcher looking for specific information' },
    { label: 'Admin', value: 'an admin managing catalog content' },
  ],
  onboarding: [
    { label: 'First-time user', value: 'a first-time user learning the product' },
    { label: 'Trial user', value: 'a trial user evaluating whether to subscribe' },
    { label: 'Invited user', value: 'an invited user joining a team workspace' },
  ],
  collaboration: [
    { label: 'Team member', value: 'a team member collaborating on shared work' },
    { label: 'Team owner', value: 'a team owner managing members and permissions' },
    { label: 'External collaborator', value: 'an external collaborator with limited access' },
  ],
  general: [
    { label: 'End user', value: 'an end user' },
    { label: 'Admin', value: 'an admin' },
    { label: 'API consumer', value: 'an API consumer' },
  ],
};

// ---------------------------------------------------------------------------
// Domain-specific "so that" value suggestions
// ---------------------------------------------------------------------------
const VALUE_OPTIONS: Record<string, OptionTile[]> = {
  auth: [
    { label: 'Trust & security', value: 'I can trust that my account and data are secure' },
    { label: 'Quick access', value: 'I can access my workspace quickly without friction' },
    { label: 'Compliance', value: 'we meet security compliance requirements' },
  ],
  dashboard: [
    { label: 'Informed decisions', value: 'I can make data-driven decisions confidently' },
    { label: 'Spot trends', value: 'I can spot trends and anomalies early' },
    { label: 'Track goals', value: 'I can track progress toward key goals' },
  ],
  notifications: [
    { label: 'Stay informed', value: 'I stay informed about important changes without checking manually' },
    { label: 'Act quickly', value: 'I can respond to time-sensitive events quickly' },
    { label: 'Reduce noise', value: 'I only receive relevant alerts and reduce information overload' },
  ],
  payments: [
    { label: 'Complete purchase', value: 'I can complete my purchase quickly and with confidence' },
    { label: 'Manage billing', value: 'I can manage my billing without contacting support' },
    { label: 'Financial visibility', value: 'I have full visibility into my transaction history' },
  ],
  general: [
    { label: 'Save time', value: 'I can save time and be more productive' },
    { label: 'Stay informed', value: 'I stay informed about important changes' },
    { label: 'Reduce errors', value: 'I can reduce manual errors and work with confidence' },
  ],
};

// ---------------------------------------------------------------------------
// Domain-specific acceptance criteria
// ---------------------------------------------------------------------------
const DOMAIN_ACS: Record<string, string[]> = {
  auth: [
    'Given valid credentials, the user is authenticated and redirected to their dashboard within 2 seconds',
    'Given invalid credentials, the user sees a clear error message without revealing which field is wrong',
    'Password input is masked by default with an option to reveal',
    'Session persists across page refreshes for 7 days unless the user logs out',
    'After 5 failed login attempts, the account is temporarily locked with a recovery path',
  ],
  dashboard: [
    'Dashboard loads all widgets within 3 seconds on a standard connection',
    'Data refreshes automatically every 60 seconds with a visible "last updated" timestamp',
    'Charts are interactive — hovering shows exact values, clicking drills into details',
    'Users can export visible data as CSV or PDF',
    'Dashboard layout is responsive and usable on tablets (≥768px)',
  ],
  notifications: [
    'Notifications are delivered within 30 seconds of the triggering event',
    'Each notification includes a clear action link and dismiss option',
    'Users can configure notification preferences per channel (in-app, email, push)',
    'Unread count badge updates in real-time without page refresh',
    'Notification history is searchable and retains at least 90 days of records',
  ],
  payments: [
    'Payment form validates card details in real-time before submission',
    'Successful payment shows a confirmation with receipt number and email confirmation',
    'Failed payments display a specific error and suggest corrective action',
    'Users can view full payment history with date, amount, and status',
    'PCI compliance is maintained — no raw card data is stored on our servers',
  ],
  onboarding: [
    'The onboarding flow completes in under 3 minutes for a new user',
    'Users can skip any optional step and return to it later from settings',
    'A progress indicator shows how many steps remain',
    'The user\'s first key action is guided with contextual tooltips',
    'Onboarding state persists — returning users resume where they left off',
  ],
  collaboration: [
    'Invited users receive an email and can join with a single click',
    'Permissions are enforced — restricted users cannot access or modify protected content',
    'Changes by collaborators appear in real-time or within 5 seconds',
    'An activity log shows who changed what and when',
    'Team owners can revoke access immediately, with the session ending within 60 seconds',
  ],
  general: [
    'Given a valid input, the system responds within 2 seconds',
    'Error states are handled with clear, actionable user messaging',
    'The feature is accessible via keyboard navigation and screen readers',
    'The feature works on mobile viewports (≥320px)',
    'Loading states are shown for any operation taking more than 500ms',
  ],
};

// ---------------------------------------------------------------------------
// Contextual response variations
// ---------------------------------------------------------------------------
const DESCRIPTION_RESPONSES = [
  (msg: string, ctx: ProductContext) =>
    `Interesting — "${msg}". Since your mission is about *${ctx.mission?.split(' ').slice(0, 6).join(' ')}…*, this sounds like a great fit.\n\nLet's shape this into a well-structured story. Who is the primary user for this feature?`,
  (msg: string, ctx: ProductContext) =>
    `Got it! I can see how this connects to your north star metric (**${ctx.northStar || 'user engagement'}**). Let's break it down.\n\nFirst — who is the main user this story serves?`,
  (msg: string, _ctx: ProductContext) =>
    `Great choice! "${msg}" — let me help you structure this into something engineers will love.\n\nWho is the primary persona for this feature?`,
];

const PERSONA_RESPONSES = [
  (msg: string) => `Perfect — **"As ${msg}"**. That gives us a clear actor.\n\nNow, what specific capability do they need? Try to describe the *action* they want to take.`,
  (msg: string) => `Got it — we're building for **${msg}**. I'll keep their needs and constraints in mind.\n\nWhat should they be able to *do*? Describe the core capability.`,
  (msg: string) => `"As ${msg}" — nice and specific. 👍\n\nNext up: what's the key action or capability? What do they want to accomplish?`,
];

const IWANT_RESPONSES = [
  (msg: string) => `Nice — **"I want to ${msg}"**. That's clear and actionable.\n\nNow the crucial part: *why* does this matter? What value does it unlock for the user?`,
  (msg: string) => `"I want to ${msg}" — I like how specific that is.\n\nLet's capture the *value*. Why would the user care about this? What outcome are they hoping for?`,
  (msg: string) => `Great — **"I want to ${msg}"**. We're building a solid story.\n\nOne more piece: what's the *so that*? Why does this feature matter to the user?`,
];

const AC_INTRO_RESPONSES = [
  (msg: string, domain: string, acs: string[]) =>
    `Excellent — **"So that ${msg}"**. Your story has a clear purpose! 🎯\n\nBased on the ${domain} domain, here are tailored acceptance criteria I'd recommend:\n\n${acs.map((ac, i) => `${i + 1}. ✅ ${ac}`).join('\n')}\n\nHow do these look?`,
  (msg: string, _domain: string, acs: string[]) =>
    `"So that ${msg}" — that's a strong value statement.\n\nI've drafted **${acs.length} acceptance criteria** specific to this type of feature:\n\n${acs.map((ac, i) => `${i + 1}. ✅ ${ac}`).join('\n')}\n\nWant to adjust, add, or remove any?`,
];

const POSITIVE_RESPONSES = [
  `Excellent! Your story draft looks solid and well-structured. I'd recommend moving to evaluation for a comprehensive quality check — I'll analyze completeness, testability, and suggest improvements. You can always come back and refine.`,
  `Looking great! The story is specific, actionable, and has clear acceptance criteria. Ready for the evaluation step? I'll check it against best practices and suggest any improvements.`,
  `This is shaping up nicely! The story covers the *who*, *what*, and *why* clearly, with concrete ACs. Let's run it through evaluation to see if there are any gaps we missed.`,
];

// ---------------------------------------------------------------------------
// Conversation flow — now context-aware
// ---------------------------------------------------------------------------
type FlowResponder = (msg: string, story: StoryDraft, ctx: ProductContext) => {
  content: string;
  storyUpdate?: Partial<StoryDraft>;
  options?: OptionTile[];
};

const CONVERSATION_FLOWS: Array<{
  trigger: (msg: string, story: StoryDraft) => boolean;
  respond: FlowResponder;
}> = [
  {
    trigger: (_, story) => !story.description,
    respond: (msg, _story, ctx) => {
      const domain = detectDomain(msg);
      return {
        content: pick(DESCRIPTION_RESPONSES)(msg, ctx),
        storyUpdate: { description: msg },
        options: PERSONA_OPTIONS[domain] || PERSONA_OPTIONS.general,
      };
    },
  },
  {
    trigger: (_, story) => !story.asA,
    respond: (msg, story, _ctx) => {
      const domain = detectDomain(story.description);
      return {
        content: pick(PERSONA_RESPONSES)(msg),
        storyUpdate: { asA: msg },
        options: story.description
          ? [{ label: '💡 Use my description', value: story.description }]
          : undefined,
      };
    },
  },
  {
    trigger: (_, story) => !story.iWant,
    respond: (msg, story) => {
      const domain = detectDomain(story.description);
      return {
        content: pick(IWANT_RESPONSES)(msg),
        storyUpdate: { iWant: msg },
        options: VALUE_OPTIONS[domain] || VALUE_OPTIONS.general,
      };
    },
  },
  {
    trigger: (_, story) => !story.soThat,
    respond: (msg, story) => {
      const domain = detectDomain(story.description);
      const domainAcs = DOMAIN_ACS[domain] || DOMAIN_ACS.general;
      // Pick 3-4 relevant ACs
      const selectedAcs = domainAcs.slice(0, 3 + Math.floor(Math.random() * 2));
      return {
        content: pick(AC_INTRO_RESPONSES)(msg, domain, selectedAcs),
        storyUpdate: {
          soThat: msg,
          acceptanceCriteria: selectedAcs,
        },
        options: [
          { label: '✅ These look good', value: 'These acceptance criteria look good' },
          { label: '➕ Add more', value: 'I want to add more acceptance criteria' },
          { label: '✏️ Modify them', value: 'I want to modify the criteria' },
        ],
      };
    },
  },
  {
    trigger: () => true,
    respond: (msg, story) => {
      const isPositive = /\b(good|great|look|yes|perfect|fine|ok|approve|accept|lgtm)\b/i.test(msg);
      if (isPositive) {
        return {
          content: pick(POSITIVE_RESPONSES),
          options: [{ label: '🚀 Ready to evaluate', value: 'evaluate' }],
        };
      }

      // User wants to add/modify — try to be helpful
      const isAddMore = /\b(add|more|another|also|plus|include)\b/i.test(msg);
      const domain = detectDomain(story.description);
      const domainAcs = DOMAIN_ACS[domain] || DOMAIN_ACS.general;

      if (isAddMore) {
        // Find ACs not yet included
        const newAcs = domainAcs.filter(ac => !story.acceptanceCriteria.includes(ac));
        const toAdd = newAcs.slice(0, 2);
        if (toAdd.length > 0) {
          const updatedAcs = [...story.acceptanceCriteria, ...toAdd];
          return {
            content: `Here are ${toAdd.length} more criteria I'd suggest for this type of feature:\n\n${toAdd.map((ac, i) => `${story.acceptanceCriteria.length + i + 1}. ✅ ${ac}`).join('\n')}\n\nAnything else, or ready for evaluation?`,
            storyUpdate: { acceptanceCriteria: updatedAcs },
            options: [
              { label: '🚀 Ready to evaluate', value: 'evaluate' },
              { label: '➕ Add even more', value: 'I want to add more acceptance criteria' },
              { label: '✏️ Keep editing', value: 'I want to keep editing' },
            ],
          };
        }
      }

      // Treat as a custom AC
      return {
        content: `Got it — I've added that as an acceptance criterion. Your story now has **${story.acceptanceCriteria.length + 1} ACs**.\n\nAnything else you'd like to adjust, or shall we move to evaluation?`,
        storyUpdate: {
          acceptanceCriteria: [...story.acceptanceCriteria, msg],
        },
        options: [
          { label: '🚀 Ready to evaluate', value: 'evaluate' },
          { label: '✏️ Keep editing', value: 'I want to keep editing' },
        ],
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function mockAIChat(
  userMessage: string,
  currentStory: StoryDraft,
  ctx?: ProductContext,
): Promise<ChatMessage> {
  await delay(600 + Math.random() * 800);

  const context: ProductContext = ctx || { mission: '', northStar: '', persona: '', strategy: '', objectives: '' };

  for (const flow of CONVERSATION_FLOWS) {
    if (flow.trigger(userMessage, currentStory)) {
      const result = flow.respond(userMessage, currentStory, context);
      return {
        id: String(msgId++),
        role: 'assistant',
        content: result.content,
        storyUpdate: result.storyUpdate,
        options: result.options,
      };
    }
  }

  return {
    id: String(msgId++),
    role: 'assistant',
    content: `I'm not sure I understood. Could you rephrase that, or pick one of the options above?`,
  };
}

// ---------------------------------------------------------------------------
// Evaluation — now domain-aware
// ---------------------------------------------------------------------------
export async function mockEvaluateStory(story: StoryDraft): Promise<EvaluationResult> {
  await delay(1200 + Math.random() * 800);

  const hasAll = Boolean(story.asA && story.iWant && story.soThat);
  const acCount = story.acceptanceCriteria.length;
  const iWantLen = story.iWant?.length || 0;
  const domain = detectDomain(story.description);

  const qualityChecks = [
    {
      label: 'Completeness',
      passed: hasAll,
      detail: hasAll
        ? 'All core fields (As a / I want / So that) are filled'
        : `Missing: ${[!story.asA && 'As a', !story.iWant && 'I want', !story.soThat && 'So that'].filter(Boolean).join(', ')}`,
    },
    {
      label: 'Testability',
      passed: acCount >= 3,
      detail: acCount >= 3
        ? `${acCount} acceptance criteria — specific enough to write tests against`
        : `Only ${acCount} AC${acCount === 1 ? '' : 's'} — aim for at least 3 for testability`,
    },
    {
      label: 'Clarity',
      passed: iWantLen > 15,
      detail: iWantLen > 15
        ? 'Story intent is clear, specific, and unambiguous'
        : 'The "I want" clause could be more specific — consider adding detail about the interaction',
    },
    {
      label: 'Specificity',
      passed: Boolean(story.description && story.description.length > 10),
      detail: story.description
        ? 'Description provides adequate context for implementation'
        : 'Consider adding a description with implementation context',
    },
  ];

  const domainSuggestions: Record<string, string[]> = {
    auth: [
      'Consider adding rate limiting criteria for brute-force protection',
      'Specify password complexity requirements in ACs',
      'Add criteria for session timeout and token refresh behavior',
      'Include accessibility requirements for authentication forms',
    ],
    dashboard: [
      'Specify how data should behave when the dataset is empty (zero-state)',
      'Add criteria for data caching and staleness thresholds',
      'Consider adding export functionality requirements',
      'Specify behavior when data fails to load (error recovery)',
    ],
    notifications: [
      'Define notification batching/throttling rules to prevent spam',
      'Specify retry behavior for failed notification delivery',
      'Add criteria for notification channel preferences and opt-out',
      'Consider quiet hours / do-not-disturb behavior',
    ],
    payments: [
      'Specify currency handling and formatting requirements',
      'Add criteria for refund and dispute handling',
      'Include receipt generation and email confirmation',
      'Consider idempotency for payment retries',
    ],
    general: [
      'Consider adding edge case scenarios to acceptance criteria',
      'Specify performance expectations (response time, throughput)',
      'Add "Given/When/Then" format for more precise ACs',
      'Include non-functional requirements (accessibility, mobile)',
    ],
  };

  const suggestions = domainSuggestions[domain] || domainSuggestions.general;

  const improvedIWant = story.iWant
    ? story.iWant.replace(/\.$/, '') + ' with clear feedback at each step'
    : story.iWant;
  const improvedSoThat = story.soThat
    ? story.soThat.replace(/\.$/, '') + ' and have confidence in the system'
    : story.soThat;

  const additionalAcs = (DOMAIN_ACS[domain] || DOMAIN_ACS.general)
    .filter(ac => !story.acceptanceCriteria.includes(ac))
    .slice(0, 2);

  const improvedStory: StoryDraft = {
    ...story,
    asA: story.asA || 'a user',
    iWant: improvedIWant,
    soThat: improvedSoThat,
    description: story.description
      ? `${story.description}\n\nThis feature should follow existing UI patterns and be fully responsive. Edge cases should degrade gracefully with informative error messages.`
      : story.description,
    acceptanceCriteria: [...story.acceptanceCriteria, ...additionalAcs],
  };

  const domainLearnings: Record<string, string[]> = {
    auth: [
      'Always include brute-force and lockout criteria for security stories',
      'Specify session management behavior (timeout, refresh, multi-device)',
      'Error messages should never reveal whether an email exists in the system',
    ],
    dashboard: [
      'Always define zero-state and error-state behaviors for data-driven features',
      'Specify data freshness requirements (real-time vs. cached)',
      'Include performance budgets — especially for initial load times',
    ],
    notifications: [
      'Define throttling rules to prevent notification fatigue',
      'Always let users control notification preferences per channel',
      'Specify what happens when notifications fail to deliver',
    ],
    payments: [
      'Idempotency is critical — always specify retry behavior',
      'Never store raw payment credentials; reference PCI compliance',
      'Include receipt and confirmation flows in every payment story',
    ],
    general: [
      'Always include error/edge-case acceptance criteria',
      'Specify device/viewport requirements upfront',
      'Use measurable language in acceptance criteria (times, counts, states)',
    ],
  };

  return {
    qualityChecks,
    suggestions,
    improvedStory,
    learnings: domainLearnings[domain] || domainLearnings.general,
  };
}

export async function mockSaveStory(story: StoryDraft): Promise<{ success: boolean }> {
  await delay(500);
  return { success: true };
}
