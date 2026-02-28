// ---------------------------------------------------------------------------
// Shared API types for PO Agent
// ---------------------------------------------------------------------------

export interface ApiError {
  message: string;
  code?: string;
}

// --- Context ---

export interface ValidateContextRequest {
  field: string;
  value: string;
}

export interface ValidateContextResponse {
  pass: boolean;
  reason: string;
}

export interface SaveContextRequest {
  mission: string;
  northStar: string;
  persona: string;
  strategy: string;
  objectives: string;
}

export interface SaveContextResponse {
  contextId: string;
}

export interface UpdateContextRequest {
  contextId: string;
  field: string;
  value: string;
}

export interface UpdateContextResponse {
  success: boolean;
  lastUpdated: string;
}

export interface GetContextResponse {
  contextId: string;
  mission: string;
  northStar: string;
  persona: string;
  strategy: string;
  objectives: string;
  lastUpdated: string;
}

// --- Router ---

export interface RouterRequest {
  message: string;
  contextId?: string;
}

export interface RouterResponse {
  route: "story" | "epic";
  mismatch: boolean;
  mismatchMessage: string;
  classification: "story" | "epic";
  confidence: "high" | "medium" | "low";
  reason: string;
}

// --- Story Agent ---

export interface AcceptanceCriteriaGroup {
  category: string;
  items: string[];
}

export interface StoryDraftPayload {
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  description: string;
  acceptanceCriteria: AcceptanceCriteriaGroup[];
  metadata?: StoryMetadata;
}

export interface StoryMetadata {
  project: string;
  epic: string;
  priority: string;
  estimate: string;
}

export interface StoryAgentOption {
  label: string;
}

export interface StoryAgentRequest {
  contextId: string;
  message: string;
  storyDraft: StoryDraftPayload;
  chatHistory?: Array<{ role: string; content: string }>;
}

export interface StoryAgentResponse {
  message: string;
  options: StoryAgentOption[];
  awaitingCriteriaConfirmation: boolean;
  storyDraft: StoryDraftPayload;
}

// --- Evaluate ---

export interface ScorecardItem {
  framework: string;
  criterion: string;
  result: "PASS" | "FAIL" | "WARN";
  explanation: string;
}

export interface LearningInsight {
  observation: string;
  question: string;
  suggestion: string;
}

export interface NewChecklistRule {
  rule: string;
}

export interface EvaluateRequest {
  contextId: string;
  storyDraft: StoryDraftPayload;
  checklistRules?: string[];
}

export interface EvaluateResponse {
  scorecard: ScorecardItem[];
  overallResult: "PASS" | "FAIL";
  improvedStory: StoryDraftPayload;
  learningInsight: LearningInsight;
  newChecklistRule: NewChecklistRule;
  isLikelyEpic: boolean;
}

// --- Checklist ---

export interface ChecklistItem {
  ruleId: string;
  ruleText: string;
  active: boolean;
  createdAt: string;
}

export interface GetChecklistResponse {
  items: ChecklistItem[];
}

export interface SaveChecklistItemRequest {
  contextId: string;
  ruleText: string;
}

export interface SaveChecklistItemResponse {
  ruleId: string;
  saved: boolean;
}
