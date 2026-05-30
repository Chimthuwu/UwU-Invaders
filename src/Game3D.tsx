import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from './store';
import { gameState, initLevel, spawnParticles, getId, GAME_BOUNDS } from './gameState';
import { playShoot, playAlienHit, playAlienMove, playPlayerDeath, updateFrequencyData } from './audio';

// --- GAME LOGIC LOOP ---
const GameLogic = () => {
  const { state, level, score, lives, setState, setScore, setLives, setLevel } = useGameStore();
  
  useFrame((_, delta) => {
    updateFrequencyData();
    if (state !== 'PLAYING') return;

    // Shake decay
    if (gameState.screenShake > 0) {
      gameState.screenShake *= 0.9;
      if (gameState.screenShake < 0.01) gameState.screenShake = 0;
    }

    // Player movement
    const speed = 15 * delta;
    if ((gameState.keys.left) && gameState.player.x > -GAME_BOUNDS.width / 2 + 1) {
      gameState.player.x -= speed;
    }
    if ((gameState.keys.right) && gameState.player.x < GAME_BOUNDS.width / 2 - 1) {
      gameState.player.x += speed;
    }

    // Player shooting
    if (gameState.player.cooldown > 0) gameState.player.cooldown -= delta;
    if (gameState.keys.space && gameState.player.cooldown <= 0) {
      gameState.bullets.push({
        id: getId(),
        x: gameState.player.x,
        y: gameState.player.y + 1,
        vy: 20,
        isPlayer: true,
        active: true,
        type: 'normal',
        size: 1,
      });
      gameState.player.cooldown = 0.25;
      playShoot();
    }

    // Bullets update
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
      const b = gameState.bullets[i];
      if (!b.active) continue;
      b.y += b.vy * delta;
      
      if (b.y > GAME_BOUNDS.height || b.y < -GAME_BOUNDS.height) {
        b.active = false;
        continue;
      }

      // Collisions
      if (b.isPlayer) {
        for (let j = 0; j < gameState.enemies.length; j++) {
          const a = gameState.enemies[j];
          if (!a.active) continue;
          
          if (Math.abs(b.x - a.x) < a.size && Math.abs(b.y - a.y) < a.size) {
            a.active = false;
            if (b.type !== 'orb') b.active = false;
            
            spawnParticles(a.x, a.y, a.colorType === 0 ? '#f0f' : '#ff0');
            setScore(s => s + 10 * level);
            playAlienHit();
            gameState.screenShake = 0.05;
            gameState.alienMoveInterval = Math.max(0.05, gameState.alienMoveInterval - 0.01);
            break;
          }
        }
      } else {
        if (Math.abs(b.x - gameState.player.x) < b.size && Math.abs(b.y - gameState.player.y) < b.size) {
          if (b.type !== 'orb') {
            b.active = false;
          }
          spawnParticles(gameState.player.x, gameState.player.y, '#0ff');
          setLives(l => l - 1);
          playPlayerDeath();
          gameState.screenShake = 0.5;
          
          if (lives - 1 <= 0) {
            setState('GAMEOVER');
          }
        }
      }
    }

    // Bombs update
    for (let i = gameState.bombs.length - 1; i >= 0; i--) {
      const bomb = gameState.bombs[i];
      bomb.life -= delta;
      if (bomb.life <= 0) {
        gameState.bombs.splice(i, 1);
        continue;
      }
      const dist = Math.hypot(bomb.x - gameState.player.x, bomb.y - (gameState.player.y + 10)); // bomb y is on floor
      if (dist < bomb.radius) {
        setLives(l => l - 1);
        playPlayerDeath();
        gameState.screenShake = 0.5;
        if (lives - 1 <= 0) {
          setState('GAMEOVER');
        }
        gameState.bombs.splice(i, 1);
      }
    }

    // Alien movement and shooting
    gameState.alienMoveTimer += delta;
    const activeEnemies = gameState.enemies.filter(e => e.active);

    for (const alien of activeEnemies) {
      if (alien.type === 'sniper') {
        if (alien.chargeTimer && alien.chargeTimer > 0) {
          alien.chargeTimer -= delta;
          if (alien.chargeTimer <= 0) {
            gameState.bullets.push({ id: getId(), x: alien.x, y: alien.y - 1, vy: -40, isPlayer: false, active: true, type: 'laser', size: 1 });
          }
        } else {
          if (Math.random() < 0.005) alien.chargeTimer = 2;
        }
      } else if (alien.type === 'bomber') {
        alien.y += alien.vy * delta;
        if (alien.bombTimer) alien.bombTimer -= delta;
        if (alien.bombTimer && alien.bombTimer <= 0) {
          gameState.bombs.push({ id: getId(), x: alien.x, y: -20, life: 3, maxLife: 3, radius: 5 });
          alien.bombTimer = 5 + Math.random() * 5;
        }
        if (alien.y < -GAME_BOUNDS.height) alien.active = false;
      }
    }

    if (gameState.alienMoveTimer > gameState.alienMoveInterval) {
      gameState.alienMoveTimer = 0;
      gameState.alienStep++;
      playAlienMove(gameState.alienStep);
      
      let hitEdge = false;
      for (const a of activeEnemies) {
        if (a.type === 'bomber') continue;
        if ((gameState.alienDirection === 1 && a.x > GAME_BOUNDS.width / 2 - 2) || (gameState.alienDirection === -1 && a.x < -GAME_BOUNDS.width / 2 + 2)) {
          hitEdge = true;
          break;
        }
      }
      
      if (hitEdge) {
        gameState.alienDirection *= -1;
        for (const a of activeEnemies) {
          if ((a.type === 'sniper' && a.chargeTimer && a.chargeTimer > 0) || a.type === 'bomber') continue;
          a.y -= 1.5;
          if (a.y < gameState.player.y + 1) {
            setState('GAMEOVER');
            playPlayerDeath();
          }
        }
      } else {
        for (const a of activeEnemies) {
          if ((a.type === 'sniper' && a.chargeTimer && a.chargeTimer > 0) || a.type === 'bomber') continue;
          a.x += 1.5 * gameState.alienDirection;
        }
      }
      
      for (const alien of activeEnemies) {
        if (alien.type === 'bruiser') {
          if (Math.random() < 0.05) gameState.bullets.push({ id: getId(), x: alien.x, y: alien.y - 1, vy: -5, isPlayer: false, active: true, type: 'orb', size: 2 });
        } else if (alien.type === 'normal') {
          if (Math.random() < 0.02 + (level * 0.005)) gameState.bullets.push({ id: getId(), x: alien.x, y: alien.y - 1, vy: -(10 + level * 2), isPlayer: false, active: true, type: 'normal', size: 1 });
        }
      }
    }

    if (activeEnemies.length === 0) {
      setLevel(l => l + 1);
      initLevel(level + 1);
    }

    for (let i = gameState.particles.length - 1; i >= 0; i--) {
      const p = gameState.particles[i];
      if (p.life <= 0) continue;
      p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta; p.life -= delta;
    }

    if (Math.random() < 0.05) {
      gameState.bullets = gameState.bullets.filter(b => b.active);
      gameState.particles = gameState.particles.filter(p => p.life > 0);
    }
  });

  return null;
};

