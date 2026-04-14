import { PongScene } from './PongScene.js';
import { Paddle } from './Paddle.js';
import { Ball } from './Ball.js';
import { GAME_CONFIG } from './constants.js';

export interface GameSettings {
	mode: 'pvp' | 'ai' | 'aix2';
	themeColor: number; // Hex code for the map walls
	ballSpeedMultiplier: number;
	paddleSpeedMultiplier: number;
	powerUpsEnabled: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
	mode: 'pvp',
	themeColor: 0x444444, // Default grey walls
	ballSpeedMultiplier: 1.0,
	paddleSpeedMultiplier: 1.0,
	powerUpsEnabled: false
};

// GameEngine.ts (Updated portions)
export class GameEngine {
	private sceneSetup: PongScene;
	private Lplayer: Paddle; // Left paddle
	private Rplayer: Paddle; // Right paddle
	private balls: Ball[] = []; // Array to handle power-up duplicates
	private settings: GameSettings;
	private keys: { [key: string]: boolean } = {};
	private isResetting: boolean = false;
	private score = { left: 0, right: 0 };

	constructor(canvasId: string, settings: GameSettings = DEFAULT_SETTINGS) {
		this.settings = settings;
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		
		// Pass theme to Scene
		this.sceneSetup = new PongScene(canvas, settings.themeColor);
		
		// Instantiation of paddles
		this.Lplayer = new Paddle(-GAME_CONFIG.PADDLE.POS_X,
			GAME_CONFIG.PADDLE.POS_Y,
			GAME_CONFIG.PADDLE.POS_Z, 
			GAME_CONFIG.PADDLE.COLOR, settings.paddleSpeedMultiplier); // left paddle
		this.Rplayer = new Paddle(GAME_CONFIG.PADDLE.POS_X,
			GAME_CONFIG.PADDLE.POS_Y,
			GAME_CONFIG.PADDLE.POS_Z,
			GAME_CONFIG.PADDLE.COLOR, settings.paddleSpeedMultiplier); // right paddle
		
		this.sceneSetup.scene.add(this.Lplayer.mesh);
		this.sceneSetup.scene.add(this.Rplayer.mesh);

		// Spawn initial ball
		this.spawnBall();

		// Optional: Trigger power-up randomly if enabled
		if (this.settings.powerUpsEnabled) {
			setInterval(() => this.triggerPowerUp(), 10000); // Check every 10s
		}

		window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
		window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

		this.gameLoop();
	}

	private spawnBall() {
		const newBall = new Ball(0, GAME_CONFIG.BALL.SPAWN_Y, 0, 0xfb2b2b, this.settings.ballSpeedMultiplier);
		this.balls.push(newBall);
		this.sceneSetup.scene.add(newBall.mesh);
	}

	private triggerPowerUp() {
		if (this.balls.length < 3) { // Limit max balls
			console.log("Power-up! Multi-ball!");
			this.spawnBall();
		}
	}

	private checkCollisions() {
		if (this.isResetting) return;

	// Derived constants for hit detection
	const PADDLE_HALF_DEPTH = GAME_CONFIG.PADDLE.DEPTH / 2;
	const COLLISION_X = GAME_CONFIG.PADDLE.POS_X - (GAME_CONFIG.PADDLE.WIDTH / 2) - GAME_CONFIG.BALL.RADIUS;
	const COLLISION_Z_RANGE = PADDLE_HALF_DEPTH + GAME_CONFIG.BALL.RADIUS;

	for (let i = 0; i < this.balls.length; i++) {
		const ball = this.balls[i];
		const ballPos = ball.mesh.position;
		
		// Define which paddle we are checking against based on ball position
		const isLeftZone = ballPos.x < 0;
		const paddle = isLeftZone ? this.Lplayer : this.Rplayer;
		const paddleZ = paddle.mesh.position.z;

		// Check X-axis proximity
		const isAtX = isLeftZone ? (ballPos.x <= -COLLISION_X) : (ballPos.x >= COLLISION_X);
		const isPastX = isLeftZone ? (ballPos.x > -(GAME_CONFIG.PADDLE.POS_X + 1)) : (ballPos.x < (GAME_CONFIG.PADDLE.POS_X + 1));

		if (isAtX && isPastX) {
			// Calculate distance from paddle center (Impact Point)
			const impact = ballPos.z - paddleZ;

			if (Math.abs(impact) <= COLLISION_Z_RANGE) {
				// 1. Directional Flip: Ensure ball moves away from the paddle
				ball.velocity.x = (isLeftZone ? 1 : -1) * Math.abs(ball.velocity.x) * 1.05;

				// 2. Trajectory Mapping: Map impact (-2.2 to 2.2) to Z velocity
				// This replaces the "V" bounce with a skill-based angle
				ball.velocity.z = impact * 0.15;

				// 3. Position Correction: Prevent the ball from getting stuck
				ballPos.x = isLeftZone ? -COLLISION_X : COLLISION_X;
			}
		}
	
		// Scoring Logic
		if (Math.abs(ballPos.x) > GAME_CONFIG.ARENA.SCORE_X) {
			this.isResetting = true;
			if (ballPos.x < 0) this.score.right++;
			else this.score.left++;
			
			this.sceneSetup.updateScore(this.score.left, this.score.right);

			setTimeout(() => {
				this.balls.forEach(b => this.sceneSetup.scene.remove(b.mesh));
				this.balls = [];
				this.spawnBall();
				this.isResetting = false;
			}, 1000);
			break; 
		}
	}
}
	private gameLoop = () => {
		requestAnimationFrame(this.gameLoop);

		if (this.balls.length > 0) {
			const targetBall = this.balls[0].mesh;
	
			if (this.settings.mode === 'ai' || this.settings.mode === 'aix2') {
				this.Rplayer.movementAI(targetBall);
			} else {
				if (this.keys['o'] || this.keys['arrowup']) this.Rplayer.moveUp();
				if (this.keys['l'] || this.keys['arrowdown']) this.Rplayer.moveDown();
			}
			if (this.settings.mode === 'aix2') {
				this.Lplayer.movementAI(targetBall);
			} else {
				if (this.keys['w']) this.Lplayer.moveUp();
				if (this.keys['s']) this.Lplayer.moveDown();
			}
		}

		// Update all balls
		this.balls.forEach(ball => ball.update());
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
		// 1. Gather settings from DOM
		const mode = (document.getElementById('config-mode') as HTMLSelectElement).value as 'pvp' | 'ai' | 'aix2';
		const themeColor = parseInt((document.getElementById('config-theme') as HTMLSelectElement).value);
		const speed = parseFloat((document.getElementById('config-speed') as HTMLSelectElement).value);
		const powerups = (document.getElementById('config-powerups') as HTMLInputElement).checked;

		const customSettings: GameSettings = {
			mode: mode,
			themeColor: themeColor,
			ballSpeedMultiplier: speed,
			paddleSpeedMultiplier: speed,
			powerUpsEnabled: powerups
		};

		// 2. Hide the menu
		menuDiv.style.display = 'none';

		// 3. Start the game with custom settings
		if (!pongInstance) {
			pongInstance = new GameEngine('pong-canvas', customSettings);
		}
	});
}
