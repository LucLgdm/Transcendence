import { PongScene } from './PongScene.js';
import { Paddle } from './Paddle.js';
import { Ball } from './Ball.js';
import * as THREE from 'three';
import { GAME_CONFIG } from './constants.js';

export interface GameSettings {
	mode: 'pvp' | 'ai' | 'aix2';
	themeColor: number;
	ballSpeedMultiplier: number;
	paddleSpeedMultiplier: number;
	powerUpsEnabled: boolean;
	aiDifficulty: 'easy' | 'normal' | 'hard' | 'wall';
}

export const DEFAULT_SETTINGS: GameSettings = {
	mode: 'pvp',
	themeColor: 0x444444,
	ballSpeedMultiplier: 1.0,
	paddleSpeedMultiplier: 1.0,
	powerUpsEnabled: false,
	aiDifficulty: 'normal'
};

export class GameEngine {
	private sceneSetup: PongScene;
	private Lplayer: Paddle;
	private Rplayer: Paddle;
	private ball!: Ball;
	private settings: GameSettings;
	private keys: { [key: string]: boolean } = {};
	private isResetting: boolean = false;
	private score = { left: 0, right: 0 };
	private powerUpMesh: THREE.Mesh | null = null;
	private powerUpType: 'speed' | 'slow' = 'speed';

	constructor(canvasId: string, settings: GameSettings = DEFAULT_SETTINGS) {
		this.settings = settings;
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		
		this.sceneSetup = new PongScene(canvas, settings.themeColor);
		
		this.Lplayer = new Paddle(-GAME_CONFIG.PADDLE.POS_X,
			GAME_CONFIG.PADDLE.POS_Y,
			GAME_CONFIG.PADDLE.POS_Z, 
			GAME_CONFIG.PADDLE.COLOR, settings.paddleSpeedMultiplier);
		this.Rplayer = new Paddle(GAME_CONFIG.PADDLE.POS_X,
			GAME_CONFIG.PADDLE.POS_Y,
			GAME_CONFIG.PADDLE.POS_Z,
			GAME_CONFIG.PADDLE.COLOR, settings.paddleSpeedMultiplier);
		
		this.sceneSetup.scene.add(this.Lplayer.mesh);
		this.sceneSetup.scene.add(this.Rplayer.mesh);

		this.spawnBall();

		if (this.settings.powerUpsEnabled) {
			setInterval(() => this.triggerPowerUp(), GAME_CONFIG.POWERUP.SPAWN_INTERVAL_MS);
		}

		window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
		window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

		this.gameLoop();
	}

	private spawnBall() {
		const newBall = new Ball(0, GAME_CONFIG.BALL.SPAWN_Y, 0, 0xfb2b2b, this.settings.ballSpeedMultiplier);
		this.ball = newBall;
		this.sceneSetup.scene.add(newBall.mesh);
	}
	
	private triggerPowerUp() {
			if (this.powerUpMesh || this.isResetting) return;

			// 50/50 chance for Speed (Green) or Slow (Blue)
			this.powerUpType = Math.random() > 0.5 ? 'speed' : 'slow';
			const color = this.powerUpType === 'speed' ? 0x00ff00 : 0x00aaff;

			const geometry = new THREE.SphereGeometry(GAME_CONFIG.POWERUP.RADIUS, 16, 16);
			const material = new THREE.MeshStandardMaterial({ color: color });
			this.powerUpMesh = new THREE.Mesh(geometry, material);

			const randomZ = (Math.random() - 0.5) * (GAME_CONFIG.ARENA.LIMIT_Z * 0.8);
			this.powerUpMesh.position.set(0, GAME_CONFIG.POWERUP.SPAWN_Y, randomZ);

			this.sceneSetup.scene.add(this.powerUpMesh);

			setTimeout(() => {
				if (this.powerUpMesh) {
					this.sceneSetup.scene.remove(this.powerUpMesh);
					this.powerUpMesh = null;
				}
			}, GAME_CONFIG.POWERUP.DURATION_MS);
		}