const Player3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, gameState.player.x, 0.5);
      groupRef.current.position.y = gameState.player.y;
      const targetRoll = (gameState.keys.left ? 0.3 : 0) + (gameState.keys.right ? -0.3 : 0);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRoll, 0.1);
    }
  });
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}><coneGeometry args={[1, 2, 3]} /><meshStandardMaterial color="#111" roughness={0.9} metalness={0.1} /></mesh>
      <mesh position={[0, 0.2, 0.5]} rotation={[-Math.PI / 4, 0, 0]}><boxGeometry args={[0.6, 0.8, 0.4]} /><meshStandardMaterial color="#fff" roughness={0.1} metalness={1.0} /></mesh>
      <mesh position={[0, -0.5, -0.2]}><boxGeometry args={[2.2, 0.1, 0.5]} /><meshStandardMaterial color="#0ff" emissive="#0ff" emissiveIntensity={2} toneMapped={false} /></mesh>
      <mesh position={[0, -1.2, 0]}><cylinderGeometry args={[0.3, 0.1, 0.5]} /><meshStandardMaterial color="#0ff" emissive="#0ff" emissiveIntensity={5} toneMapped={false} /></mesh>
    </group>
  );
};

const Enemies3D = () => {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shardRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const whiteColor = useMemo(() => new THREE.Color('white'), []);

  useFrame((state) => {
    if (!shardRef.current || !coreRef.current) return;
    let shardIdx = 0, coreIdx = 0;
    for (const enemy of gameState.enemies) {
      if (!enemy.active) continue;
      dummy.position.set(enemy.x, enemy.y, 0);
      dummy.rotation.set(0, state.clock.elapsedTime, 0);
      let scale = enemy.size * 0.6;
      if (enemy.type === 'sniper') dummy.scale.set(scale * 0.7, scale * 1.5, scale * 0.7);
      else if (enemy.type === 'bomber') dummy.scale.set(scale * 1.2, scale * 0.5, scale);
      else dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      coreRef.current.setMatrixAt(coreIdx, dummy.matrix);
      if (enemy.type === 'sniper' && enemy.chargeTimer && enemy.chargeTimer > 0) {
        const chargeProgress = 1 - (enemy.chargeTimer / 2);
        coreRef.current.setColorAt(coreIdx, whiteColor.clone().lerp(new THREE.Color(enemy.colorType === 0 ? '#f0f' : '#ff0'), 1 - chargeProgress));
      } else coreRef.current.setColorAt(coreIdx, enemy.colorType === 0 ? new THREE.Color('#f0f') : new THREE.Color('#ff0'));
      coreIdx++;
      for (const shard of enemy.shards) {
        const time = state.clock.elapsedTime * 2 + shardIdx;
        const orbitX = Math.cos(time) * shard.dx * enemy.size;
        const orbitY = Math.sin(time) * shard.dy * enemy.size;
        const orbitZ = Math.sin(time * 0.5) * shard.dz * enemy.size;
        dummy.position.set(enemy.x + orbitX, enemy.y + orbitY, orbitZ);
        dummy.rotation.set(shard.rx + time, shard.ry + time, shard.rz + time);
        const shardScale = enemy.size * 0.4;
        dummy.scale.set(shardScale, shardScale, shardScale);
        dummy.updateMatrix();
        shardRef.current.setMatrixAt(shardIdx, dummy.matrix);
        shardIdx++;
      }
    }
    shardRef.current.count = shardIdx;
    coreRef.current.count = coreIdx;
    shardRef.current.instanceMatrix.needsUpdate = true;
    coreRef.current.instanceMatrix.needsUpdate = true;
    if (coreRef.current.instanceColor) coreRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={coreRef} args={[new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 100]} />
      <instancedMesh ref={shardRef} args={[new THREE.TetrahedronGeometry(), new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.7, metalness: 0.8 }), 500]} />
    </group>
  );
};

