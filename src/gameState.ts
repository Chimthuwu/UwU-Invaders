export const GAME_BOUNDS = { width: 30, height: 20 };

export interface EnemyData {
  id: number;
  x: number;
  y: number;
  vy: number; // For bombers
  type: 'normal' | 'bruiser' | 'sniper' | 'bomber';
  colorType: number; // 0 for pink, 1 for yellow
  size: number;
  active: boolean;
  shards: { dx: number; dy: number; dz: number; rx: number; ry: number; rz: number }[];
  // For sniper
  chargeTimer?: number;
  // For bomber
  bombTimer?: number;
}

export interface BulletData {
  id: number;
  x: number;
  y: number;
  vy: number;
  isPlayer: boolean;
  type: 'normal' | 'orb' | 'laser';
  size: number;
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

export interface BombData {
    id: number;
    x: number;
    y: number;
    life: number;
    maxLife: number;
    radius: number;
}

export const gameState = {
  player: { x: 0, y: -12, cooldown: 0 },
  enemies: [] as EnemyData[],
  bullets: [] as BulletData[],
  particles: [] as ParticleData[],
  bombs: [] as BombData[],
  alienDirection: 1,
  alienMoveTimer: 0,
  alienMoveInterval: 0.8,
  alienStep: 0,
  keys: { left: false, right: false, space: false },
  screenShake: 0,
  frequencyData: new Uint8Array(256),
};

let nextId = 0;
export const getId = () => nextId++;

export const initLevel = (level: number) => {
  gameState.enemies = [];
  gameState.bullets = [];
  gameState.particles = [];
  gameState.bombs = [];
  gameState.player.x = 0;
  
  const rows = 4 + Math.min(level, 3);
  const cols = 8;
  
  const startX = -((cols - 1) * 2.5) / 2;
  const startY = 10;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const shards = Array.from({ length: 5 }).map(() => ({
        dx: (Math.random() - 0.5) * 1.5,
        dy: (Math.random() - 0.5) * 1.5,
        dz: (Math.random() - 0.5) * 1.5,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
      }));

      let enemyType: 'normal' | 'bruiser' | 'sniper' | 'bomber' = 'normal';
      let size = 1;
      let vy = 0;
      const rand = Math.random();
      if (rand < 0.1) { // 10% for Bomber
        enemyType = 'bomber';
        size = 3;
        vy = -1;
      } else if (rand < 0.25) { // 15% for Bruiser
        enemyType = 'bruiser';
        size = 2;
      } else if (rand < 0.35) { // 10% for Sniper
        enemyType = 'sniper';
        size = 1.5;
      }

      gameState.enemies.push({
        id: getId(),
        x: startX + col * 2.5,
        y: startY - row * 2.0,
        vy: vy,
        type: enemyType,
        colorType: row % 2,
        size: size,
        active: true,
        shards,
        chargeTimer: 0,
        bombTimer: Math.random() * 5,
      });
    }
  }
  
  gameState.alienMoveInterval = Math.max(0.1, 0.8 - level * 0.1);
  gameState.alienDirection = 1;
};

export const spawnParticles = (x: number, y: number, baseColor: string, count: number = 100) => {
  const NEON_COLORS = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000', '#ffffff'];

  // 1. Fast, bright initial burst
  for (let i = 0; i < count * 0.5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 40 + 25;
    const life = Math.random() * 0.6 + 0.2;

    gameState.particles.push({
      id: getId(), x, y, z: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 40,
      life: life,
      maxLife: life,
      color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
    });
  }

  // 2. Slower, longer-lasting embers
  for (let i = 0; i < count * 0.5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 15 + 5;
    const life = Math.random() * 1.5 + 1.0;

    gameState.particles.push({
      id: getId(), x, y, z: 0,
      vx: Math.cos(angle) * speed * 0.5,
      vy: Math.sin(angle) * speed * 0.5,
      vz: (Math.random() - 0.5) * 20,
      life: life,
      maxLife: life,
      color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
    });
  }
};
