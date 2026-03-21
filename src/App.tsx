/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CyberInvaders, GameState } from './game';
import { initAudio, playStart } from './audio';
import { Star, Heart, Users, Play, Settings, Trophy } from 'lucide-react';

interface HighScore {
  name: string;
  score: number;
  mode: string;
  date: string;
}

const GAME_MODES = [
  { id: 'RETRO', name: "Retro Arcade", desc: "The Classic game. A recreation of the classic alien invaders experience.", difficulty: "Normal" },
  { id: 'SURVIVAL', name: "Survival", desc: "Never ending game. Swarm after swarm, increasingly faster and larger.", difficulty: "Hard" },
  { id: 'KAWAII', name: "Kawaii Arcade", desc: "Fight through UwU swarms across multiple levels with unique bosses.", difficulty: "Progressive" },
];

const KAOMOJI_ROSTER = [
  { id: 'classic', normal: '(*´ω｀)', shoot: '(>ω<)', name: 'Classic' },
  { id: 'flower', normal: '(◕‿◕✿)', shoot: '(✿Ò_Ó)', name: 'Flower' },
  { id: 'cool', normal: '(⌐■_■)', shoot: '(ಠ_ಠ)', name: 'Cool' },
  { id: 'bear', normal: 'ʕ•ᴥ•ʔ', shoot: 'ʕง•ᴥ•ʔง', name: 'Bear' },
  { id: 'cat', normal: '(=^･ω･^=)', shoot: '(=｀ω´=)', name: 'Neko' },
  { id: 'hype', normal: '(ﾉ◕ヮ◕)ﾉ', shoot: '(╯°□°）╯', name: 'Hype' },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [wave, setWave] = useState(1);
  const [selectedChar, setSelectedChar] = useState(KAOMOJI_ROSTER[0]);
  const [selectedModeId, setSelectedModeId] = useState<'RETRO' | 'SURVIVAL' | 'KAWAII'>('KAWAII');
  
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isHighScore, setIsHighScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  
  const gameRef = useRef<CyberInvaders | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cyberInvadersHighScores');
    if (saved) {
      setHighScores(JSON.parse(saved));
    }
  }, []);

  const checkAndSetHighScore = (finalScore: number) => {
    const saved = localStorage.getItem('cyberInvadersHighScores');
    const scores: HighScore[] = saved ? JSON.parse(saved) : [];
    const isTop10 = scores.length < 10 || finalScore > (scores[scores.length - 1]?.score || 0);
    if (isTop10 && finalScore > 0) {
      setIsHighScore(true);
      setScoreSubmitted(false);
      setPlayerName('');
    } else {
      setIsHighScore(false);
    }
  };

  const submitHighScore = () => {
    if (!playerName.trim()) return;
    const newScore: HighScore = {
      name: playerName.trim().substring(0, 10) || 'ANON',
      score: score,
      mode: GAME_MODES.find(m => m.id === selectedModeId)?.name || 'Unknown',
      date: new Date().toLocaleDateString()
    };
    const saved = localStorage.getItem('cyberInvadersHighScores');
    const scores: HighScore[] = saved ? JSON.parse(saved) : [];
    const updatedScores = [...scores, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem('cyberInvadersHighScores', JSON.stringify(updatedScores));
    setHighScores(updatedScores);
    setScoreSubmitted(true);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new CyberInvaders(canvasRef.current);
    game.setPlayerFaces(selectedChar.normal, selectedChar.shoot);
    gameRef.current = game;

    game.onStateChange = (newState) => {
      setGameState(newState);
      if (newState === 'GAMEOVER' || newState === 'VICTORY') {
        checkAndSetHighScore(game.score);
      }
    };
    game.onScoreChange = setScore;
    game.onLivesChange = setLives;
    game.onLevelChange = setLevel;
    game.onWaveChange = setWave;
    game.onLevelComplete = (completedLevel) => {
      setTimeout(() => {
        if (gameRef.current?.gameMode === 'KAWAII' && completedLevel < 9) {
          gameRef.current.setLevel(completedLevel + 1);
        } else {
          setGameState('MODE_SELECT' as GameState);
        }
      }, 3000); // Wait 3 seconds to show fireworks
    };

    game.startLoop();

    return () => {
      game.destroy();
    };
  }, []);

  const handleStart = () => {
    initAudio();
    playStart();
    gameRef.current?.startGame();
  };

  return (
    <div className="relative w-screen h-screen bg-[#1a1025] flex items-center justify-center overflow-hidden">
      {/* CRT Overlay */}
      <div className="crt-overlay"></div>

      {/* Game Container */}
      <div className="relative border-2 border-pastel-purple p-1 rounded-2xl bg-[#1a1025]">
        
        {/* HUD */}
        {gameState !== 'START' && (
          <div className="absolute top-4 left-4 right-4 flex justify-between text-xl z-10 pointer-events-none">
            <div className="text-pastel-pink">SCORE: {score.toString().padStart(6, '0')}</div>
            <div className="text-pastel-blue">
              {selectedModeId === 'SURVIVAL' ? `WAVE: ${wave}` : `LEVEL: ${level}`}
            </div>
            <div className="text-pastel-purple">LIVES: {'❤'.repeat(lives)}</div>
          </div>
        )}

        {/* Canvas */}
        <canvas 
          ref={canvasRef} 
          className="bg-[#1a1025] block rounded-xl"
          style={{ width: '800px', height: '600px', maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }}
        />

        {/* Start Screen Overlay */}
        {gameState === 'START' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl">
            <div className="flex flex-col items-center mb-6 title-container">
              <h1 className="text-6xl md:text-8xl font-bold title-uwu leading-none tracking-widest">
                UWU
              </h1>
              <h1 className="text-5xl md:text-7xl font-bold title-invaders leading-none tracking-widest">
                INVADERS
              </h1>
            </div>
            <p className="text-pastel-blue text-xl mb-6 animate-pulse tracking-widest font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-shadow-sm">PRESS START TO PLAY ~</p>
            <div className="flex flex-col gap-4 w-full max-w-md px-4">
              <button 
                onClick={() => {
                  initAudio();
                  playStart();
                  setGameState('PLAYER_SELECT');
                }}
                className="kawaii-button kawaii-button-pink w-full py-3 text-2xl md:text-3xl text-white uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-4 drop-shadow-md"
              >
                <Play className="star-icon w-8 h-8 fill-current" />
                START
                <Play className="star-icon w-8 h-8 fill-current" />
              </button>
              <button 
                onClick={() => {
                  initAudio();
                  playStart();
                  setGameState('HIGH_SCORES');
                }}
                className="kawaii-button kawaii-button-purple w-full py-3 text-2xl md:text-3xl text-white uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-4 drop-shadow-md"
              >
                <Trophy className="w-8 h-8 fill-current" />
                HIGH SCORES
                <Trophy className="w-8 h-8 fill-current" />
              </button>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2 text-pastel-purple/80 text-xl tracking-widest">
              <p>ARROWS / A D : Move</p>
              <p>SPACE : Fire</p>
            </div>
          </div>
        )}

        {/* Mode Select Overlay */}
        {gameState === 'MODE_SELECT' && (
          <div className="absolute inset-0 bg-[#1a1025]/95 z-20 rounded-xl overflow-hidden flex flex-col items-center justify-start p-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 kawaii-text text-pastel-pink">GAME SETUP</h2>
            <p className="text-pastel-blue mb-8 tracking-widest uppercase text-sm">Select your game style & difficulty</p>
            
            <div className="w-full max-w-4xl flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-24">
                {GAME_MODES.map((mode) => {
                  const isSelected = selectedModeId === mode.id;
                  
                  let difficultyColor = "text-pastel-blue";
                  if (mode.difficulty === "Normal") difficultyColor = "text-pastel-purple";
                  if (mode.difficulty === "Hard") difficultyColor = "text-pastel-pink";
                  if (mode.difficulty === "Progressive") difficultyColor = "text-yellow-400";

                  return (
                    <div 
                      key={mode.id}
                      onClick={() => setSelectedModeId(mode.id as 'RETRO' | 'SURVIVAL' | 'KAWAII')}
                      className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 flex flex-col gap-3
                        ${isSelected 
                          ? 'bg-[#2a1b3d] border-pastel-pink shadow-[0_0_20px_rgba(255,179,240,0.4)] transform scale-105 z-10' 
                          : 'bg-[#1a1025] border-slate-700 hover:border-pastel-purple hover:bg-[#201530]'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {mode.name}
                        </h3>
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/30 border border-white/10 ${difficultyColor}`}>
                          {mode.difficulty}
                        </span>
                      </div>
                      <p className="text-base text-slate-400 mt-2 leading-relaxed">{mode.desc}</p>
                      
                      {isSelected && (
                        <div className="absolute -inset-1 border border-pastel-pink rounded-2xl animate-ping opacity-20 pointer-events-none"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Play Button */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-2xl px-4 flex gap-4">
              <button 
                onClick={() => setGameState('PLAYER_SELECT')}
                className="kawaii-button kawaii-button-purple flex-1 py-4 text-2xl text-white uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 drop-shadow-xl"
              >
                BACK
              </button>
              <button 
                onClick={() => {
                  playStart();
                  gameRef.current?.setGameMode(selectedModeId);
                  gameRef.current?.startGame();
                }}
                className="kawaii-button kawaii-button-pink flex-1 py-4 text-2xl text-white uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 drop-shadow-xl"
              >
                <Play className="w-6 h-6 fill-current" />
                START MISSION
              </button>
            </div>
          </div>
        )}

        {/* Character Select Overlay */}
        {gameState === 'PLAYER_SELECT' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/95 z-30 rounded-xl p-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 kawaii-text text-pastel-pink">CHOOSE YOUR FIGHTER</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
              {KAOMOJI_ROSTER.map(char => (
                <button
                  key={char.id}
                  onClick={() => {
                    setSelectedChar(char);
                    gameRef.current?.setPlayerFaces(char.normal, char.shoot);
                  }}
                  className={`capsule-pod relative p-4 rounded-3xl flex flex-col items-center gap-2 ${
                    selectedChar.id === char.id ? 'selected' : ''
                  }`}
                >
                  {selectedChar.id === char.id && (
                    <div className="orbiting-hearts">
                      <Heart className="orbit-heart text-pastel-pink w-4 h-4 fill-current" style={{ top: '-10px', left: '50%', marginLeft: '-8px' }} />
                      <Heart className="orbit-heart text-pastel-blue w-4 h-4 fill-current" style={{ bottom: '-10px', left: '50%', marginLeft: '-8px' }} />
                    </div>
                  )}
                  <div className="text-3xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{char.normal}</div>
                  <div className="text-pastel-blue text-base font-bold uppercase tracking-widest">{char.name}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-6 w-full max-w-md">
              <button 
                onClick={() => gameRef.current?.goToMenu()}
                className="kawaii-button kawaii-button-purple flex-1 py-3 text-2xl text-white border-2 border-white/50 rounded-full font-bold"
              >
                BACK
              </button>
              <button 
                onClick={() => setGameState('MODE_SELECT')}
                className="kawaii-button kawaii-button-pink flex-1 py-3 text-2xl text-white border-2 border-white/50 rounded-full font-bold"
              >
                NEXT
              </button>
            </div>
          </div>
        )}

        {/* High Scores Overlay */}
        {gameState === 'HIGH_SCORES' && (
          <div className="absolute inset-0 flex flex-col items-center justify-start bg-[#1a1025]/95 z-30 rounded-xl p-8 overflow-y-auto custom-scrollbar">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 kawaii-text text-pastel-pink flex items-center gap-4">
              <Trophy className="w-10 h-10 text-yellow-400" />
              HIGH SCORES
              <Trophy className="w-10 h-10 text-yellow-400" />
            </h2>
            <div className="w-full max-w-2xl space-y-3 mb-12">
              {highScores.length === 0 ? (
                <p className="text-center text-pastel-blue text-xl py-8">No scores yet. Be the first!</p>
              ) : (
                highScores.map((hs, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#2a1b3d] p-4 rounded-2xl border-2 border-pastel-purple/50">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-pastel-pink w-8">{i + 1}.</span>
                      <span className="text-2xl font-bold text-white uppercase">{hs.name}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="text-sm text-pastel-blue uppercase tracking-widest">{hs.mode}</span>
                      <span className="text-3xl font-black text-yellow-400">{hs.score.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => gameRef.current?.goToMenu()}
              className="kawaii-button kawaii-button-purple px-12 py-4 text-2xl text-white border-2 border-white/50 rounded-full font-bold"
            >
              MAIN MENU
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl">
            <h1 className="text-7xl font-bold mb-12 kawaii-text text-pastel-pink tracking-widest" data-text="PAUSED">
              PAUSED
            </h1>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={() => gameRef.current?.togglePause()}
                className="kawaii-button kawaii-button-pink w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6 fill-current" />
                RESUME
              </button>
              <button 
                onClick={() => {
                  gameRef.current?.goToMenu();
                }}
                className="kawaii-button kawaii-button-purple w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {/* Victory Overlay */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl">
            <h1 className="text-7xl font-bold mb-4 kawaii-text text-pastel-pink" data-text="LEVEL CLEARED!">
              LEVEL CLEARED!
            </h1>
            <p className="text-pastel-purple text-3xl mb-8">SCORE: {score}</p>
            
            {isHighScore && !scoreSubmitted ? (
              <div className="bg-[#2a1b3d] p-6 rounded-3xl border-4 border-yellow-400/50 mb-8 flex flex-col items-center gap-4">
                <h3 className="text-2xl font-bold text-yellow-400">NEW HIGH SCORE!</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                    placeholder="ENTER NAME"
                    className="bg-[#1a1025] border-2 border-pastel-pink rounded-xl px-4 py-3 text-white font-bold text-xl text-center outline-none focus:border-pastel-blue uppercase w-48"
                  />
                  <button
                    onClick={submitHighScore}
                    disabled={!playerName.trim()}
                    className="kawaii-button kawaii-button-pink px-6 font-bold rounded-xl disabled:opacity-50"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            ) : scoreSubmitted ? (
               <div className="bg-[#2a1b3d] p-4 rounded-2xl border-2 border-green-400 mb-8 text-green-400 font-bold text-xl">
                 SCORE SAVED!
               </div>
            ) : null}

            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={handleStart}
                className="kawaii-button kawaii-button-pink w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6 fill-current" />
                PLAY AGAIN
              </button>
              <button 
                onClick={() => gameRef.current?.goToMenu()}
                className="kawaii-button kawaii-button-purple w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl">
            <h1 className="text-7xl font-bold mb-4 kawaii-text text-pastel-pink" data-text="OH NOES! ;w;">
              OH NOES! ;w;
            </h1>
            <p className="text-pastel-purple text-3xl mb-8">FINAL SCORE: {score}</p>
            
            {isHighScore && !scoreSubmitted ? (
              <div className="bg-[#2a1b3d] p-6 rounded-3xl border-4 border-yellow-400/50 mb-8 flex flex-col items-center gap-4">
                <h3 className="text-2xl font-bold text-yellow-400">NEW HIGH SCORE!</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                    placeholder="ENTER NAME"
                    className="bg-[#1a1025] border-2 border-pastel-pink rounded-xl px-4 py-3 text-white font-bold text-xl text-center outline-none focus:border-pastel-blue uppercase w-48"
                  />
                  <button
                    onClick={submitHighScore}
                    disabled={!playerName.trim()}
                    className="kawaii-button kawaii-button-pink px-6 font-bold rounded-xl disabled:opacity-50"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            ) : scoreSubmitted ? (
               <div className="bg-[#2a1b3d] p-4 rounded-2xl border-2 border-green-400 mb-8 text-green-400 font-bold text-xl">
                 SCORE SAVED!
               </div>
            ) : null}

            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={handleStart}
                className="kawaii-button kawaii-button-pink w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3"
              >
                <Heart className="heart-icon w-8 h-8 fill-current" />
                TRY AGAIN
                <Heart className="heart-icon w-8 h-8 fill-current" />
              </button>
              <button 
                onClick={() => gameRef.current?.goToMenu()}
                className="kawaii-button kawaii-button-purple w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
