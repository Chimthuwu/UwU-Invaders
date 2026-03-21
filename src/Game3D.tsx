import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from './store';
import { gameState, initLevel, spawnParticles, getId, GAME_BOUNDS } from './gameState';
import { playShoot, playAlienHit, playAlienMove, playPlayerDeath } from './audio';

// --- GAME LOGIC LOOP ---
const GameLogic = () => {
  const { state, level, score, lives, setState, setScore, setLives, setLevel } = useGameStore();
  
  useFrame((_, delta) => {
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
        active: true
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
        let hit = false;
        for (let j = 0; j < gameState.enemies.length; j++) {
          const a = gameState.enemies[j];
          if (!a.active) continue;
          
          if (Math.abs(b.x - a.x) < 1.0 && Math.abs(b.y - a.y) < 1.0) {
            a.active = false;
            b.active = false;
            hit = true;
            
            spawnParticles(a.x, a.y, a.type === 0 ? '#f0f' : '#ff0');
            setScore(s => s + 10 * level);
            playAlienHit();
            gameState.screenShake = 0.05;
            gameState.alienMoveInterval = Math.max(0.05, gameState.alienMoveInterval - 0.01);
            break;
          }
        }
      } else {
        if (Math.abs(b.x - gameState.player.x) < 1.0 && Math.abs(b.y - gameState.player.y) < 1.0) {
          b.active = false;
          spawnParticles(gameState.player.x, gameState.player.y, '#0ff', 30);
          setLives(l => l - 1);
          playPlayerDeath();
          gameState.screenShake = 0.5;
          
          if (lives - 1 <= 0) {
            setState('GAMEOVER');
          }
        }
      }
    }

    // Alien movement
    gameState.alienMoveTimer += delta;
    if (gameState.alienMoveTimer > gameState.alienMoveInterval) {
      gameState.alienMoveTimer = 0;
      gameState.alienStep++;
      playAlienMove(gameState.alienStep);
      
      let hitEdge = false;
      const activeEnemies = gameState.enemies.filter(e => e.active);
      
      for (const a of activeEnemies) {
        if ((gameState.alienDirection === 1 && a.x > GAME_BOUNDS.width / 2 - 2) ||
            (gameState.alienDirection === -1 && a.x < -GAME_BOUNDS.width / 2 + 2)) {
          hitEdge = true;
          break;
        }
      }
      
      if (hitEdge) {
        gameState.alienDirection *= -1;
        for (const a of activeEnemies) {
          a.y -= 1.5;
          if (a.y < gameState.player.y + 1) {
            setState('GAMEOVER');
            playPlayerDeath();
          }
        }
      } else {
        for (const a of activeEnemies) {
          a.x += 1.5 * gameState.alienDirection;
        }
      }
      
      // Alien shooting
      if (activeEnemies.length > 0 && Math.random() < 0.3 + (level * 0.05)) {
        const randomAlien = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
        gameState.bullets.push({
          id: getId(),
          x: randomAlien.x,
          y: randomAlien.y - 1,
          vy: -(10 + level * 2),
          isPlayer: false,
          active: true
        });
      }
    }

    // Level complete
    if (gameState.enemies.filter(e => e.active).length === 0) {
      setLevel(l => l + 1);
      initLevel(level + 1);
    }

    // Particles update
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
      const p = gameState.particles[i];
      if (p.life <= 0) continue;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.life -= delta;
    }

    // Cleanup arrays occasionally
    if (Math.random() < 0.05) {
      gameState.bullets = gameState.bullets.filter(b => b.active);
      gameState.particles = gameState.particles.filter(p => p.life > 0);
    }
  });

  return null;
};

// --- RENDER COMPONENTS ---

