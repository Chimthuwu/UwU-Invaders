export const GAME_BOUNDS = { width: 30, height: 20 };

export interface EnemyData {
  id: number;
  x: number;
  y: number;
  type: number;
  active: boolean;
  shards: { dx: number; dy: number; dz: number; rx: number; ry: number; rz: number }[];
}

export interface BulletData {
  id: number;
  x: number;
  y: number;
  vy: number;
  isPlayer: boolean;
  active: boolean;
}

export interface ParticleData {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
}

export const gameState = {
  player: { x: 0, y: -12, cooldown: 0 },
  enemies: [] as EnemyData[],
  bullets: [] as BulletData[],
  particles: [] as ParticleData[],
  alienDirection: 1,
  alienMoveTimer: 0,
  alienMoveInterval: 0.8,
  alienStep: 0,
  keys: { left: false, right: false, space: false },
  screenShake: 0,
};

let nextId = 0;
export const getId = () => nextId++;

export const initLevel = (level: number) => {
  gameState.enemies = [];
  gameState.bullets = [];
  gameState.particles = [];
  gameState.player.x = 0;
  
  const rows = 4 + Math.min(level, 3);
  const cols = 8;
  
  const startX = -((cols - 1) * 2.5) / 2;
  const startY = 10;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Generate random shards for the modular enemy look
      const shards = Array.from({ length: 5 }).map(() => ({
        dx: (Math.random() - 0.5) * 1.5,
        dy: (Math.random() - 0.5) * 1.5,
        dz: (Math.random() - 0.5) * 1.5,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
      }));

      gameState.enemies.push({
        id: getId(),
        x: startX + col * 2.5,
        y: startY - row * 2.0,
        type: row % 2,
        active: true,
        shards,
      });
    }
  }
  
  gameState.alienMoveInterval = Math.max(0.1, 0.8 - level * 0.1);
  gameState.alienDirection = 1;
};

export const spawnParticles = (x: number, y: number, color: string, count: number = 15) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 10 + 5;
    gameState.particles.push({
      id: getId(),
      x, y, z: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 10,
      life: 1,
      maxLife: Math.random() * 0.5 + 0.2,
      color,
    });
  }
};
