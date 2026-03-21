import { playShoot, playAlienHit, playAlienMove, playPlayerDeath } from './audio';

export type GameState = 'START' | 'PLAYER_SELECT' | 'MODE_SELECT' | 'HIGH_SCORES' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

interface Trail {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Alien extends Entity {
  type: 'classic' | 'uwu' | 'owo' | 'kitty' | 'neko' | 'cluster' | 'ghost' | 'boss';
  hp: number;
  maxHp: number;
  state: string;
  timer: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  face: string;
  phase?: number;
}

export class CyberInvaders {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  width: number = 800;
  height: number = 600;
  
  state: GameState = 'START';
  score: number = 0;
  lives: number = 3;
  level: number = 1;
  wave: number = 1;
  bossActive: boolean = false;
  gameMode: 'RETRO' | 'SURVIVAL' | 'KAWAII' = 'KAWAII';
  
  player: Entity = { x: 400, y: 550, width: 60, height: 24, color: '#00ffff' };
  playerFaceNormal: string = '(*´ω｀)';
  playerFaceShoot: string = '(>ω<)';
  aliens: Alien[] = [];
  bullets: (Entity & { vy: number; isPlayer: boolean })[] = [];
  particles: Particle[] = [];
  stars: Star[] = [];
  trails: Trail[] = [];
  rings: Ring[] = [];
  time: number = 0;
  
  keys: { [key: string]: boolean } = {};
  
  lastTime: number = 0;
  alienMoveTimer: number = 0;
  alienMoveInterval: number = 800;
  alienDirection: number = 1;
  alienStep: number = 0;
  
  shootCooldown: number = 0;
  
  screenShake: number = 0;
  
  onStateChange?: (state: GameState) => void;
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onWaveChange?: (wave: number) => void;
  onLevelComplete?: (level: number) => void;

  animationFrameId: number = 0;