const Player3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, gameState.player.x, 0.5);
      groupRef.current.position.y = gameState.player.y;
      
      // Tilt based on movement
      const targetRoll = (gameState.keys.left ? 0.3 : 0) + (gameState.keys.right ? -0.3 : 0);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRoll, 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Hull - Matte Black */}
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[1, 2, 3]} />
        <meshStandardMaterial color="#111" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Chrome Canopy */}
      <mesh position={[0, 0.2, 0.5]} rotation={[-Math.PI / 4, 0, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshStandardMaterial color="#fff" roughness={0.1} metalness={1.0} />
      </mesh>
      {/* Cyan Emissive Edges */}
      <mesh position={[0, -0.5, -0.2]}>
        <boxGeometry args={[2.2, 0.1, 0.5]} />
        <meshStandardMaterial color="#0ff" emissive="#0ff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* Thruster */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.3, 0.1, 0.5]} />
        <meshStandardMaterial color="#0ff" emissive="#0ff" emissiveIntensity={5} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Enemies3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { level } = useGameStore();
  
  // Create instanced meshes for performance
  const maxEnemies = 100;
  const maxShards = 5;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const magentaMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f0f', emissive: '#f0f', emissiveIntensity: 2, toneMapped: false }), []);
  const yellowMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff0', emissive: '#ff0', emissiveIntensity: 2, toneMapped: false }), []);
  const armorMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.7, metalness: 0.8 }), []);

  const shardRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    if (!shardRef.current || !coreRef.current) return;
    
    let shardIdx = 0;
    let coreIdx = 0;
    
    for (let i = 0; i < gameState.enemies.length; i++) {
      const enemy = gameState.enemies[i];
      if (!enemy.active) continue;
      
      // Core
      dummy.position.set(enemy.x, enemy.y, 0);
      dummy.rotation.set(0, state.clock.elapsedTime, 0);
      dummy.scale.set(0.6, 0.6, 0.6);
      dummy.updateMatrix();
      coreRef.current.setMatrixAt(coreIdx, dummy.matrix);
      coreRef.current.setColorAt(coreIdx, enemy.type === 0 ? new THREE.Color('#f0f') : new THREE.Color('#ff0'));
      coreIdx++;
      
      // Shards orbiting
      for (let j = 0; j < enemy.shards.length; j++) {
        const shard = enemy.shards[j];
        const time = state.clock.elapsedTime * 2 + j;
        const orbitX = Math.cos(time) * shard.dx;
        const orbitY = Math.sin(time) * shard.dy;
        const orbitZ = Math.sin(time * 0.5) * shard.dz;
        
        dummy.position.set(enemy.x + orbitX, enemy.y + orbitY, orbitZ);
        dummy.rotation.set(shard.rx + time, shard.ry + time, shard.rz + time);
        dummy.scale.set(0.4, 0.4, 0.4);
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
    <group ref={groupRef}>
      <instancedMesh ref={coreRef} args={[new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), maxEnemies]} />
      <instancedMesh ref={shardRef} args={[new THREE.TetrahedronGeometry(), armorMaterial, maxEnemies * maxShards]} />
    </group>
  );
};

const Bullets3D = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!meshRef.current) return;
    let idx = 0;
    for (let i = 0; i < gameState.bullets.length; i++) {
      const b = gameState.bullets[i];
      if (!b.active) continue;
      
      dummy.position.set(b.x, b.y, 0);
      dummy.scale.set(0.2, 1.5, 0.2);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(idx, dummy.matrix);
      meshRef.current.setColorAt(idx, b.isPlayer ? new THREE.Color('#0ff') : new THREE.Color('#f00'));
      idx++;
    }
    meshRef.current.count = idx;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ emissiveIntensity: 3, toneMapped: false }), 200]} />
  );
};

const Particles3D = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!meshRef.current) return;
    let idx = 0;
    for (let i = 0; i < gameState.particles.length; i++) {
      const p = gameState.particles[i];
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

  return (
    <instancedMesh ref={meshRef} args={[new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ emissiveIntensity: 2, toneMapped: false }), 1000]} />
  );
};

const Environment3D = () => {
  const buildingsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (!buildingsRef.current) return;
    let idx = 0;
    // Create an infinite city canyon
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
        {/* Wireframe edges for synthwave feel */}
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry()]} />
          <lineBasicMaterial attach="material" color="#0ff" transparent opacity={0.1} />
        </lineSegments>
      </instancedMesh>
      
      {/* Grid Floor */}
      <gridHelper args={[200, 100, '#f0f', '#222']} position={[0, -20, 0]} />
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
