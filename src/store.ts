import { create } from 'zustand';

export type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';

interface GameStore {
  state: GameState;
  score: number;
  lives: number;
  level: number;
  setState: (state: GameState) => void;
  setScore: (score: number | ((s: number) => number)) => void;
  setLives: (lives: number | ((l: number) => number)) => void;
  setLevel: (level: number | ((l: number) => number)) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: 'START',
  score: 0,
  lives: 3,
  level: 1,
  setState: (state) => set({ state }),
  setScore: (score) => set((s) => ({ score: typeof score === 'function' ? score(s.score) : score })),
  setLives: (lives) => set((s) => ({ lives: typeof lives === 'function' ? lives(s.lives) : lives })),
  setLevel: (level) => set((s) => ({ level: typeof level === 'function' ? level(s.level) : level })),
  reset: () => set({ state: 'PLAYING', score: 0, lives: 3, level: 1 }),
}));