	private checkCollisions() {
		if (this.isResetting) return;

		const PADDLE_HALF_DEPTH = GAME_CONFIG.PADDLE.DEPTH / 2;
		const COLLISION_X = GAME_CONFIG.PADDLE.POS_X - (GAME_CONFIG.PADDLE.WIDTH / 2) - GAME_CONFIG.BALL.RADIUS;
		const COLLISION_Z_RANGE = PADDLE_HALF_DEPTH + GAME_CONFIG.BALL.RADIUS;

		const ballPos = this.ball.mesh.position;
				
		//collision power-up
		if (this.powerUpMesh) {
			const dx = ballPos.x - this.powerUpMesh.position.x;
			const dz = ballPos.z - this.powerUpMesh.position.z;
			const distance = Math.sqrt(dx * dx + dz * dz);

			if (distance <= GAME_CONFIG.BALL.RADIUS + GAME_CONFIG.POWERUP.RADIUS) {
				const multiplier = this.powerUpType === 'speed' ? GAME_CONFIG.POWERUP.SPEED_MULTIPLIER : GAME_CONFIG.POWERUP.SLOW_MULTIPLIER;
				this.ball.velocity.x *= multiplier;
				this.ball.velocity.z *= multiplier;

				this.sceneSetup.scene.remove(this.powerUpMesh);
				this.powerUpMesh = null;
			}
		}

		// Collision paddles
		const isLeftZone = ballPos.x < 0;
		const paddle = isLeftZone ? this.Lplayer : this.Rplayer;
		const paddleZ = paddle.mesh.position.z;

		const isAtX = isLeftZone ? (ballPos.x <= -COLLISION_X) : (ballPos.x >= COLLISION_X);
		const isPastX = isLeftZone 
			? (ballPos.x > -(GAME_CONFIG.PADDLE.POS_X + GAME_CONFIG.PADDLE.WIDTH)) 
			: (ballPos.x < (GAME_CONFIG.PADDLE.POS_X + GAME_CONFIG.PADDLE.WIDTH));
	
		if (isAtX && isPastX) {
			const impact = ballPos.z - paddleZ;

			if (Math.abs(impact) <= COLLISION_Z_RANGE) {
				this.ball.velocity.x = (isLeftZone ? 1 : -1) * Math.abs(this.ball.velocity.x) * GAME_CONFIG.PHYSICS.PADDLE_SPEED_INC;
				this.ball.velocity.z = impact * GAME_CONFIG.PHYSICS.IMPACT_FACTOR;
				ballPos.x = isLeftZone ? -COLLISION_X : COLLISION_X;
			}
		}

		// scoring logic
		if (Math.abs(ballPos.x) > GAME_CONFIG.ARENA.SCORE_X) {
			this.isResetting = true;
			if (ballPos.x < 0) this.score.right++;
			else this.score.left++;
			
			this.sceneSetup.updateScore(this.score.left, this.score.right);

			// Clear powerup if someone scores
			if (this.powerUpMesh) {
				this.sceneSetup.scene.remove(this.powerUpMesh);
				this.powerUpMesh = null;
			}

			setTimeout(() => {
				this.spawnBall();
				this.isResetting = false;
			}, GAME_CONFIG.PHYSICS.SCORE_DELAY_MS);
		}
	}
	
	private gameLoop = () => {
		requestAnimationFrame(this.gameLoop);

		if (this.ball) {
			const targetBall = this.ball.mesh;
	
			if (this.settings.mode === 'ai' || this.settings.mode === 'aix2') {
				this.Rplayer.movementAI(this.ball, this.settings.aiDifficulty);
			} else {
				if (this.keys['o'] || this.keys['arrowup']) this.Rplayer.moveUp();
				if (this.keys['l'] || this.keys['arrowdown']) this.Rplayer.moveDown();
			}
			if (this.settings.mode === 'aix2') {
				this.Lplayer.movementAI(this.ball, this.settings.aiDifficulty);
			} else {
				if (this.keys['w']) this.Lplayer.moveUp();
				if (this.keys['s']) this.Lplayer.moveDown();
			}
		}
		
		// Update ball
		if (this.ball) this.ball.update();
		this.checkCollisions();
		this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
	}
}

let pongInstance: GameEngine | null = null;

export function initPong(): void {
	const startBtn = document.getElementById('start-game-btn');
	const menuDiv = document.getElementById('pong-menu');

	if (!startBtn || !menuDiv) return;

	startBtn.addEventListener('click', () => {
		//Gather settings from DOM
		const mode = (document.getElementById('config-mode') as HTMLSelectElement).value as 'pvp' | 'ai' | 'aix2';
		const themeColor = parseInt((document.getElementById('config-theme') as HTMLSelectElement).value);
		const speed = parseFloat((document.getElementById('config-speed') as HTMLSelectElement).value);
		const powerups = (document.getElementById('config-powerups') as HTMLInputElement).checked;
		const aiDifficulty = (document.getElementById('config-ai-difficulty') as HTMLSelectElement).value as 'easy' | 'normal' | 'hard' | 'wall';

		const customSettings: GameSettings = {
			mode: mode,
			themeColor: themeColor,
			ballSpeedMultiplier: speed,
			paddleSpeedMultiplier: speed,
			powerUpsEnabled: powerups,
			aiDifficulty: aiDifficulty
		};

		menuDiv.style.display = 'none';

		if (!pongInstance) {
			pongInstance = new GameEngine('pong-canvas', customSettings);
		}
	});
}
