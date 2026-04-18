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
	private matchEnded = false;
	private alive = true;
	private rafId: number | null = null;
	private powerUpIntervalId: ReturnType<typeof setInterval> | null = null;
	private readonly boundKeyDown = (e: KeyboardEvent): void => {
		this.keys[e.key.toLowerCase()] = true;
	};
	private readonly boundKeyUp = (e: KeyboardEvent): void => {
		this.keys[e.key.toLowerCase()] = false;
	};

	private static readonly keyListenerOpts: AddEventListenerOptions = { passive: true };

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
			this.powerUpIntervalId = setInterval(() => this.triggerPowerUp(), GAME_CONFIG.POWERUP.SPAWN_INTERVAL_MS);
		}
		window.addEventListener('keydown', this.boundKeyDown, GameEngine.keyListenerOpts);
		window.addEventListener('keyup', this.boundKeyUp, GameEngine.keyListenerOpts);

		this.gameLoop();
	}
	dispose(): void {
		this.alive = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		window.removeEventListener('keydown', this.boundKeyDown, GameEngine.keyListenerOpts);
		window.removeEventListener('keyup', this.boundKeyUp, GameEngine.keyListenerOpts);
		if (this.powerUpIntervalId !== null) {
			clearInterval(this.powerUpIntervalId);
			this.powerUpIntervalId = null;
		}
		this.sceneSetup.renderer.dispose();
	}

	private spawnBall() {
		const newBall = new Ball(0, GAME_CONFIG.BALL.SPAWN_Y, 0, 0xfb2b2b, this.settings.ballSpeedMultiplier);
		this.ball = newBall;
		this.sceneSetup.scene.add(newBall.mesh);
	}

	private triggerPowerUp() {
		if (this.powerUpMesh || this.isResetting || this.matchEnded) return;

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
		if (this.matchEnded || this.isResetting) return;

		const PADDLE_HALF_DEPTH = GAME_CONFIG.PADDLE.DEPTH / 2;
		const COLLISION_X = GAME_CONFIG.PADDLE.POS_X - (GAME_CONFIG.PADDLE.WIDTH / 2) - GAME_CONFIG.BALL.RADIUS;
		const COLLISION_Z_RANGE = PADDLE_HALF_DEPTH + GAME_CONFIG.BALL.RADIUS;

		const ballPos = this.ball.mesh.position;

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

		if (Math.abs(ballPos.x) > GAME_CONFIG.ARENA.SCORE_X) {
			this.isResetting = true;
			if (ballPos.x < 0) this.score.right++;
			else this.score.left++;
			this.sceneSetup.updateScore(this.score.left, this.score.right);

			if (this.powerUpMesh) {
				this.sceneSetup.scene.remove(this.powerUpMesh);
				this.powerUpMesh = null;
			}

			const winScore = GAME_CONFIG.MATCH.WIN_SCORE;
			if (this.score.left >= winScore || this.score.right >= winScore) {
				const winner: 'left' | 'right' = this.score.left >= winScore ? 'left' : 'right';
				this.matchEnded = true;
				setTimeout(() => this.finishMatchWithWinner(winner), GAME_CONFIG.PHYSICS.SCORE_DELAY_MS);
				return;
			}

			setTimeout(() => {
				this.spawnBall();
				this.isResetting = false;
			}, GAME_CONFIG.PHYSICS.SCORE_DELAY_MS);
		}
	}

	private finishMatchWithWinner(winner: 'left' | 'right'): void {
		const msg = document.getElementById('pong-result-msg');
		const menu = document.getElementById('pong-menu');
		const winScore = GAME_CONFIG.MATCH.WIN_SCORE;
		const label = winner === 'left' ? 'Camp gauche (W / S)' : 'Camp droit (O / L ou flèches)';
		if (msg) {
			msg.textContent = `Partie terminée - ${winner} gagne !`;
			msg.hidden = false;
		}
		if (pongInstance === this) {
			pongInstance = null;
		}
		this.dispose();
		if (menu) menu.style.display = 'flex';
		setPongCanvasPlaying(false);
	}

	private gameLoop = (): void => {
		if (!this.alive) return;
		this.rafId = requestAnimationFrame(this.gameLoop);

		if (!this.matchEnded) {
			if (this.ball) {
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
		}

		this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
	};
}

let pongInstance: GameEngine | null = null;
let pongMenuListenersBound = false;

function setPongCanvasPlaying(playing: boolean): void {
	const stack = document.getElementById('pong-canvas-stack');
	if (!stack) return;
	stack.classList.toggle('pong-playing', playing);
}

export function disposePongIfAny(): void {
	if (pongInstance) {
		pongInstance.dispose();
		pongInstance = null;
	}
	setPongCanvasPlaying(false);
}

export function initPong(): void {
	const startBtn = document.getElementById('start-game-btn');
	const menuDiv = document.getElementById('pong-menu');

	if (!startBtn || !menuDiv) return;

	const resultMsg = document.getElementById('pong-result-msg');
	if (resultMsg) {
		resultMsg.hidden = true;
		resultMsg.textContent = '';
	}

	menuDiv.style.display = 'flex';
	setPongCanvasPlaying(false);

	if (pongMenuListenersBound) return;
	pongMenuListenersBound = true;

	startBtn.addEventListener('click', () => {
		const mode = (document.getElementById('config-mode') as HTMLSelectElement).value as 'pvp' | 'ai' | 'aix2';
		const themeColor = parseInt((document.getElementById('config-theme') as HTMLSelectElement).value, 16);
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
		setPongCanvasPlaying(true);

		if (pongInstance) {
			pongInstance.dispose();
			pongInstance = null;
		}
		pongInstance = new GameEngine('pong-canvas', customSettings);
	});
}