const Bullets3D = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const orbRef = useRef<THREE.InstancedMesh>(null);
  const laserRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !orbRef.current || !laserRef.current) return;
    let idx = 0, orbIdx = 0, laserIdx = 0;
    for (const b of gameState.bullets) {
      if (!b.active) continue;
      dummy.position.set(b.x, b.y, 0);
      if (b.type === 'orb') {
        const scale = b.size * 0.5;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        orbRef.current.setMatrixAt(orbIdx++, dummy.matrix);
      } else if (b.type === 'laser') {
        dummy.scale.set(0.1, 4, 0.1);
        dummy.updateMatrix();
        laserRef.current.setMatrixAt(laserIdx++, dummy.matrix);
      } else {
        const scale = b.size * 0.2;
        dummy.scale.set(scale, scale * 8, scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);
        meshRef.current.setColorAt(idx, b.isPlayer ? new THREE.Color('#0ff') : new THREE.Color('#f00'));
        idx++;
      }
    }
    meshRef.current.count = idx;
    orbRef.current.count = orbIdx;
    laserRef.current.count = laserIdx;
    meshRef.current.instanceMatrix.needsUpdate = true;
    orbRef.current.instanceMatrix.needsUpdate = true;
    laserRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={meshRef} args={[new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ emissiveIntensity: 3, toneMapped: false }), 200]} />
      <instancedMesh ref={orbRef} args={[new THREE.SphereGeometry(1, 16, 16), new THREE.MeshStandardMaterial({ color: '#ff4400', emissive: '#ff4400', emissiveIntensity: 2, toneMapped: false }), 50]} />
      <instancedMesh ref={laserRef} args={[new THREE.CylinderGeometry(0.5, 0.5, 1, 8), new THREE.MeshStandardMaterial({ color: '#00ff00', emissive: '#00ff00', emissiveIntensity: 4, toneMapped: false }), 50]} />
    </group>
  );
};

