export interface ProductContext {
  mission: string;
  northStar: string;
  persona: string;
  strategy: string;
  objectives: string;
}

export interface StoryDraft {
  asA: string;
  iWant: string;
  soThat: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  size: 'XS' | 'S' | 'M' | 'L' | 'XL';
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  options?: OptionTile[];
  storyUpdate?: Partial<StoryDraft>;
}

export interface OptionTile {
  label: string;
  value: string;
}

export interface QualityCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface EvaluationResult {
  qualityChecks: QualityCheck[];
  suggestions: string[];
  improvedStory: StoryDraft;
  learnings: string[];
}

export type WizardStep = 1 | 2 | 3 | 4;

export const EMPTY_STORY: StoryDraft = {
  asA: '',
  iWant: '',
  soThat: '',
  description: '',
  acceptanceCriteria: [],
  priority: 'medium',
  size: 'M',
  tags: [],
};

export const EMPTY_CONTEXT: ProductContext = {
  mission: '',
  northStar: '',
  persona: '',
  strategy: '',
  objectives: '',
};
