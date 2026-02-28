import {
  ApiError,
  EvaluateRequest,
  EvaluateResponse,
  GetChecklistResponse,
  GetContextResponse,
  RouterRequest,
  RouterResponse,
  SaveChecklistItemRequest,
  SaveChecklistItemResponse,
  SaveContextRequest,
  SaveContextResponse,
  StoryAgentRequest,
  StoryAgentResponse,
  UpdateContextRequest,
  UpdateContextResponse,
  ValidateContextRequest,
  ValidateContextResponse,
} from "./types";

const USE_MOCKS = true;

// Replace with your n8n webhook base URL when ready.
const API_BASE_URL = "https://your-n8n-domain/webhook";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function randomId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = json as ApiError;
    throw new Error(err.message || `Request failed: ${response.status}`);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Mock implementations
// ---------------------------------------------------------------------------

async function mockValidateContext(
  input: ValidateContextRequest,
): Promise<ValidateContextResponse> {
  await sleep(600);
  const tooShort = input.value.trim().length < 12;
  return tooShort
    ? { pass: false, reason: "Please be more specific and concrete." }
    : { pass: true, reason: "Looks specific enough for now." };
}

async function mockSaveContext(
  _input: SaveContextRequest,
): Promise<SaveContextResponse> {
  await sleep(700);
  return { contextId: randomId() };
}

async function mockUpdateContext(
  _input: UpdateContextRequest,
): Promise<UpdateContextResponse> {
  await sleep(500);
  return { success: true, lastUpdated: nowIso() };
}

async function mockGetContext(contextId: string): Promise<GetContextResponse> {
  await sleep(500);
  if (!contextId) {
    throw new Error("No contextId provided.");
  }

  return {
    contextId,
    mission: "Help product teams write better stories faster.",
    northStar: "Increase accepted stories by 30% in 6 months.",
    persona: "Busy Product Owner in a SaaS team.",
    strategy: "Conversation-led drafting with quality guardrails.",
    objectives: "Reduce ambiguity and improve dev handoff quality.",
    lastUpdated: nowIso(),
  };
}

async function mockRouteInput(input: RouterRequest): Promise<RouterResponse> {
  await sleep(450);
  const text = input.message.toLowerCase();
  const epicHints = ["platform", "onboarding", "multiple", "several", "end-to-end"];
  const isEpic = epicHints.some((hint) => text.includes(hint));

  return {
    route: isEpic ? "epic" : "story",
    mismatch: isEpic,
    mismatchMessage: isEpic
      ? "This may span multiple stories. Start with an epic?"
      : "",
    classification: isEpic ? "epic" : "story",
    confidence: "high",
    reason: isEpic ? "Broad multi-scope intent detected." : "Single interaction scope.",
  };
}

async function mockStoryAgent(
  input: StoryAgentRequest,
): Promise<StoryAgentResponse> {
  await sleep(900);

  const nextDraft = {
    ...input.storyDraft,
    title: input.storyDraft.title || "Reset password with secure email link",
    asA: input.storyDraft.asA || "Registered user",
    iWant: input.storyDraft.iWant || "to reset my password securely",
    soThat: input.storyDraft.soThat || "I can regain access without support",
    description:
      input.storyDraft.description ||
      "User can request a password reset from login. A secure email link enables password change with clear success and failure feedback.",
    acceptanceCriteria:
      input.storyDraft.acceptanceCriteria.length > 0
        ? input.storyDraft.acceptanceCriteria
        : [
            {
              category: "Happy path",
              items: [
                "Given a registered email, when reset is requested, then a single-use link is sent.",
                "Given a valid link, when a compliant new password is submitted, then login succeeds with the new password.",
              ],
            },
            {
              category: "Error handling",
              items: [
                "Given an unknown email, then response is generic and does not disclose account existence.",
                "Given an expired or used link, then user sees clear recovery guidance.",
              ],
            },
          ],
  };

  const askForConfirmation = nextDraft.acceptanceCriteria.length > 0;

  return {
    message: askForConfirmation
      ? "I drafted acceptance criteria. Do these look complete before evaluation?"
      : "Let's clarify one thing first: should reset use email link or OTP?",
    options: askForConfirmation
      ? [{ label: "Yes, looks good" }, { label: "I want to change something" }]
      : [{ label: "Email link reset" }, { label: "OTP code reset" }],
    awaitingCriteriaConfirmation: askForConfirmation,
    storyDraft: nextDraft,
  };
}