const Bombs3D = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current) return;
    let idx = 0;
    for (const bomb of gameState.bombs) {
      dummy.position.set(bomb.x, bomb.y, 0);
      const progress = 1 - bomb.life / bomb.maxLife;
      const scale = bomb.radius * progress;
      dummy.scale.set(scale, 1, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(idx, dummy.matrix);
      idx++;
    }
    meshRef.current.count = idx;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={meshRef} args={[new THREE.CylinderGeometry(1, 1, 0.2, 32), new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#ff0000', transparent: true, opacity: 0.5 }), 50]} />;
};

const Particles3D = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current) return;
    let idx = 0;
    for (const p of gameState.particles) {
      if (p.life <= 0) continue;
      dummy.position.set(p.x, p.y, p.z);
      const scale = p.life / p.maxLife;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(idx, dummy.matrix);
      meshRef.current.setColorAt(idx, new THREE.Color(p.color));
      idx++;
    }
    meshRef.current.count = idx;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={meshRef} args={[new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ emissiveIntensity: 2, toneMapped: false }), 1000]} />;
};

const VisualizerGridMaterial = shaderMaterial({uTime:0,uFrequencyData:new THREE.DataTexture(new Uint8Array(256),256,1,THREE.RedFormat),uColor:new THREE.Color('#f0f')},`uniform float uTime;uniform sampler2D uFrequencyData;varying float vDisplacement;varying vec2 vUv;void main(){vUv=uv;vDisplacement=0.;float freqIndex=uv.x;vDisplacement=texture2D(uFrequencyData,vec2(freqIndex,0.)).r*2.;vec3 pos=position;pos.y+=vDisplacement;gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);}`,`uniform float uTime;uniform vec3 uColor;varying float vDisplacement;varying vec2 vUv;void main(){float line_width=.02;float grid_x=step(fract(vUv.x*20.),line_width)+step(1.-line_width,fract(vUv.x*20.));float grid_y=step(fract(vUv.y*20.),line_width)+step(1.-line_width,fract(vUv.y*20.));float line=max(grid_x,grid_y);float glow=vDisplacement*.5;vec3 color=uColor*glow;gl_FragColor=vec4(color,line*(vDisplacement>.1?.9:.5));}`);
const VisualizerGrid = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const dataTexture = useMemo(() => {
    const texture = new THREE.DataTexture(gameState.frequencyData, 256, 1, THREE.RedFormat);
    texture.needsUpdate = true;
    return texture;
  }, []);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      dataTexture.needsUpdate = true;
    }
  });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]}><planeGeometry args={[200, 200, 256, 1]} /><VisualizerGridMaterial ref={materialRef} uFrequencyData={dataTexture} transparent={true} /></mesh>;
};

const Environment3D = () => {
  const buildingsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    if (!buildingsRef.current) return;
    let idx = 0;
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 20 + 15);
      const z = (Math.random() - 0.5) * 100 - 20;
      const y = -20 + Math.random() * 10;
      const height = Math.random() * 40 + 20;
      dummy.position.set(x, y + height/2, z);
      dummy.scale.set(Math.random() * 5 + 5, height, Math.random() * 5 + 5);
      dummy.updateMatrix();
      buildingsRef.current.setMatrixAt(idx++, dummy.matrix);
    }
    buildingsRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);
  return (
    <group>
      <fog attach="fog" args={['#050010', 10, 60]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[0, 10, 5]} intensity={0.5} color="#0ff" />
      <pointLight position={[0, -20, -10]} intensity={500} color="#f0f" distance={100} />
      <instancedMesh ref={buildingsRef} args={[new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: '#020202', roughness: 0.9, metalness: 0.1 }), 200]}>
        <lineSegments><edgesGeometry attach="geometry" args={[new THREE.BoxGeometry()]} /><lineBasicMaterial attach="material" color="#0ff" transparent opacity={0.1} /></lineSegments>
      </instancedMesh>
      <VisualizerGrid />
    </group>
  );
};

const CameraShake = () => {
  const { camera } = useThree();
  useFrame(() => {
    if (gameState.screenShake > 0) {
      camera.position.x = (Math.random() - 0.5) * gameState.screenShake;
      camera.position.y = (Math.random() - 0.5) * gameState.screenShake;
    } else {
      camera.position.x = 0;
      camera.position.y = 0;
    }
  });
  return null;
};

export const Game3D = () => {
  const { state } = useGameStore();
  return (
    <Canvas camera={{ position: [0, 0, 25], fov: 60 }}>
      <color attach="background" args={['#020005']} />
      <Environment3D />
      {state === 'PLAYING' && (
        <>
          <Player3D />
          <Enemies3D />
          <Bullets3D />
          <Bombs3D />
          <Particles3D />
          <GameLogic />
        </>
      )}
      <CameraShake />
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};
