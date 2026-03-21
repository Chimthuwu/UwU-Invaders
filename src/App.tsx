/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CyberInvaders, GameState } from './game';
import { initAudio, playStart } from './audio';
import { Star, Heart, Users } from 'lucide-react';

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
  const [showSelect, setShowSelect] = useState(false);
  const [selectedChar, setSelectedChar] = useState(KAOMOJI_ROSTER[0]);
  const gameRef = useRef<CyberInvaders | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new CyberInvaders(canvasRef.current);
    game.setPlayerFaces(selectedChar.normal, selectedChar.shoot);
    gameRef.current = game;

    game.onStateChange = setGameState;
    game.onScoreChange = setScore;
    game.onLivesChange = setLives;
    game.onLevelChange = setLevel;

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
            <div className="text-pastel-blue">LEVEL: {level}</div>
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
            <h1 className="text-6xl md:text-8xl font-bold mb-8 uwu-title text-white" data-text="UwU INVADERS">
              UwU INVADERS
            </h1>
            <p className="text-pastel-blue text-xl mb-12 animate-pulse">PRESS START TO PLAY ~</p>
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={handleStart}
                className="kawaii-button px-10 py-4 text-2xl md:text-3xl text-white bg-pastel-pink border-4 border-white hover:bg-white hover:text-pastel-pink hover:shadow-[0_0_25px_#ff9ce6] uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 shadow-[0_0_10px_#ff9ce6]"
              >
                <Star className="star-icon w-8 h-8 fill-current" />
                Let's Go!
                <Star className="star-icon w-8 h-8 fill-current" />
              </button>
              <button 
                onClick={() => setShowSelect(true)}
                className="kawaii-button px-10 py-4 text-2xl md:text-3xl text-white bg-pastel-purple border-4 border-white hover:bg-white hover:text-pastel-purple hover:shadow-[0_0_25px_#c59cff] uppercase tracking-widest rounded-full font-bold flex items-center justify-center gap-3 shadow-[0_0_10px_#c59cff]"
                title="Select Character"
              >
                <Users className="w-8 h-8 fill-current" />
                Select Player
                <Users className="w-8 h-8 fill-current" />
              </button>
            </div>
            <div className="mt-8 text-sm text-pastel-purple text-center">
              <p>ARROWS / A D : Move</p>
              <p>SPACE : Fire</p>
            </div>
          </div>
        )}

        {/* Character Select Overlay */}
        {showSelect && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/95 z-30 rounded-xl p-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 kawaii-text text-pastel-pink">CHOOSE YOUR FIGHTER</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
              {KAOMOJI_ROSTER.map(char => (
                <button
                  key={char.id}
                  onClick={() => {
                    setSelectedChar(char);
                    gameRef.current?.setPlayerFaces(char.normal, char.shoot);
                    setShowSelect(false);
                  }}
                  className={`p-4 rounded-xl border-4 transition-all duration-300 flex flex-col items-center gap-2 ${
                    selectedChar.id === char.id 
                      ? 'border-pastel-pink bg-pastel-pink/20 shadow-[0_0_15px_#ff9ce6] scale-105' 
                      : 'border-pastel-purple/50 hover:border-pastel-blue hover:bg-pastel-blue/10 hover:scale-105'
                  }`}
                >
                  <div className="text-3xl text-white">{char.normal}</div>
                  <div className="text-pastel-blue text-lg font-bold uppercase tracking-wider">{char.name}</div>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowSelect(false)}
              className="kawaii-button mt-8 px-8 py-3 text-2xl text-white bg-pastel-purple border-4 border-white hover:bg-white hover:text-pastel-purple hover:shadow-[0_0_25px_#c59cff] transition-all duration-300 rounded-full font-bold shadow-[0_0_10px_#c59cff]"
            >
              BACK
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1025]/80 z-20 rounded-xl">
            <h1 className="text-7xl font-bold mb-4 kawaii-text text-pastel-pink" data-text="OH NOES! ;w;">
              OH NOES! ;w;
            </h1>
            <p className="text-pastel-purple text-3xl mb-12">FINAL SCORE: {score}</p>
            <button 
              onClick={handleStart}
              className="kawaii-button px-10 py-4 text-3xl text-white bg-pastel-blue border-4 border-white hover:bg-white hover:text-pastel-blue hover:shadow-[0_0_25px_#9cd9ff] uppercase tracking-widest rounded-full font-bold flex items-center gap-3 shadow-[0_0_10px_#9cd9ff]"
            >
              <Heart className="heart-icon w-8 h-8 fill-current" />
              Try Again!
              <Heart className="heart-icon w-8 h-8 fill-current" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
