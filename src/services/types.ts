export type UUID = string;

export type ISODateString = string;

export type ApiErrorCode =
  | "missing_context"
  | "context_not_found"
  | "validation_error"
  | "internal_error";

export interface ApiError {
  error: ApiErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProductContext {
  contextId: UUID;
  mission: string;
  northStar: string;
  persona: string;
  strategy: string;
  objectives: string;
  lastUpdated: ISODateString;
}

export type ContextField =
  | "mission"
  | "northStar"
  | "persona"
  | "strategy"
  | "objectives";

export interface ValidateContextRequest {
  field: ContextField;
  value: string;
  allContext: Omit<ProductContext, "contextId" | "lastUpdated">;
}

export interface ValidateContextResponse {
  pass: boolean;
  reason: string;
}

export type ProductType = 'b2b' | 'b2c' | 'enterprise' | 'internal';
export type Platform = 'web' | 'mobile' | 'both';

export interface SaveContextRequest {
  productName: string;
  industry: string;
  productType: ProductType;
  platform: Platform;
  userTypes: string;
  productDescription: string;
  mission: string;
  northStar: string;
  persona: string;
  strategy: string;
  objectives: string;
}

export interface SaveContextResponse {
  contextId: UUID;
}

export interface UpdateContextRequest extends SaveContextRequest {
  contextId: UUID;
}

export interface UpdateContextResponse {
  success: boolean;
  lastUpdated: ISODateString;
}

export interface GetContextResponse extends ProductContext {}

export type RouterTrigger = "entry" | "post-eval";
export type RouteType = "epic" | "story";
export type Confidence = "high" | "low";

export interface RouterRequest {
  message: string;
  contextId: UUID;
  trigger: RouterTrigger;
}

export interface RouterResponse {
  route: RouteType;
  mismatch: boolean;
  mismatchMessage: string;
  classification: RouteType;
  confidence: Confidence;
  reason: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface StoryMetadata {
  project: string;
  epic: string;
  priority: string;
  estimate: string;
}

export interface StoryAcceptanceCriteriaCategory {
  category: string;
  items: string[];
}

export interface StoryDraft {
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  description: string;
  acceptanceCriteria: StoryAcceptanceCriteriaCategory[];
  metadata: StoryMetadata;
}

export interface StoryAgentContext {
  productName?: string;
  industry?: string;
  productType?: string;
  platform?: string;
  userTypes?: string;
  productDescription?: string;
  mission: string;
  persona: string;
  strategy: string;
  northStar: string;
  objectives: string;
  acFormat?: 'plain' | 'gherkin';
}

export interface StoryAgentRequest {
  message: string;
  sessionId: UUID;
  contextId: UUID;
  agentContext: StoryAgentContext;
  history: ChatMessage[];
  storyDraft: StoryDraft;
}

export interface StoryAgentOption {
  label: string;
}

export interface StoryAgentResponse {
  message: string;
  options: StoryAgentOption[] | null;
  awaitingCriteriaConfirmation: boolean;
  storyDraft: StoryDraft;
}

export type ScoreResult = "PASS" | "FAIL";
export type OverallResult = "PASS" | "FAIL";

export interface EvaluationScorecardItem {
  framework: "INVEST" | "DoR" | "CustomerRules";
  criterion: string;
  result: ScoreResult;
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
  sessionId: UUID;
  contextId: UUID;
  story: StoryDraft;
}

export interface EvaluateResponse {
  scorecard: EvaluationScorecardItem[];
  overallResult: OverallResult;
  improvedStory: StoryDraft;
  learningInsight: LearningInsight;
  newChecklistRule: NewChecklistRule | null;
  isLikelyEpic: boolean;
}

export interface ChecklistItem {
  ruleId: UUID;
  ruleText: string;
  active: boolean;
  createdAt: ISODateString;
}

export interface GetChecklistResponse {
  items: ChecklistItem[];
}

export interface SaveChecklistItemRequest {
  contextId: UUID;
  rule: string;
}

export interface SaveChecklistItemResponse {
  ruleId: UUID;
  saved: boolean;
}
