import { create } from 'zustand';

export type GameState = 'START' | 'PLAYER_SELECT' | 'MODE_SELECT' | 'HIGH_SCORES' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

interface GameStore {
  state: GameState;
  score: number;
  lives: number;
  level: number;
  wave: number;
  bossActive: boolean;
  gameMode: 'CLASSIC' | 'RETROWO' | 'SURVIVAL' | 'KAWAII';
  
  setState: (state: GameState) => void;
  setScore: (score: number | ((s: number) => number)) => void;
  setLives: (lives: number | ((l: number) => number)) => void;
  setLevel: (level: number | ((l: number) => number)) => void;
  setWave: (wave: number | ((w: number) => number)) => void;
  setBossActive: (active: boolean) => void;
  setGameMode: (mode: 'CLASSIC' | 'RETROWO' | 'SURVIVAL' | 'KAWAII') => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: 'START',
  score: 0,
  lives: 3,
  level: 1,
  wave: 1,
  bossActive: false,
  gameMode: 'KAWAII',
  
  setState: (state) => set({ state }),
  setScore: (score) => set((s) => ({ score: typeof score === 'function' ? score(s.score) : score })),
  setLives: (lives) => set((s) => ({ lives: typeof lives === 'function' ? lives(s.lives) : lives })),
  setLevel: (level) => set((s) => ({ level: typeof level === 'function' ? level(s.level) : level })),
  setWave: (wave) => set((s) => ({ wave: typeof wave === 'function' ? wave(s.wave) : wave })),
  setBossActive: (bossActive) => set({ bossActive }),
  setGameMode: (gameMode) => set({ gameMode }),
  reset: () => set({ state: 'PLAYING', score: 0, lives: 3, level: 1, wave: 1, bossActive: false }),
}));
