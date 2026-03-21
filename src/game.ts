import { playShoot, playAlienHit, playAlienMove, playPlayerDeath } from './audio';

export type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';

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
  
  player: Entity = { x: 400, y: 550, width: 60, height: 24, color: '#ff9ce6' };
  playerFaceNormal: string = '(*´ω｀)';
  playerFaceShoot: string = '(>ω<)';
  aliens: (Entity & { type: number })[] = [];
  bullets: (Entity & { vy: number; isPlayer: boolean })[] = [];
  particles: Particle[] = [];
  
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
    }
  };

  handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.onStateChange?.(this.state);
    this.onScoreChange?.(this.score);
    this.onLivesChange?.(this.lives);
    this.onLevelChange?.(this.level);
    this.initLevel();
  }

  initLevel() {
    this.aliens = [];
    this.bullets = [];
    this.particles = [];
    this.player.x = this.width / 2 - this.player.width / 2;
    
    const rows = 4 + Math.min(this.level, 3);
    const cols = 8;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.aliens.push({
          x: 80 + col * 70,
          y: 50 + row * 40,
          width: 40,
          height: 24,
          color: row % 2 === 0 ? '#9cd9ff' : '#fff09c',
          type: row % 2
        });
      }
    }
    
    this.alienMoveInterval = Math.max(100, 800 - this.level * 100);
    this.alienDirection = 1;
  }

  spawnParticles(x: number, y: number, color: string, count: number = 15) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 30 + 20,
        color,
        size: Math.random() * 4 + 2
      });
    }
  }

  update(dt: number) {
    if (this.state !== 'PLAYING') return;

    // Screen shake decay
    if (this.screenShake > 0) this.screenShake *= 0.9;
    if (this.screenShake < 0.1) this.screenShake = 0;

    // Player movement
    const speed = 300 * (dt / 1000);
    if ((this.keys['ArrowLeft'] || this.keys['KeyA']) && this.player.x > 0) {
      this.player.x -= speed;
    }
    if ((this.keys['ArrowRight'] || this.keys['KeyD']) && this.player.x < this.width - this.player.width) {
      this.player.x += speed;
    }

    // Player shooting
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if ((this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW']) && this.shootCooldown <= 0) {
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - 10,
        y: this.player.y - 10,
        width: 20,
        height: 20,
        color: '#ff9ce6',
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
            
            this.spawnParticles(a.x + a.width/2, a.y + a.height/2, '#ff9ce6', 25);
            this.aliens.splice(j, 1);
            this.bullets.splice(i, 1);
            hit = true;
            
            this.score += 10 * this.level;
            this.onScoreChange?.(this.score);
            playAlienHit();
            this.screenShake = 2;
            
            // Speed up slightly per kill
            this.alienMoveInterval = Math.max(50, this.alienMoveInterval - 5);
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

    // Alien movement
    this.alienMoveTimer += dt;
    if (this.alienMoveTimer > this.alienMoveInterval) {
      this.alienMoveTimer = 0;
      this.alienStep++;
      playAlienMove(this.alienStep);
      
      let hitEdge = false;
      for (const a of this.aliens) {
        if ((this.alienDirection === 1 && a.x + a.width > this.width - 20) ||
            (this.alienDirection === -1 && a.x < 20)) {
          hitEdge = true;
          break;
        }
      }
      
      if (hitEdge) {
        this.alienDirection *= -1;
        for (const a of this.aliens) {
          a.y += 20;
          if (a.y + a.height > this.player.y) {
            this.state = 'GAMEOVER';
            this.onStateChange?.(this.state);
            playPlayerDeath();
          }
        }
      } else {
        for (const a of this.aliens) {
          a.x += 15 * this.alienDirection;
        }
      }
      
      // Alien shooting
      if (this.aliens.length > 0 && Math.random() < 0.3 + (this.level * 0.05)) {
        const randomAlien = this.aliens[Math.floor(Math.random() * this.aliens.length)];
        this.bullets.push({
          x: randomAlien.x + randomAlien.width / 2 - 10,
          y: randomAlien.y + randomAlien.height,
          width: 20,
          height: 20,
          color: '#9cd9ff',
          vy: 300 + (this.level * 20),
          isPlayer: false
        });
      }
    }

    // Level complete
    if (this.aliens.length === 0) {
      this.level++;
      this.onLevelChange?.(this.level);
      this.initLevel();
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    // Clear with slight trail effect
    this.ctx.fillStyle = 'rgba(26, 16, 37, 0.4)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();

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
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = currentColor;
      
      this.ctx.fillText(this.playerFaceNormal, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    }

    // Draw Aliens
    this.ctx.font = '28px "VT323", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (const a of this.aliens) {
      this.ctx.fillStyle = a.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = a.color;
      
      let face = '';
      if (a.type === 0) {
        face = this.alienStep % 2 === 0 ? 'UwU' : 'OwO';
      } else {
        face = this.alienStep % 2 === 0 ? '>w<' : '^w^';
      }
      
      this.ctx.fillText(face, a.x + a.width / 2, a.y + a.height / 2);
    }

    // Draw Bullets
    this.ctx.font = '20px "VT323", monospace';
    for (const b of this.bullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = b.color;
      this.ctx.fillText(b.isPlayer ? '♥' : 'x', b.x + b.width/2, b.y + b.height/2);
    }

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = p.color;
      const alpha = 1 - (p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
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
