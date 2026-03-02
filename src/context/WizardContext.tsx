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
  dbSessionId: string | null;
  story: StoryDraft;
  chatHistory: UIChatMessage[];
  evaluation: EvaluateResponse | null;
  savedStories: StoryDraft[];
  splitStories: StoryDraft[];
  activeSplitIndex: number;
  epicSummary: string | null;
  pendingSplitStories: StoryDraft[];
  sidebarRefreshKey: number;
}

interface WizardActions {
  setStep: (step: WizardStep) => void;
  setProductContext: (ctx: ProductContextInput) => void;
  setContextId: (id: string) => void;
  updateStory: (update: Partial<StoryDraft>) => void;
  setStory: (story: StoryDraft) => void;
  addMessage: (msg: UIChatMessage) => void;
  setChatHistory: (msgs: UIChatMessage[]) => void;
  setDbSessionId: (id: string | null) => void;
  setEvaluation: (result: EvaluateResponse | null) => void;
  saveStory: (story: StoryDraft) => void;
  resetStory: () => void;
  setSplitStories: (stories: StoryDraft[]) => void;
  setActiveSplitIndex: (index: number) => void;
  updateSplitStory: (index: number, update: Partial<StoryDraft>) => void;
  setEpicSummary: (summary: string | null) => void;
  clearSplit: () => void;
  removeSplitStory: (index: number) => void;
  setPendingSplitStories: (stories: StoryDraft[]) => void;
  confirmSplitStories: (indices: number[]) => void;
  clearPendingSplit: () => void;
  triggerSidebarRefresh: () => void;
}

const WizardContext = createContext<(WizardState & WizardActions) | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [productContext, setProductContext] = useState<ProductContextInput>(EMPTY_CONTEXT);
  const [contextId, setContextId] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID?.() ?? `${Date.now()}`);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [story, setStoryState] = useState<StoryDraft>(EMPTY_STORY);
  const [chatHistory, setChatHistory] = useState<UIChatMessage[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);
  const [savedStories, setSavedStories] = useState<StoryDraft[]>([]);
  const [splitStories, setSplitStoriesState] = useState<StoryDraft[]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState(0);
  const [epicSummary, setEpicSummary] = useState<string | null>(null);
  const [pendingSplitStories, setPendingSplitStoriesState] = useState<StoryDraft[]>([]);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const triggerSidebarRefresh = useCallback(() => {
    setSidebarRefreshKey(prev => prev + 1);
  }, []);

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
    setSplitStoriesState([]);
    setActiveSplitIndex(0);
    setEpicSummary(null);
    setStep(2);
  }, []);

  const setSplitStories = useCallback((stories: StoryDraft[]) => {
    setSplitStoriesState(stories);
    setActiveSplitIndex(0);
  }, []);

  const updateSplitStory = useCallback((index: number, update: Partial<StoryDraft>) => {
    setSplitStoriesState(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  }, []);

  const clearSplit = useCallback(() => {
    setSplitStoriesState([]);
    setActiveSplitIndex(0);
    setEpicSummary(null);
  }, []);

  const removeSplitStory = useCallback((index: number) => {
    setSplitStoriesState(prev => prev.filter((_, i) => i !== index));
    setActiveSplitIndex(prev => Math.min(prev, Math.max(0, splitStories.length - 2)));
  }, [splitStories.length]);

  const setPendingSplitStories = useCallback((stories: StoryDraft[]) => {
    setPendingSplitStoriesState(stories);
  }, []);

  const confirmSplitStories = useCallback((indices: number[]) => {
    setPendingSplitStoriesState(prev => {
      const selected = indices.map(i => prev[i]).filter(Boolean).map(s => ({
        ...s,
        metadata: {
          ...s.metadata,
          epic: s.metadata?.epic || story.title || 'Untitled Epic',
        },
      }));
      setSplitStoriesState(selected);
      setActiveSplitIndex(0);
      return [];
    });
  }, [story.title]);

  const clearPendingSplit = useCallback(() => {
    setPendingSplitStoriesState([]);
  }, []);

  return (
    <WizardContext.Provider
      value={{
        step, setStep,
        productContext, setProductContext,
        contextId, setContextId,
        sessionId, dbSessionId, setDbSessionId,
        story, updateStory, setStory,
        chatHistory, addMessage, setChatHistory,
        evaluation, setEvaluation,
        savedStories, saveStory,
        resetStory,
        splitStories, setSplitStories,
        activeSplitIndex, setActiveSplitIndex,
        updateSplitStory, clearSplit,
        epicSummary, setEpicSummary,
        removeSplitStory,
        pendingSplitStories, setPendingSplitStories,
        confirmSplitStories, clearPendingSplit,
        sidebarRefreshKey, triggerSidebarRefresh,
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
