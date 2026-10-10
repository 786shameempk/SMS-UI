import { create } from "zustand";

interface TourState {
  tourId: string | null;
  step: number;
  start: (tourId: string) => void;
  go: (step: number) => void;
  stop: () => void;
}

/** Which walkthrough is running and on which step. Lives outside the pages, so it survives moving from the Help Center to the screen. */
export const useTour = create<TourState>()((set) => ({
  tourId: null,
  step: 0,
  start: (tourId) => set({ tourId, step: 0 }),
  go: (step) => set({ step }),
  stop: () => set({ tourId: null, step: 0 }),
}));
