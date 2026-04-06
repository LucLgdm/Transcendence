import { PongScene } from './PongScene.js';
import { Paddle } from './Paddle.js';
import { Ball } from './Ball.js';

export class GameEngine {
	private sceneSetup: PongScene;
	private player: Paddle;
	private Splayer : Paddle;
	private ball: Ball;
	private keys: { [key: string]: boolean } = {};
	private isResetting: boolean = false;
	
	private score = { left: 0, right: 0 };

	constructor(canvasId: string) {
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		this.sceneSetup = new PongScene(canvas);
		
		this.player = new Paddle(-12, 0.25, 0, 0x312bfb);
		this.ball = new Ball(0, 0.4, 0, 0xfb2b2b);
		this.Splayer = new Paddle(12, 0.25, 0, 0x312bfb);
		
		this.sceneSetup.scene.add(this.player.mesh);
		this.sceneSetup.scene.add(this.ball.mesh);
		this.sceneSetup.scene.add(this.Splayer.mesh);

		window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
		window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

		this.gameLoop();
	}

	private checkCollisions() {
		// Suspend physics during reset phase
		if (this.isResetting) return;
	
		const ballPos = this.ball.mesh.position;
		const p1Pos = this.player.mesh.position;
		const p2Pos = this.Splayer.mesh.position;
	
		// Player 1 (Left) Collision
		if (ballPos.x < -11.5 && ballPos.x > -12.5) {
			if (Math.abs(ballPos.z - p1Pos.z) < 2.2) {
				this.ball.velocity.x = Math.abs(this.ball.velocity.x);
				this.ball.velocity.x *= 1.05; // Progressive speed increase
			}
		}
	
		// Player 2 (Right) Collision
		if (ballPos.x > 11.5 && ballPos.x < 12.5) {
			if (Math.abs(ballPos.z - p2Pos.z) < 2.2) {
				this.ball.velocity.x = -Math.abs(this.ball.velocity.x);
				this.ball.velocity.x *= 1.05;
			}
		}
	
		// Out-of-bounds / Goal Detection
		if (Math.abs(ballPos.x) > 15) {
			this.isResetting = true;
	
			if (ballPos.x < 0) {
				this.score.right++;
			} else {
				this.score.left++;
			}
	
			this.sceneSetup.updateScore(this.score.left, this.score.right);
	
			// 1s delay to signal point loss before next round
			setTimeout(() => {
				this.ball.reset();
				this.isResetting = false;
			}, 1000);
		}
	}
	
	private gameLoop = () => {
		requestAnimationFrame(this.gameLoop);

		// Player 1 Input (W/S)
		if (this.keys['w']) this.player.moveUp();
		if (this.keys['s']) this.player.moveDown();

		// Player 2 Input (O/L or Arrows)
		if (this.keys['o'] || this.keys['arrowup']) this.Splayer.moveUp();
		if (this.keys['l'] || this.keys['arrowdown']) this.Splayer.moveDown();

		this.ball.update();
		this.checkCollisions();

		this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
	}
}

let pongInstance: GameEngine | null = null;

export function initPong(): void {
	const canvas = document.getElementById('pong-canvas');
	if (!canvas) {
		console.warn("Pong initialization failed: Canvas not found");
		return; 
	}
	if (!pongInstance) {
		pongInstance = new GameEngine('pong-canvas');
	}
}
