import { ChatMessage, EvaluationResult, StoryDraft, ProductContext, OptionTile } from '@/types/wizard';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
let msgId = 100;

const INITIAL_OPTIONS: OptionTile[] = [
  { label: '🔐 Authentication story', value: 'I want to draft a user authentication story' },
  { label: '📊 Dashboard feature', value: 'I want to draft a dashboard analytics story' },
  { label: '🔔 Notifications', value: 'I want to draft a notification system story' },
  { label: '✏️ Something else', value: '' },
];

export function getInitialGreeting(ctx: ProductContext): ChatMessage {
  return {
    id: String(msgId++),
    role: 'assistant',
    content: `Great, I have your product context! Here's what I understand:\n\n**Mission:** ${ctx.mission || 'Not set'}\n**North Star:** ${ctx.northStar || 'Not set'}\n**Persona:** ${ctx.persona || 'Not set'}\n\nWhat user story would you like to draft?`,
    options: INITIAL_OPTIONS,
  };
}

// Conversation stages
const CONVERSATION_FLOWS: Array<{
  trigger: (msg: string, story: StoryDraft) => boolean;
  respond: (msg: string, story: StoryDraft) => { content: string; storyUpdate?: Partial<StoryDraft>; options?: OptionTile[] };
}> = [
  {
    trigger: (_, story) => !story.asA,
    respond: (msg) => ({
      content: `Got it! Let me shape that into a story. First, who is the primary user for this feature?`,
      storyUpdate: { description: msg },
      options: [
        { label: 'End user', value: 'an end user' },
        { label: 'Admin', value: 'an admin' },
        { label: 'API consumer', value: 'an API consumer' },
      ],
    }),
  },
  {
    trigger: (_, story) => !story.iWant,
    respond: (msg, story) => ({
      content: `Perfect — "As ${msg}". Now, what specific capability do they need? What should they be able to do?`,
      storyUpdate: { asA: msg },
      options: story.description ? [
        { label: 'Use my earlier description', value: story.description },
      ] : undefined,
    }),
  },
  {
    trigger: (_, story) => !story.soThat,
    respond: (msg) => ({
      content: `Nice — "I want to ${msg}". What's the value? Why does this matter to the user?`,
      storyUpdate: { iWant: msg },
      options: [
        { label: 'Save time', value: 'I can save time and be more productive' },
        { label: 'Stay informed', value: 'I stay informed about important changes' },
        { label: 'Reduce errors', value: 'I can reduce manual errors' },
      ],
    }),
  },
  {
    trigger: (_, story) => story.acceptanceCriteria.length === 0,
    respond: (msg) => ({
      content: `Great — "So that ${msg}". Now let me suggest some acceptance criteria. Do these look right?\n\n1. ✅ Given a valid input, the system should respond within 2 seconds\n2. ✅ Error states are handled with clear user messaging\n3. ✅ The feature is accessible via keyboard navigation\n\nWant to add, remove, or modify any?`,
      storyUpdate: {
        soThat: msg,
        acceptanceCriteria: [
          'Given a valid input, the system should respond within 2 seconds',
          'Error states are handled with clear user messaging',
          'The feature is accessible via keyboard navigation',
        ],
      },
      options: [
        { label: '✅ These look good', value: 'These acceptance criteria look good' },
        { label: '➕ Add more', value: 'I want to add more acceptance criteria' },
        { label: '✏️ Modify them', value: 'I want to modify the criteria' },
      ],
    }),
  },
  {
    trigger: () => true,
    respond: (msg) => {
      const isPositive = msg.toLowerCase().includes('good') || msg.toLowerCase().includes('look') || msg.toLowerCase().includes('yes');
      if (isPositive) {
        return {
          content: `Excellent! Your story draft looks solid. I'd recommend moving to evaluation to get a quality check. You can always come back and edit.`,
          options: [{ label: '🚀 Ready to evaluate', value: 'evaluate' }],
        };
      }
      return {
        content: `Got it, I've noted that. Anything else you'd like to adjust in the story, or are you ready for evaluation?`,
        storyUpdate: {
          acceptanceCriteria: [
            'Given a valid input, the system should respond within 2 seconds',
            'Error states are handled with clear user messaging',
            'The feature is accessible via keyboard navigation',
            msg,
          ],
        },
        options: [
          { label: '🚀 Ready to evaluate', value: 'evaluate' },
          { label: '✏️ Keep editing', value: 'I want to keep editing' },
        ],
      };
    },
  },
];

export async function mockAIChat(
  userMessage: string,
  currentStory: StoryDraft,
): Promise<ChatMessage> {
  await delay(800 + Math.random() * 600);

  for (const flow of CONVERSATION_FLOWS) {
    if (flow.trigger(userMessage, currentStory)) {
      const result = flow.respond(userMessage, currentStory);
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
    content: 'I\'m not sure I understood. Could you rephrase that?',
  };
}

export async function mockEvaluateStory(story: StoryDraft): Promise<EvaluationResult> {
  await delay(1500);

  const hasAll = Boolean(story.asA && story.iWant && story.soThat);

  return {
    qualityChecks: [
      { label: 'Completeness', passed: hasAll, detail: hasAll ? 'All core fields filled' : 'Missing some story fields' },
      { label: 'Testability', passed: story.acceptanceCriteria.length >= 2, detail: story.acceptanceCriteria.length >= 2 ? 'ACs are specific enough to test' : 'Need more acceptance criteria' },
      { label: 'Clarity', passed: Boolean(story.iWant && story.iWant.length > 10), detail: 'Story intent is clear and unambiguous' },
      { label: 'Specificity', passed: Boolean(story.description), detail: story.description ? 'Description provides adequate detail' : 'Consider adding more context' },
    ],
    suggestions: [
      'Consider adding edge case scenarios to acceptance criteria',
      'Specify performance expectations (response time, throughput)',
      'Add "Given/When/Then" format to acceptance criteria for clarity',
      'Include non-functional requirements if applicable',
    ],
    improvedStory: {
      ...story,
      asA: story.asA || 'a user',
      iWant: story.iWant ? `${story.iWant} with clear feedback at each step` : story.iWant,
      soThat: story.soThat ? `${story.soThat} and have confidence in the system` : story.soThat,
      description: story.description
        ? `${story.description}\n\nThis feature should follow existing UI patterns and be fully responsive. Edge cases should degrade gracefully with informative error messages.`
        : story.description,
      acceptanceCriteria: [
        ...story.acceptanceCriteria,
        'Given an unexpected error, the user sees a friendly message with a retry option',
        'The feature works on mobile viewports (≥320px)',
      ],
    },
    learnings: [
      'Always include error/edge-case acceptance criteria',
      'Specify device/viewport requirements upfront',
      'Use measurable language in acceptance criteria (times, counts, states)',
    ],
  };
}

export async function mockSaveStory(story: StoryDraft): Promise<{ success: boolean }> {
  await delay(500);
  return { success: true };
}
