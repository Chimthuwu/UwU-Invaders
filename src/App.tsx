/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CyberInvaders, GameState } from './game';
import { initAudio, playStart, playBackgroundMusic, stopBackgroundMusic, toggleMute, getIsMuted } from './audio';
import { Star, Heart, Users, Play, Settings, Trophy, Volume2, VolumeX, ChevronLeft, ChevronRight, Crosshair, Maximize, Minimize } from 'lucide-react';

interface HighScore {
  name: string;
  score: number;
  mode: string;
  date: string;
}

const GAME_MODES = [
  { id: 'CLASSIC', name: "Classic Arcade", desc: "The original retro experience with a modern holographic twist.", difficulty: "Normal" },
  { id: 'RETROWO', name: "Retrowo Arcade", desc: "A recreation of the classic alien invaders experience with neon green UwU faces.", difficulty: "Normal" },
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
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [wave, setWave] = useState(1);
  const [selectedChar, setSelectedChar] = useState(KAOMOJI_ROSTER[0]);
  const [selectedModeId, setSelectedModeId] = useState<'CLASSIC' | 'RETROWO' | 'SURVIVAL' | 'KAWAII'>('KAWAII');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isHighScore, setIsHighScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const [isMuted, setIsMuted] = useState(getIsMuted());
  const gameRef = useRef<CyberInvaders | null>(null);
  const prevGameStateRef = useRef<GameState>(gameState);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const updateTouchMode = () => {
      setIsTouchDevice(mediaQuery.matches || navigator.maxTouchPoints > 0);
    };

    updateTouchMode();
    mediaQuery.addEventListener?.('change', updateTouchMode);
    window.addEventListener('resize', updateTouchMode);

    return () => {
      mediaQuery.removeEventListener?.('change', updateTouchMode);
      window.removeEventListener('resize', updateTouchMode);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const isGameplay = gameState === 'PLAYING';
    const wasGameplay = prevGameStateRef.current === 'PLAYING';
    const isMenu = ['START', 'PLAYER_SELECT', 'MODE_SELECT', 'HIGH_SCORES', 'PAUSED', 'VICTORY', 'GAMEOVER'].includes(gameState);

    // Only change music when transitioning to gameplay OR returning to menu from gameplay
    if ((isGameplay && !wasGameplay) || (isMenu && wasGameplay) || (gameState === 'START' && prevGameStateRef.current === 'START')) {
      playBackgroundMusic(isGameplay);
    }
    
    prevGameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') {
      gameRef.current?.releaseAllControls();
    }
  }, [gameState]);

  useEffect(() => {
    if (selectedIndex === 0 && (gameState === 'VICTORY' || gameState === 'GAMEOVER') && isHighScore && !scoreSubmitted) {
      nameInputRef.current?.focus();
    }
  }, [selectedIndex, gameState, isHighScore, scoreSubmitted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.code)) {
        // Only prevent default if we're in a menu state
        if (['START', 'PLAYER_SELECT', 'MODE_SELECT', 'HIGH_SCORES', 'PAUSED', 'VICTORY', 'GAMEOVER'].includes(gameState)) {
          // If we're typing in the high score input, don't navigate
          if (document.activeElement?.tagName === 'INPUT') {
            if (e.code === 'Enter') {
              // Allow Enter to submit if focused on input
              return;
            }
            if (e.code !== 'Escape') return;
          }
          e.preventDefault();
        }
      }

      const navigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        setSelectedIndex(prev => {
          if (gameState === 'START') {
            if (direction === 'up' || direction === 'left') return prev === 0 ? 1 : 0;
            if (direction === 'down' || direction === 'right') return prev === 1 ? 0 : 1;
          }
          if (gameState === 'PLAYER_SELECT') {
            // 2x3 grid for characters (0-5)
            if (direction === 'right') return (prev + 1) % 6;
            if (direction === 'left') return (prev - 1 + 6) % 6;
            if (direction === 'down') return (prev + 3) % 6;
            if (direction === 'up') return (prev - 3 + 6) % 6;
          }
          if (gameState === 'MODE_SELECT') {
            // 2x2 grid for modes (0-3)
            if (direction === 'right') return prev % 2 === 0 ? prev + 1 : prev - 1;
            if (direction === 'left') return prev % 2 === 1 ? prev - 1 : prev + 1;
            if (direction === 'down') return (prev + 2) % 4;
            if (direction === 'up') return (prev - 2 + 4) % 4;
          }
          if (gameState === 'PAUSED' || gameState === 'START') {
            if (direction === 'up' || direction === 'down') return prev === 0 ? 1 : 0;
          }
          if (gameState === 'VICTORY' || gameState === 'GAMEOVER') {
            const hasInput = isHighScore && !scoreSubmitted;
            const max = hasInput ? 3 : 1;
            if (direction === 'down') return (prev + 1) % (max + 1);
            if (direction === 'up') return (prev - 1 + (max + 1)) % (max + 1);
          }
          return prev;
        });
      };

      if (e.code === 'ArrowUp' || e.code === 'KeyW') navigate('up');
      if (e.code === 'ArrowDown' || e.code === 'KeyS') navigate('down');
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') navigate('left');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') navigate('right');

      if (e.code === 'Enter' || e.code === 'Space') {
        // Trigger click on the selected element
        const focusedElement = document.querySelector('.menu-focused') as HTMLElement;
        if (focusedElement) {
          focusedElement.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isHighScore, scoreSubmitted]);

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

  useEffect(() => {
    const releaseControls = () => {
      gameRef.current?.releaseAllControls();
    };

    window.addEventListener('pointerup', releaseControls);
    window.addEventListener('pointercancel', releaseControls);
    window.addEventListener('blur', releaseControls);

    return () => {
      window.removeEventListener('pointerup', releaseControls);
      window.removeEventListener('pointercancel', releaseControls);
      window.removeEventListener('blur', releaseControls);
    };
  }, []);

  const handleStart = () => {
    initAudio();
    playStart();
    playBackgroundMusic(true);
    gameRef.current?.startGame();
  };

  const setMobileControl = (code: string, pressed: boolean) => {
    gameRef.current?.setControlPressed(code, pressed);
  };

  const createMobileControlHandlers = (code: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setMobileControl(code, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setMobileControl(code, false);
    },
    onPointerCancel: () => setMobileControl(code, false),
    onPointerLeave: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType !== 'mouse') {
        setMobileControl(code, false);
      }
    },
  });

  const toggleFullscreen = async () => {
    const container = gameContainerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (error) {
      console.error('Unable to toggle fullscreen mode.', error);
    }
  };

  const showMobileControls = isTouchDevice && gameState === 'PLAYING';

  return (
    <div className="relative w-screen h-screen bg-[#1a1025] flex items-center justify-center overflow-hidden p-2 md:p-4">
      {/* CRT Overlay */}
      <div className="crt-overlay"></div>

      {/* Game Container */}
      <div 
        ref={gameContainerRef}
        className="relative border-2 border-pastel-purple p-1 rounded-2xl bg-[#1a1025] flex flex-col w-full h-full max-w-4xl max-h-[800px]"
      >
        {/* Game Area (Canvas + HUD) */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
          {/* Mute Button */}
          <button 
            onClick={() => {
              const muted = toggleMute();
              setIsMuted(muted);
            }}
            className="absolute top-2 right-2 md:top-4 md:right-4 z-30 p-2 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/60 transition-colors"
            title={isMuted ? "Unmute Music" : "Mute Music"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
          </button>

          <div 
            className="relative flex items-center justify-center w-full h-full"
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: '4/3'
            }}
          >
            {/* HUD */}
            {gameState !== 'START' && (
              <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 flex justify-between text-xs md:text-xl z-10 pointer-events-none font-bold">
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
              className="bg-[#1a1025] block rounded-xl w-full h-full"
            />

          </div>
        </div>

        {showMobileControls && (
          <div className="mobile-control-dock md:hidden">
            <div className="mobile-plus-layout">
              <div className="mobile-control-spacer" />
              <button
                type="button"
                aria-label="Fire"
                className="mobile-control-button mobile-fire-button"
                {...createMobileControlHandlers('Space')}
              >
                <Crosshair className="h-8 w-8" />
                <span>Fire</span>
              </button>
              <div className="mobile-control-spacer" />

              <button
                type="button"
                aria-label="Move left"
                className="mobile-control-button"
                {...createMobileControlHandlers('ArrowLeft')}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <div className="mobile-control-center">+</div>
              <button
                type="button"
                aria-label="Move right"
                className="mobile-control-button"
                {...createMobileControlHandlers('ArrowRight')}
              >
                <ChevronRight className="h-8 w-8" />
              </button>

              <div className="mobile-control-spacer" />
              <button
                type="button"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="mobile-control-button mobile-fullscreen-button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="h-7 w-7" /> : <Maximize className="h-7 w-7" />}
              </button>
              <div className="mobile-control-spacer" />
            </div>
          </div>
        )}

        {/* Start Screen Overlay */}
        {gameState === 'START' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl overflow-y-auto no-scrollbar p-4">
            <div className="flex flex-col items-center mb-4 title-container mt-auto">
              <img 
                src="https://i.ibb.co/sJ659Yzt/Logo-Uw-U-Invaders.png" 
                onError={(e) => {
                  e.currentTarget.src = "https://direct-seahorse.static2.website/9c28c780d721decb9acb0602ff6443ba.png";
                }}
                alt="UwU Invaders Logo" 
                referrerPolicy="no-referrer"
                className="h-32 md:h-48 lg:h-56 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,156,230,0.6)]"
              />
            </div>
            <p className="text-pastel-blue text-lg md:text-xl mb-4 animate-pulse tracking-widest font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-shadow-sm">PRESS START TO PLAY ~</p>
            <div className="flex flex-col gap-3 w-full max-w-md px-4">
              <button 
                onClick={() => {
                  initAudio();
                  playStart();
                  playBackgroundMusic(false);
                  setGameState('PLAYER_SELECT');
                }}
                className={`kawaii-button kawaii-button-pink w-full py-2 md:py-3 text-xl md:text-2xl text-white uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 drop-shadow-md ${selectedIndex === 0 ? 'menu-focused' : ''}`}
              >
                <Play className="star-icon w-6 h-6 md:w-8 md:h-8 fill-current" />
                START
                <Play className="star-icon w-6 h-6 md:w-8 md:h-8 fill-current" />
              </button>
              <button 
                onClick={() => {
                  initAudio();
                  playStart();
                  playBackgroundMusic(false);
                  setGameState('HIGH_SCORES');
                }}
                className={`kawaii-button kawaii-button-purple w-full py-2 md:py-3 text-xl md:text-2xl text-white uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 drop-shadow-md ${selectedIndex === 1 ? 'menu-focused' : ''}`}
              >
                <Trophy className="w-6 h-6 md:w-8 md:h-8 fill-current" />
                HIGH SCORES
                <Trophy className="w-6 h-6 md:w-8 md:h-8 fill-current" />
              </button>
            </div>
            <div className="mt-4 md:mt-6 flex flex-col items-center gap-1 md:gap-2 text-pastel-purple/80 text-sm md:text-lg tracking-widest mb-auto text-center">
              <p>ARROWS / A D : Move</p>
              <p>SPACE : Fire</p>
              {isTouchDevice && <p>TOUCH BUTTONS : MOVE / FIRE / FULLSCREEN</p>}
            </div>
          </div>
        )}

        {/* Mode Select Overlay */}
        {gameState === 'MODE_SELECT' && (
          <div className="absolute inset-0 bg-[#1a1025]/95 z-20 rounded-xl overflow-y-auto no-scrollbar flex flex-col items-center justify-start p-4 md:p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-1 kawaii-text text-pastel-pink shrink-0">GAME SETUP</h2>
            <p className="text-pastel-blue mb-4 tracking-widest uppercase text-[10px] md:text-xs shrink-0">Select your game style & difficulty</p>
            
            <div className="w-full max-w-4xl flex-1 flex flex-col justify-center px-2 pb-16 md:pb-20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {GAME_MODES.map((mode, index) => {
                  const isSelected = selectedModeId === mode.id;
                  const isFocused = selectedIndex === index;
                  
                  let difficultyColor = "text-pastel-blue";
                  if (mode.difficulty === "Normal") difficultyColor = "text-pastel-purple";
                  if (mode.difficulty === "Hard") difficultyColor = "text-pastel-pink";
                  if (mode.difficulty === "Progressive") difficultyColor = "text-yellow-400";

                  return (
                    <div 
                      key={mode.id}
                      onClick={() => {
                        setSelectedModeId(mode.id as 'CLASSIC' | 'RETROWO' | 'SURVIVAL' | 'KAWAII');
                        playStart();
                        playBackgroundMusic(true);
                        gameRef.current?.setGameMode(mode.id as 'CLASSIC' | 'RETROWO' | 'SURVIVAL' | 'KAWAII');
                        gameRef.current?.startGame();
                      }}
                      className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-300 border-2 flex flex-col gap-1 md:gap-2
                        ${isSelected 
                          ? 'bg-[#2a1b3d] border-pastel-pink shadow-[0_0_15px_rgba(255,179,240,0.4)] transform scale-[1.02] z-10' 
                          : 'bg-[#1a1025] border-slate-700 hover:border-pastel-purple hover:bg-[#201530]'
                        }
                        ${isFocused ? 'menu-focused' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className={`text-lg md:text-xl font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {mode.name}
                        </h3>
                        <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 md:py-1 rounded-md bg-black/30 border border-white/10 ${difficultyColor}`}>
                          {mode.difficulty}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 mt-1 leading-snug">{mode.desc}</p>
                      
                      {isSelected && (
                        <div className="absolute -inset-1 border border-pastel-pink rounded-2xl animate-ping opacity-20 pointer-events-none"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Character Select Overlay */}
        {gameState === 'PLAYER_SELECT' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/95 z-30 rounded-xl p-4 md:p-8 overflow-y-auto no-scrollbar">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 kawaii-text text-pastel-pink">CHOOSE YOUR FIGHTER</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
              {KAOMOJI_ROSTER.map((char, index) => (
                <button
                  key={char.id}
                  onClick={() => {
                    setSelectedChar(char);
                    gameRef.current?.setPlayerFaces(char.normal, char.shoot);
                    setGameState('MODE_SELECT');
                  }}
                  className={`capsule-pod relative p-4 rounded-3xl flex flex-col items-center gap-2 ${
                    selectedChar.id === char.id ? 'selected' : ''
                  } ${selectedIndex === index ? 'menu-focused' : ''}`}
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
          </div>
        )}

        {/* High Scores Overlay */}
        {gameState === 'HIGH_SCORES' && (
          <div className="absolute inset-0 flex flex-col items-center justify-start bg-[#1a1025]/95 z-30 rounded-xl p-8 overflow-y-auto custom-scrollbar no-scrollbar">
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
              className={`kawaii-button kawaii-button-purple px-12 py-4 text-2xl text-white border-2 border-white/50 rounded-full font-bold ${selectedIndex === 0 ? 'menu-focused' : ''}`}
            >
              MAIN MENU
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl overflow-y-auto no-scrollbar p-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-12 kawaii-text text-pastel-pink tracking-widest whitespace-nowrap" data-text="PAUSED">
              PAUSED
            </h1>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={() => gameRef.current?.togglePause()}
                className={`kawaii-button kawaii-button-pink w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 ${selectedIndex === 0 ? 'menu-focused' : ''}`}
              >
                <Play className="w-6 h-6 fill-current" />
                RESUME
              </button>
              <button 
                onClick={() => {
                  gameRef.current?.goToMenu();
                }}
                className={`kawaii-button kawaii-button-purple w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold ${selectedIndex === 1 ? 'menu-focused' : ''}`}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {/* Victory Overlay */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl overflow-y-auto no-scrollbar p-4">
            <h1 className="text-3xl sm:text-4xl md:text-7xl font-bold mb-4 kawaii-text text-pastel-pink text-center whitespace-nowrap" data-text="LEVEL CLEARED!">
              LEVEL CLEARED!
            </h1>
            <p className="text-pastel-purple text-xl md:text-3xl mb-8">SCORE: {score}</p>
            
            {isHighScore && !scoreSubmitted ? (
              <div className="bg-[#2a1b3d] p-6 rounded-3xl border-4 border-yellow-400/50 mb-8 flex flex-col items-center gap-4 w-full max-w-md">
                <h3 className="text-2xl font-bold text-yellow-400 text-center">NEW HIGH SCORE!</h3>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <input
                    ref={nameInputRef}
                    type="text"
                    maxLength={10}
                    value={playerName}
                    onFocus={() => setSelectedIndex(0)}
                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                    placeholder="ENTER NAME"
                    className={`bg-[#1a1025] border-2 border-pastel-pink rounded-xl px-4 py-3 text-white font-bold text-lg sm:text-xl text-center outline-none focus:border-pastel-blue uppercase w-full ${selectedIndex === 0 ? 'menu-focused' : ''}`}
                  />
                  <button
                    onClick={submitHighScore}
                    disabled={!playerName.trim()}
                    className={`kawaii-button kawaii-button-pink px-6 py-3 sm:py-0 font-bold rounded-xl disabled:opacity-50 w-full sm:w-auto ${selectedIndex === 1 ? 'menu-focused' : ''}`}
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
                className={`kawaii-button kawaii-button-pink w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 ${selectedIndex === (isHighScore && !scoreSubmitted ? 2 : 0) ? 'menu-focused' : ''}`}
              >
                <Play className="w-6 h-6 fill-current" />
                PLAY AGAIN
              </button>
              <button 
                onClick={() => gameRef.current?.goToMenu()}
                className={`kawaii-button kawaii-button-purple w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold ${selectedIndex === (isHighScore && !scoreSubmitted ? 3 : 1) ? 'menu-focused' : ''}`}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl overflow-y-auto no-scrollbar p-4">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 kawaii-text text-pastel-pink text-center whitespace-nowrap" data-text="OH NOES! ;w;">
              OH NOES! ;w;
            </h1>
            <p className="text-pastel-purple text-xl md:text-3xl mb-8">FINAL SCORE: {score}</p>
            
            {isHighScore && !scoreSubmitted ? (
              <div className="bg-[#2a1b3d] p-6 rounded-3xl border-4 border-yellow-400/50 mb-8 flex flex-col items-center gap-4 w-full max-w-md">
                <h3 className="text-2xl font-bold text-yellow-400 text-center">NEW HIGH SCORE!</h3>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <input
                    ref={nameInputRef}
                    type="text"
                    maxLength={10}
                    value={playerName}
                    onFocus={() => setSelectedIndex(0)}
                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                    placeholder="ENTER NAME"
                    className={`bg-[#1a1025] border-2 border-pastel-pink rounded-xl px-4 py-3 text-white font-bold text-lg sm:text-xl text-center outline-none focus:border-pastel-blue uppercase w-full ${selectedIndex === 0 ? 'menu-focused' : ''}`}
                  />
                  <button
                    onClick={submitHighScore}
                    disabled={!playerName.trim()}
                    className={`kawaii-button kawaii-button-pink px-6 py-3 sm:py-0 font-bold rounded-xl disabled:opacity-50 w-full sm:w-auto ${selectedIndex === 1 ? 'menu-focused' : ''}`}
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
                className={`kawaii-button kawaii-button-pink w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 ${selectedIndex === (isHighScore && !scoreSubmitted ? 2 : 0) ? 'menu-focused' : ''}`}
              >
                <Heart className="heart-icon w-8 h-8 fill-current" />
                TRY AGAIN
                <Heart className="heart-icon w-8 h-8 fill-current" />
              </button>
              <button 
                onClick={() => gameRef.current?.goToMenu()}
                className={`kawaii-button kawaii-button-purple w-full py-4 text-2xl text-white border-2 border-white/50 uppercase tracking-widest rounded-full font-bold ${selectedIndex === (isHighScore && !scoreSubmitted ? 3 : 1) ? 'menu-focused' : ''}`}
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