async function mockEvaluateStory(_input: EvaluateRequest): Promise<EvaluateResponse> {
  await sleep(1200);

  return {
    scorecard: [
      {
        framework: "INVEST",
        criterion: "Valuable",
        result: "FAIL",
        explanation: "The 'so that' clause is vague — specify the measurable user outcome.",
      },
      {
        framework: "INVEST",
        criterion: "Testable",
        result: "FAIL",
        explanation: "Acceptance criteria lack measurable pass/fail outcomes for token expiry.",
      },
      {
        framework: "INVEST",
        criterion: "Independent",
        result: "PASS",
        explanation: "Story is self-contained and can be delivered without dependencies.",
      },
      {
        framework: "DoR",
        criterion: "Small",
        result: "PASS",
        explanation: "Story scope fits within a single sprint.",
      },
    ],
    overallResult: "FAIL",
    improvedStory: {
      title: "Reset password with secure email link",
      asA: "Registered user",
      iWant: "to reset my forgotten password via secure email link",
      soThat: "I can quickly regain account access",
      description:
        "From the login screen, a user can request password reset. The system sends a single-use link that expires after a defined window and confirms successful reset.",
      acceptanceCriteria: [
        {
          category: "Security",
          items: [
            "Reset token is single-use and expires after 30 minutes.",
            "Token is invalidated immediately after successful reset.",
          ],
        },
        {
          category: "User flow",
          items: [
            "User receives confirmation when reset email is sent.",
            "User receives clear success message and can log in with new password.",
          ],
        },
      ],
      metadata: {
        project: "",
        epic: "",
        priority: "High",
        estimate: "3",
      },
    },
    learningInsight: {
      observation: "Teams often miss explicit token expiry in auth stories.",
      question: "Do you want expiry duration standardized across auth flows?",
      suggestion: "Add a reusable checklist rule for token lifespan clarity.",
    },
    newChecklistRule: {
      rule: "Always specify token expiry and invalidation behavior in auth stories.",
    },
    isLikelyEpic: false,
  };
}

async function mockGetChecklist(_contextId: string): Promise<GetChecklistResponse> {
  await sleep(400);
  return {
    items: [
      {
        ruleId: randomId(),
        ruleText: "Always include explicit failure behavior in AC.",
        active: true,
        createdAt: nowIso(),
      },
    ],
  };
}

async function mockSaveChecklistItem(
  _input: SaveChecklistItemRequest,
): Promise<SaveChecklistItemResponse> {
  await sleep(350);
  return {
    ruleId: randomId(),
    saved: true,
  };
}

// ---------------------------------------------------------------------------
// Public API object
// ---------------------------------------------------------------------------

export const api = {
  validateContext(input: ValidateContextRequest): Promise<ValidateContextResponse> {
    if (USE_MOCKS) return mockValidateContext(input);
    return request<ValidateContextResponse>("/validate-context", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  saveContext(input: SaveContextRequest): Promise<SaveContextResponse> {
    if (USE_MOCKS) return mockSaveContext(input);
    return request<SaveContextResponse>("/save-context", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateContext(input: UpdateContextRequest): Promise<UpdateContextResponse> {
    if (USE_MOCKS) return mockUpdateContext(input);
    return request<UpdateContextResponse>("/update-context", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getContext(contextId: string): Promise<GetContextResponse> {
    if (USE_MOCKS) return mockGetContext(contextId);
    return request<GetContextResponse>(
      `/get-context?contextId=${encodeURIComponent(contextId)}`,
      { method: "GET" },
    );
  },

  routeInput(input: RouterRequest): Promise<RouterResponse> {
    if (USE_MOCKS) return mockRouteInput(input);
    return request<RouterResponse>("/router", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  storyAgent(input: StoryAgentRequest): Promise<StoryAgentResponse> {
    if (USE_MOCKS) return mockStoryAgent(input);
    return request<StoryAgentResponse>("/story-agent", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  evaluateStory(input: EvaluateRequest): Promise<EvaluateResponse> {
    if (USE_MOCKS) return mockEvaluateStory(input);
    return request<EvaluateResponse>("/evaluate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getChecklist(contextId: string): Promise<GetChecklistResponse> {
    if (USE_MOCKS) return mockGetChecklist(contextId);
    return request<GetChecklistResponse>(
      `/get-checklist?contextId=${encodeURIComponent(contextId)}`,
      { method: "GET" },
    );
  },

  saveChecklistItem(
    input: SaveChecklistItemRequest,
  ): Promise<SaveChecklistItemResponse> {
    if (USE_MOCKS) return mockSaveChecklistItem(input);
    return request<SaveChecklistItemResponse>("/save-checklist-item", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
