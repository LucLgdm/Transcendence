import { PongScene } from './PongScene.js';
import { Paddle } from './Paddle.js';
import { Ball } from './Ball.js';

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
	private player: Paddle;
	private Splayer: Paddle;
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
		
		// Pass speed multipliers to Paddles
		this.player = new Paddle(-12, 0.25, 0, 0x312bfb, settings.paddleSpeedMultiplier);
		this.Splayer = new Paddle(12, 0.25, 0, 0x312bfb, settings.paddleSpeedMultiplier);
		
		this.sceneSetup.scene.add(this.player.mesh);
		this.sceneSetup.scene.add(this.Splayer.mesh);

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
		const newBall = new Ball(0, 0.4, 0, 0xfb2b2b, this.settings.ballSpeedMultiplier);
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

		// Loop through ALL active balls
		for (let i = 0; i < this.balls.length; i++) {
			const ball = this.balls[i];
			const ballPos = ball.mesh.position;
			const p1Pos = this.player.mesh.position;
			const p2Pos = this.Splayer.mesh.position;

			// Player 1 Collision
			if (ballPos.x < -11.5 && ballPos.x > -12.5 && Math.abs(ballPos.z - p1Pos.z) < 2.2) {
				ball.velocity.x = Math.abs(ball.velocity.x) * 1.05;
			}
			// Player 2 Collision
			if (ballPos.x > 11.5 && ballPos.x < 12.5 && Math.abs(ballPos.z - p2Pos.z) < 2.2) {
				ball.velocity.x = -Math.abs(ball.velocity.x) * 1.05;
			}

			// Scoring Logic
			if (Math.abs(ballPos.x) > 15) {
				this.isResetting = true;
				if (ballPos.x < 0) this.score.right++;
				else this.score.left++;
				
				this.sceneSetup.updateScore(this.score.left, this.score.right);

				setTimeout(() => {
					// Reset to single ball on score
					this.balls.forEach(b => this.sceneSetup.scene.remove(b.mesh));
					this.balls = [];
					this.spawnBall();
					this.isResetting = false;
				}, 1000);
				break; // Stop checking other balls this frame if someone scored
			}
		}
	}

	private gameLoop = () => {
		requestAnimationFrame(this.gameLoop);

		if (this.balls.length > 0) {
			const targetBall = this.balls[0].mesh;
	
			if (this.settings.mode === 'ai' || this.settings.mode === 'aix2') {
				this.Splayer.movementAI(targetBall);
			} else {
				if (this.keys['o'] || this.keys['arrowup']) this.Splayer.moveUp();
				if (this.keys['l'] || this.keys['arrowdown']) this.Splayer.moveDown();
			}
			if (this.settings.mode === 'aix2') {
				this.player.movementAI(targetBall);
			} else {
				if (this.keys['w']) this.player.moveUp();
				if (this.keys['s']) this.player.moveDown();
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
		const mode = (document.getElementById('config-mode') as HTMLSelectElement).value as 'pvp' | 'ai';
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
