import { PongScene } from './PongScene.js';
import { Paddle } from './Paddle.js';
import { Ball } from './Ball.js';

export class GameEngine {
	private sceneSetup: PongScene;
	private player: Paddle;
	private ball: Ball;
	private keys: { [key: string]: boolean } = {};

	constructor(canvasId: string) {
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		this.sceneSetup = new PongScene(canvas);
		
		this.player = new Paddle(-12, 0x00ff00);
		this.ball = new Ball();

		this.sceneSetup.scene.add(this.player.mesh);
		this.sceneSetup.scene.add(this.ball.mesh);

		window.addEventListener('keydown', (e) => this.keys[e.key] = true);
		window.addEventListener('keyup', (e) => this.keys[e.key] = false);

		this.gameLoop();
	}

	private gameLoop = () => {
		requestAnimationFrame(this.gameLoop);

		// 1. Handle Input
		if (this.keys['w'] || this.keys['ArrowUp']) this.player.moveUp();
		if (this.keys['s'] || this.keys['ArrowDown']) this.player.moveDown();

		// 2. Update Physics
		this.ball.update();

		// 3. Render
		this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
	}
}

let pongInstance: GameEngine | null = null;

export function initPong(): void {
	const canvas = document.getElementById('pong-canvas');
	if (!canvas) {
		console.warn("Canvas not found");
		return; 
	}
	if (!pongInstance) {
		console.log("Initializing Pong");
		pongInstance = new GameEngine('pong-canvas');
	}
}
