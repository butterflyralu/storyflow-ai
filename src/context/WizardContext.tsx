import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  WizardStep,
  ProductContext,
  StoryDraft,
  ChatMessage,
  EvaluationResult,
  EMPTY_STORY,
  EMPTY_CONTEXT,
} from '@/types/wizard';

interface WizardState {
  step: WizardStep;
  productContext: ProductContext;
  story: StoryDraft;
  chatHistory: ChatMessage[];
  evaluation: EvaluationResult | null;
  savedStories: StoryDraft[];
}

interface WizardActions {
  setStep: (step: WizardStep) => void;
  setProductContext: (ctx: ProductContext) => void;
  updateStory: (update: Partial<StoryDraft>) => void;
  setStory: (story: StoryDraft) => void;
  addMessage: (msg: ChatMessage) => void;
  setEvaluation: (result: EvaluationResult | null) => void;
  saveStory: (story: StoryDraft) => void;
  resetStory: () => void;
}

const WizardContext = createContext<(WizardState & WizardActions) | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [productContext, setProductContext] = useState<ProductContext>(EMPTY_CONTEXT);
  const [story, setStoryState] = useState<StoryDraft>(EMPTY_STORY);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [savedStories, setSavedStories] = useState<StoryDraft[]>([]);

  const updateStory = useCallback((update: Partial<StoryDraft>) => {
    setStoryState(prev => ({ ...prev, ...update }));
  }, []);

  const setStory = useCallback((s: StoryDraft) => setStoryState(s), []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
    if (msg.storyUpdate) {
      setStoryState(prev => ({ ...prev, ...msg.storyUpdate }));
    }
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