  setPlayerFaces(normal: string, shoot: string) {
    this.playerFaceNormal = normal;
    this.playerFaceShoot = shoot;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Fixed internal resolution for retro feel
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Init stars
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.5 ? '#fff6e9' : '#c6a8ff'
      });
    }
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    cancelAnimationFrame(this.animationFrameId);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === 'Space' && this.state === 'START') {
      this.startGame();
    } else if (e.code === 'Space' && (this.state === 'GAMEOVER' || this.state === 'VICTORY')) {
      this.state = 'START';
      this.onStateChange?.(this.state);
    } else if (e.code === 'Escape') {
      this.togglePause();
    }
  };

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.onStateChange?.(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.onStateChange?.(this.state);
    }
  }

  handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.wave = 1;
    this.onStateChange?.(this.state);
    this.onScoreChange?.(this.score);
    this.onLivesChange?.(this.lives);
    this.onLevelChange?.(this.level);
    this.onWaveChange?.(this.wave);
    this.initLevel();
  }

  goToMenu() {
    this.state = 'START';
    this.onStateChange?.(this.state);
  }

  setLevel(level: number) {
    this.level = level;
    this.onLevelChange?.(this.level);
    this.initLevel();
  }

  setGameMode(mode: 'RETRO' | 'SURVIVAL' | 'KAWAII') {
    this.gameMode = mode;
  }

  initLevel() {
    this.wave = 1;
    this.onWaveChange?.(this.wave);
    this.bossActive = false;
    this.spawnWave();
  }

  spawnWave() {
    this.aliens = [];
    this.bullets = [];
    this.particles = [];
    if (this.wave === 1) {
      this.player.x = this.width / 2 - this.player.width / 2;
    }
    this.state = 'PLAYING';
    this.onStateChange?.(this.state);
    this.time = 0;
    this.alienMoveTimer = 0;
    this.alienDirection = 1;
    this.alienStep = 0;
    
    const waveMultiplier = 1 + (this.wave - 1) * 0.5;

    if (this.gameMode === 'RETRO') {
      this.alienMoveInterval = Math.max(50, 800 - (this.level * 100));
      const cols = Math.min(12, 6 + Math.floor(this.level / 2));
      const rows = Math.min(6, 3 + Math.floor(this.level / 3));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          this.aliens.push({
            x: 80 + col * 60, y: 50 + row * 50, width: 50, height: 30,
            color: row % 2 === 0 ? '#ff8fd8' : '#ffb3f0', type: 'classic', hp: 1, maxHp: 1, state: 'idle', timer: 0,
            startX: 80 + col * 60, startY: 50 + row * 50, vx: 0, vy: 0, face: 'UwU', phase: row % 2
          });
        }
      }
      return;
    }

    if (this.gameMode === 'SURVIVAL') {
      this.alienMoveInterval = Math.max(50, 800 - (this.wave * 50));
      const types = ['classic', 'uwu', 'owo', 'kitty', 'neko', 'cluster', 'ghost'];
      const type = types[(this.wave - 1) % types.length];
      const count = 10 + this.wave * 2;
      const hp = Math.ceil(waveMultiplier);
      
      if (this.wave % 5 === 0) {
        this.aliens.push({
          x: 300, y: 100, width: 200, height: 100,
          color: '#ff8fd8', type: 'boss', hp: 50 * waveMultiplier, maxHp: 50 * waveMultiplier, state: 'idle', timer: 0,
          startX: 300, startY: 100, vx: 0, vy: 0, face: '✨(◕‿◕✿)✨'
        });
        return;
      }

      const cols = Math.min(12, 6 + Math.floor(this.wave / 2));
      const rows = Math.ceil(count / cols);

      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        let color = '#ffb3f0';
        let face = 'UwU';
        let width = 40;
        let height = 30;
        
        if (type === 'classic') {
          color = row % 2 === 0 ? '#ff8fd8' : '#ffb3f0';
          face = 'UwU';
          width = 50;
          height = 30;
        } else if (type === 'owo') {
          color = '#c59cff';
          face = 'OwO';
        } else if (type === 'kitty') {
          color = '#7be8ff';
          face = '=w=';
        } else if (type === 'neko') {
          color = '#ffb3f0';
          face = '^._.^';
        } else if (type === 'cluster') {
          color = '#c59cff';
          face = '(づ｡◕‿‿◕｡)づ';
          width = 80;
          height = 50;
        } else if (type === 'ghost') {
          color = '#7be8ff';
          face = '👻';
        }

        this.aliens.push({
          x: 80 + col * (width + 10), y: 50 + row * (height + 10), width, height,
          color, type: type as any, hp: hp, maxHp: hp, state: 'idle', timer: i * 100,
          startX: 80 + col * (width + 10), startY: 50 + row * (height + 10), vx: 0, vy: 0, face, phase: row % 2
        });
      }
      return;
    }

    // KAWAII mode logic
    if (this.bossActive) {
      let bossFace = '✨(◕‿◕✿)✨';
      let bossColor = '#ff8fd8';
      let bossHp = 50 + this.level * 20;
      
      if (this.level === 1) bossFace = 'U w U';
      else if (this.level === 2) bossFace = 'O w O';
      else if (this.level === 3) bossFace = 'ヾ(＠⌒ー⌒＠)ノ';
      else if (this.level === 4) bossFace = '(╬ Ò﹏Ó)';
      else if (this.level === 5) bossFace = '(=｀ω´=)';
      else if (this.level === 6) bossFace = 'ʕ•ᴥ•ʔ';
      else if (this.level === 7) bossFace = '(づ｡◕‿‿◕｡)づ';
      else if (this.level === 8) bossFace = '👻 BOO 👻';
      
      this.aliens.push({
        x: 300, y: 100, width: 200, height: 100,
        color: bossColor, type: 'boss', hp: bossHp, maxHp: bossHp, state: 'idle', timer: 0,
        startX: 300, startY: 100, vx: 0, vy: 0, face: bossFace
      });
      return;
    }

    if (this.level === 1) {
      for (let row = 0; row < 3 + Math.floor(this.wave/2); row++) {
        for (let col = 0; col < 6 + this.wave; col++) {
          this.aliens.push({
            x: 100 + col * 80, y: 80 + row * 50, width: 50, height: 30,
            color: '#ffb3f0', type: 'uwu', hp: Math.ceil(waveMultiplier), maxHp: Math.ceil(waveMultiplier), state: 'idle', timer: 0,
            startX: 100 + col * 80, startY: 80 + row * 50, vx: 0, vy: 0, face: 'UwU'
          });
        }
      }
    } else if (this.level === 2) {
      for (let row = 0; row < 4 + Math.floor(this.wave/2); row++) {
        for (let col = 0; col < 7 + this.wave; col++) {
          this.aliens.push({
            x: 80 + col * 70, y: 60 + row * 40, width: 50, height: 30,
            color: '#c59cff', type: 'owo', hp: Math.ceil(waveMultiplier), maxHp: Math.ceil(waveMultiplier), state: 'idle', timer: 0,
            startX: 80 + col * 70, startY: 60 + row * 40, vx: 0, vy: 0, face: 'OwO'
          });
        }
      }
    } else if (this.level === 3) {
      for (let i = 0; i < 15 + this.wave * 5; i++) {
        this.aliens.push({
          x: 400, y: 200, width: 40, height: 30,
          color: '#7be8ff', type: 'kitty', hp: Math.ceil(waveMultiplier), maxHp: Math.ceil(waveMultiplier), state: 'idle', timer: i * (1000 / this.wave),
          startX: 150 + (i % (5 + this.wave)) * 80, startY: 100 + Math.floor(i / (5 + this.wave)) * 60, vx: 0, vy: 0, face: '=w='
        });
      }
    } else if (this.level === 4) {
      for (let i = 0; i < 12 + this.wave * 4; i++) {
        this.aliens.push({
          x: 80 + i * 40, y: 50 + (i % 3) * 50, width: 40, height: 30,
          color: '#ffb3f0', type: 'neko', hp: Math.ceil(waveMultiplier), maxHp: Math.ceil(waveMultiplier), state: 'idle', timer: i * (500 / this.wave),
          startX: 80 + i * 40, startY: 50 + (i % 3) * 50, vx: 0, vy: 0, face: '^._.^'
        });
      }
    } else if (this.level === 5) {
      for (let i = 0; i < 5 + this.wave * 2; i++) {
        this.aliens.push({
          x: 100 + i * 90, y: 100 + (i % 2) * 60, width: 80, height: 50,
          color: '#c59cff', type: 'cluster', hp: 10 * waveMultiplier, maxHp: 10 * waveMultiplier, state: 'idle', timer: 0,
          startX: 100 + i * 90, startY: 100 + (i % 2) * 60, vx: 0, vy: 0, face: '(づ｡◕‿‿◕｡)づ'
        });
      }
    } else if (this.level === 6) {
      for (let row = 0; row < 3 + Math.floor(this.wave/2); row++) {
        for (let col = 0; col < 5 + this.wave; col++) {
          this.aliens.push({
            x: 150 + col * 90, y: 80 + row * 60, width: 50, height: 30,
            color: '#7be8ff', type: 'ghost', hp: 5 * waveMultiplier, maxHp: 5 * waveMultiplier, state: 'idle', timer: 0,
            startX: 150 + col * 90, startY: 80 + row * 60, vx: 0, vy: 0, face: '👻'
          });
        }
      }
    } else if (this.level >= 7) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6 + this.wave; col++) {
          this.aliens.push({
            x: 150 + col * 80, y: 80 + row * 60, width: 50, height: 30,
            color: '#ff8fd8', type: 'uwu', hp: 5 * waveMultiplier, maxHp: 5 * waveMultiplier, state: 'idle', timer: 0,
            startX: 150 + col * 80, startY: 80 + row * 60, vx: 0, vy: 0, face: '✧w✧'
          });
        }
      }
    }
  }

  fireAlienBullet(a: Alien, speed: number) {
    this.bullets.push({
      x: a.x + a.width / 2 - 10,
      y: a.y + a.height,
      width: 20,
      height: 20,
      color: '#9cd9ff',
      vy: speed,
      isPlayer: false
    });
  }

  spawnParticles(x: number, y: number, color: string, count: number = 15) {
    const glyphs = ['★', '♥', '✧', '✦', 'o', 'w'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 500 + 300,
        color,
        size: Math.random() * 6 + 2,
        text: Math.random() > 0.5 ? glyphs[Math.floor(Math.random() * glyphs.length)] : undefined
      });
    }
  }

  update(dt: number) {
    this.time += dt;

    // Update stars
    for (const star of this.stars) {
      star.y += star.speed * (dt / 16);
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // Update trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life += dt;
      if (t.life >= t.maxLife) {
        this.trails.splice(i, 1);
      }
    }

    // Update rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      r.radius += (r.maxRadius - r.radius) * 0.1;
      if (r.life >= r.maxLife) {
        this.rings.splice(i, 1);
      }
    }

    if (this.state !== 'PLAYING') return;

    // Screen shake decay
    if (this.screenShake > 0) this.screenShake *= 0.9;
    if (this.screenShake < 0.1) this.screenShake = 0;

    // Player movement
    const speed = 300 * (dt / 1000);
    let moved = false;
    if ((this.keys['ArrowLeft'] || this.keys['KeyA']) && this.player.x > 0) {
      this.player.x -= speed;
      moved = true;
    }
    if ((this.keys['ArrowRight'] || this.keys['KeyD']) && this.player.x < this.width - this.player.width) {
      this.player.x += speed;
      moved = true;
    }
    
    if (moved && Math.random() < 0.3) {
      this.trails.push({
        x: this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 20,
        y: this.player.y + this.player.height,
        life: 0,
        maxLife: 400,
        color: '#00ffff',
        size: Math.random() * 3 + 1
      });
    }

    // Player shooting
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if ((this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW']) && this.shootCooldown <= 0) {
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - 10,
        y: this.player.y - 10,
        width: 20,
        height: 20,
        color: '#00ffff',
        vy: -500,
        isPlayer: true
      });
      this.shootCooldown = 250;
      playShoot();
    }

    // Bullet update
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.vy * (dt / 1000);
      
      if (b.isPlayer) {
        this.trails.push({
          x: b.x + b.width / 2,
          y: b.y + b.height / 2,
          life: 0,
          maxLife: 200,
          color: '#00ffff',
          size: 3
        });
      }

      // Remove off-screen bullets
      if (b.y < -20 || b.y > this.height + 20) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Collision with aliens
      if (b.isPlayer) {
        let hit = false;
        for (let j = this.aliens.length - 1; j >= 0; j--) {
          const a = this.aliens[j];
          if (b.x < a.x + a.width && b.x + b.width > a.x &&
              b.y < a.y + a.height && b.y + b.height > a.y) {
            
            // Collision with aliens
            a.hp--;
            if (a.hp <= 0) {
              this.spawnParticles(a.x + a.width/2, a.y + a.height/2, '#ff8fd8', 25);
              this.rings.push({
                x: a.x + a.width/2,
                y: a.y + a.height/2,
                radius: 10,
                maxRadius: 60,
                life: 0,
                maxLife: 500,
                color: '#c6a8ff'
              });
              
              // Cluster split logic
              if (a.type === 'cluster') {
                for(let k=0; k<3; k++) {
                  this.aliens.push({
                    x: a.x + (k-1)*30, y: a.y, width: 30, height: 20,
                    color: '#ffb3f0', type: 'uwu', hp: 1, maxHp: 1, state: 'idle', timer: 0,
                    startX: a.x + (k-1)*30, startY: a.y, vx: 0, vy: 0, face: 'uwu'
                  });
                }
              }

              this.aliens.splice(j, 1);
              this.score += 10 * this.level;
              this.onScoreChange?.(this.score);
              playAlienHit();
              this.screenShake = 2;
            } else {
              this.spawnParticles(a.x + a.width/2, a.y + a.height/2, '#ffffff', 10);
              playAlienHit();
            }
            this.bullets.splice(i, 1);
            hit = true;
            break;
          }
        }
        if (hit) continue;
      } else {
        // Alien bullet hits player
        if (b.x < this.player.x + this.player.width && b.x + b.width > this.player.x &&
            b.y < this.player.y + this.player.height && b.y + b.height > this.player.y) {
          
          this.spawnParticles(this.player.x + this.player.width/2, this.player.y + this.player.height/2, this.player.color, 30);
          this.bullets.splice(i, 1);
          this.lives--;
          this.onLivesChange?.(this.lives);
          playPlayerDeath();
          this.screenShake = 15;
          
          if (this.lives <= 0) {
            this.state = 'GAMEOVER';
            this.onStateChange?.(this.state);
          }
        }
      }
    }

    // Classic Alien Movement
    this.alienMoveTimer += dt;
    
    // Speed up classic aliens as they are destroyed in RETRO mode
    if (this.gameMode === 'RETRO') {
      const classicCount = this.aliens.filter(a => a.type === 'classic').length;
      const totalAliens = 55; // 5 rows * 11 cols
      const remainingRatio = Math.max(0.05, classicCount / totalAliens);
      this.alienMoveInterval = Math.max(50, 800 * remainingRatio);
    }

    if (this.alienMoveTimer > this.alienMoveInterval) {
      this.alienMoveTimer = 0;
      this.alienStep++;
      playAlienMove(this.alienStep);
      
      let hitEdge = false;
      for (const a of this.aliens) {
        if (a.type === 'classic') {
          if ((this.alienDirection === 1 && a.x + a.width > this.width - 20) ||
              (this.alienDirection === -1 && a.x < 20)) {
            hitEdge = true;
            break;
          }
        }
      }
      
      if (hitEdge) {
        this.alienDirection *= -1;
        for (const a of this.aliens) {
          if (a.type === 'classic') {
            a.y += 20;
            if (a.y + a.height > this.player.y) {
              this.state = 'GAMEOVER';
              this.onStateChange?.(this.state);
              playPlayerDeath();
            }
          }
        }
      } else {
        for (const a of this.aliens) {
          if (a.type === 'classic') {
            a.x += 15 * this.alienDirection;
          }
        }
      }
      
      // Classic Alien shooting
      const classicAliens = this.aliens.filter(a => a.type === 'classic');
      const difficultyScale = this.gameMode === 'SURVIVAL' ? this.wave : this.level;
      if (classicAliens.length > 0 && Math.random() < 0.4 + (difficultyScale * 0.1)) {
        const randomAlien = classicAliens[Math.floor(Math.random() * classicAliens.length)];
        this.fireAlienBullet(randomAlien, 350 + (difficultyScale * 30));
      }
    }

    const waveMultiplier = 1 + (this.wave - 1) * 0.5;

    // Alien movement & shooting
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const a = this.aliens[i];
      a.timer += dt;
      
      if (a.type === 'classic') {
        a.face = this.alienStep % 2 === a.phase ? 'UwU' : '>w<';
      } else if (a.type === 'uwu') {
        a.x = a.startX + Math.sin(this.time * 0.002 * waveMultiplier + a.startY) * 50;
        a.y = a.startY + Math.sin(this.time * 0.003 * waveMultiplier + a.startX) * 10;
        a.face = this.time % 1000 < 500 ? 'UwU' : 'uwu';
        if (Math.random() < 0.003 * waveMultiplier) this.fireAlienBullet(a, 250 * waveMultiplier);
      } else if (a.type === 'owo') {
        if (a.state === 'idle') {
          a.x = a.startX + Math.sin(this.time * 0.005 * waveMultiplier + a.startY) * 100;
          if (Math.random() < 0.005 * waveMultiplier) {
            a.state = 'dash';
            a.vx = (this.player.x - a.x) * 0.003 * waveMultiplier;
            a.vy = 400 * waveMultiplier;
          }
          a.face = 'OwO';
        } else if (a.state === 'dash') {
          a.x += a.vx * dt;
          a.y += a.vy * (dt / 1000);
          if (Math.random() < 0.3) {
            this.trails.push({ x: a.x + a.width/2, y: a.y, life: 0, maxLife: 200, color: a.color, size: 2 });
          }
          if (a.y > this.height - 100) {
            a.state = 'retreat';
            a.vy = -200 * waveMultiplier;
          }
          a.face = 'O_O';
        } else if (a.state === 'retreat') {
          a.y += a.vy * (dt / 1000);
          if (a.y <= a.startY) {
            a.y = a.startY;
            a.state = 'idle';
          }
          a.face = '>w<';
        }
        if (Math.random() < 0.005 * waveMultiplier) this.fireAlienBullet(a, 350 * waveMultiplier);
      } else if (a.type === 'kitty') {
        const speed = 0.001 * waveMultiplier;
        const xOffset = Math.sin(this.time * 0.0005 + a.timer) * 30;
        const yOffset = Math.cos(this.time * 0.0006 + a.timer) * 20;
        a.x = a.startX + xOffset + Math.cos(this.time * speed + a.timer) * 60;
        a.y = a.startY + yOffset + Math.sin(this.time * speed + a.timer) * 60;
        a.face = Math.random() < 0.02 ? '-w-' : '=w=';
        if (Math.random() < 0.006 * waveMultiplier) this.fireAlienBullet(a, 280 * waveMultiplier);
      } else if (a.type === 'neko') {
        if (a.state === 'idle') {
          a.x = a.startX + Math.sin(this.time * 0.003 * waveMultiplier + a.timer) * 30;
          if (Math.random() < 0.005 * waveMultiplier) {
            a.state = 'dive';
            a.timer = 0;
          }
          a.face = '^._.^';
        } else if (a.state === 'dive') {
          a.x += Math.sin(a.timer * 0.005) * 5;
          a.y += 350 * waveMultiplier * (dt / 1000);
          if (a.y > this.height) {
            a.y = -50;
            a.state = 'idle';
          }
          a.face = '>._.<';
        }
        if (Math.random() < 0.008 * waveMultiplier) this.fireAlienBullet(a, 400 * waveMultiplier);
      } else if (a.type === 'cluster') {
        a.x = a.startX + Math.sin(this.time * 0.001 * waveMultiplier + a.timer) * 150;
        a.face = '(づ｡◕‿‿◕｡)づ';
        if (Math.random() < 0.01 * waveMultiplier) this.fireAlienBullet(a, 300 * waveMultiplier);
      } else if (a.type === 'ghost') {
        a.x = a.startX + Math.sin(this.time * 0.002 * waveMultiplier + a.startY) * 100;
        a.y = a.startY + Math.cos(this.time * 0.003 * waveMultiplier + a.startX) * 50;
        if (Math.random() < 0.08) {
          this.trails.push({ x: a.x + a.width/2, y: a.y + a.height/2, life: 0, maxLife: 500, color: 'rgba(123, 232, 255, 0.3)', size: 15 });
          a.startX += (Math.random() - 0.5) * 100;
          a.startX = Math.max(50, Math.min(this.width - 50, a.startX));
        }
        a.face = '👻';
        if (Math.random() < 0.008 * waveMultiplier) this.fireAlienBullet(a, 250 * waveMultiplier);
      } else if (a.type === 'boss') {
        a.x = this.width / 2 - a.width / 2 + Math.sin(this.time * 0.001) * 200;
        a.y = 100 + Math.sin(this.time * 0.002) * 20;
        if (Math.random() < 0.05) {
          this.fireAlienBullet(a, 300 + Math.random() * 200);
        }
      }
    }

    // Level complete
    if (this.aliens.length === 0 && this.state === 'PLAYING') {
      if (this.gameMode === 'RETRO') {
        this.level++;
        this.onLevelChange?.(this.level);
        this.spawnWave();
      } else if (this.gameMode === 'SURVIVAL') {
        this.wave++;
        this.onWaveChange?.(this.wave);
        this.spawnWave();
      } else {
        // KAWAII mode
        if (this.wave < 3) {
          this.wave++;
          this.onWaveChange?.(this.wave);
          this.spawnWave();
        } else if (!this.bossActive) {
          this.bossActive = true;
          this.spawnWave();
        } else {
          this.state = 'VICTORY';
          this.onStateChange?.(this.state);
          this.spawnParticles(this.width/2, this.height/2, '#ffb3f0', 100);
          this.onLevelComplete?.(this.level);
        }
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = '#7be8ff';

    const horizonY = this.height * 0.4;
    const numLines = 15;
    
    // Horizontal lines
    // We want the lines to move downwards (towards the player).
    // By adding time to the index and taking modulo 1, we get a smooth 0->1 transition.
    // We negate the time so the lines move downwards.
    const timeOffset = (1 - ((this.time * 0.001) % 1)) % 1;
    
    for (let i = 0; i < numLines; i++) {
      // progress goes from 0 to 1 non-linearly
      const p = (i + timeOffset) / numLines;
      const y = horizonY + Math.pow(p, 2) * (this.height - horizonY);
      
      // Fade out lines as they get closer to the horizon to avoid sharp pop-in
      const alpha = Math.min(1, p * 5); // 0 at horizon, 1 shortly after
      this.ctx.strokeStyle = `rgba(123, 232, 255, ${0.15 * alpha})`;
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Vertical lines (perspective)
    this.ctx.strokeStyle = 'rgba(123, 232, 255, 0.15)';
    const centerX = this.width / 2;
    for (let i = -15; i <= 15; i++) {
      const xOffset = i * 60;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX + xOffset * 0.1, horizonY);
      this.ctx.lineTo(centerX + xOffset * 3.0, this.height);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  draw() {
    // Clear with slight trail effect (Deep Space Plum)
    this.ctx.fillStyle = 'rgba(20, 10, 31, 0.4)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();

    // Draw Stars
    for (const star of this.stars) {
      this.ctx.fillStyle = star.color;
      this.ctx.globalAlpha = 0.5 + Math.sin(this.time * 0.005 + star.x) * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    if (this.gameMode !== 'RETRO') {
      this.drawGrid();
    }

    // Screen shake
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }

    this.ctx.font = '28px "VT323", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Draw Player
    if (this.state === 'PLAYING' || this.state === 'VICTORY') {
      let currentColor = this.player.color;
      
      // Strobe effect while shooting cooldown is active
      if (this.shootCooldown > 0) {
        currentColor = Math.floor(this.shootCooldown / 40) % 2 === 0 ? '#ffffff' : this.player.color;
      }

      this.ctx.fillStyle = currentColor;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = currentColor;
      
      const bobY = Math.sin(this.time * 0.005) * 5;
      this.ctx.fillText(this.playerFaceNormal, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2 + bobY);
    }

    // Draw Aliens
    this.ctx.font = '28px "VT323", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (const a of this.aliens) {
      this.ctx.fillStyle = a.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = a.color;
      
      const bounceY = a.type === 'classic' ? 0 : Math.sin(this.time * 0.008 + a.x) * 4;
      
      if (a.type === 'boss') {
        this.ctx.font = '48px "VT323", monospace';
      } else if (a.type === 'cluster') {
        this.ctx.font = '36px "VT323", monospace';
      } else {
        this.ctx.font = '28px "VT323", monospace';
      }
      
      this.ctx.fillText(a.face, a.x + a.width / 2, a.y + a.height / 2 + bounceY);
    }

    // Draw Bullets
    this.ctx.font = '20px "VT323", monospace';
    for (const b of this.bullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = b.color;
      this.ctx.fillText(b.isPlayer ? '♥' : 'x', b.x + b.width/2, b.y + b.height/2);
    }

    // Draw Trails
    for (const t of this.trails) {
      const alpha = 1 - (t.life / t.maxLife);
      this.ctx.fillStyle = t.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, t.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Draw Rings
    for (const r of this.rings) {
      const alpha = 1 - (r.life / r.maxLife);
      this.ctx.strokeStyle = r.color;
      this.ctx.lineWidth = 3 * alpha;
      this.ctx.globalAlpha = alpha;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = r.color;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = p.color;
      const alpha = 1 - (p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      
      if (p.text) {
        this.ctx.font = `${p.size * 3}px "VT323", monospace`;
        this.ctx.fillText(p.text, p.x, p.y);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.globalAlpha = 1;

    this.ctx.restore();
  }

  loop = (timestamp: number) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  startLoop() {
    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}
