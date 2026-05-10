/**
 * Re-exports shared API types used across the wizard UI.
 * UI-only extensions (e.g. WizardStep, UIChatMessage) live here.
 */
import type {
  StoryDraft,
  StoryAcceptanceCriteriaCategory,
  StoryMetadata,
  SaveContextRequest,
  EvaluateResponse,
} from '@/services/types';

// Re-export shared types for convenience
export type {
  StoryDraft,
  StoryAcceptanceCriteriaCategory,
  StoryMetadata,
  SaveContextRequest,
  EvaluateResponse,
};

/** The wizard step numbers */
export type WizardStep = 1 | 2 | 3 | 4;

/**
 * Product context used internally in the wizard (no contextId/lastUpdated
 * until saved via the API).
 */
export type ProductContextInput = SaveContextRequest & {
  acFormat: 'plain' | 'gherkin';
};

/** Inline clarification wizard payload attached to an assistant message. */
export interface UIClarificationQuestion {
  id: string;
  question: string;
  options?: { label: string }[] | null;
  allowFreeText?: boolean;
}

export interface UIWizardState {
  questions: UIClarificationQuestion[];
  answers: Record<string, string>;
  currentIndex: number;
  completed: boolean;
}

/** Chat message with UI extras (id for keys, options for tiles, optional inline wizard). */
export interface UIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  options?: { label: string }[] | null;
  wizard?: UIWizardState | null;
}

/** Empty defaults */
export const EMPTY_STORY: StoryDraft = {
  title: '',
  asA: '',
  iWant: '',
  soThat: '',
  description: '',
  acceptanceCriteria: [],
  metadata: { project: '', epic: '', priority: 'Medium', estimate: '' },
};

export const EMPTY_CONTEXT: ProductContextInput = {
  productName: '',
  industry: '',
  productType: 'b2b',
  platform: 'web',
  userTypes: '',
  productDescription: '',
  mission: '',
  northStar: '',
  persona: '',
  strategy: '',
  objectives: '',
  acFormat: 'plain',
};
