import React, { createContext, useContext, useState, useCallback } from 'react';
import type { StoryDraft, EvaluateResponse } from '@/services/types';
import {
  WizardStep,
  ProductContextInput,
  UIChatMessage,
  EMPTY_STORY,
  EMPTY_CONTEXT,
} from '@/types/wizard';

interface WizardState {
  step: WizardStep;
  productContext: ProductContextInput;
  contextId: string | null;
  sessionId: string;
  story: StoryDraft;
  chatHistory: UIChatMessage[];
  evaluation: EvaluateResponse | null;
  savedStories: StoryDraft[];
}

interface WizardActions {
  setStep: (step: WizardStep) => void;
  setProductContext: (ctx: ProductContextInput) => void;
  setContextId: (id: string) => void;
  updateStory: (update: Partial<StoryDraft>) => void;
  setStory: (story: StoryDraft) => void;
  addMessage: (msg: UIChatMessage) => void;
  setEvaluation: (result: EvaluateResponse | null) => void;
  saveStory: (story: StoryDraft) => void;
  resetStory: () => void;
}

const WizardContext = createContext<(WizardState & WizardActions) | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [productContext, setProductContext] = useState<ProductContextInput>(EMPTY_CONTEXT);
  const [contextId, setContextId] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID?.() ?? `${Date.now()}`);
  const [story, setStoryState] = useState<StoryDraft>(EMPTY_STORY);
  const [chatHistory, setChatHistory] = useState<UIChatMessage[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);
  const [savedStories, setSavedStories] = useState<StoryDraft[]>([]);

  const updateStory = useCallback((update: Partial<StoryDraft>) => {
    setStoryState(prev => ({ ...prev, ...update }));
  }, []);

  const setStory = useCallback((s: StoryDraft) => setStoryState(s), []);

  const addMessage = useCallback((msg: UIChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  }, []);

  const saveStory = useCallback((s: StoryDraft) => {
    setSavedStories(prev => [...prev, s]);
  }, []);

  const resetStory = useCallback(() => {
    setStoryState(EMPTY_STORY);
    setChatHistory([]);
    setEvaluation(null);
    setStep(2);
  }, []);

  return (
    <WizardContext.Provider
      value={{
        step, setStep,
        productContext, setProductContext,
        contextId, setContextId,
        sessionId,
        story, updateStory, setStory,
        chatHistory, addMessage,
        evaluation, setEvaluation,
        savedStories, saveStory,
        resetStory,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be inside WizardProvider');
  return ctx;
}
