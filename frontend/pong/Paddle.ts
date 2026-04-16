import * as THREE from 'three';
import { GAME_CONFIG } from './constants.js';

export class Paddle {
	public mesh: THREE.Mesh;
	public speed: number;
	private reactionTimer: number = 0;
	private lastBallDirX: number = 0;
	private predictedZ: number = 0;

	constructor(x: number, y: number, z: number, color: number, speedMultiplier: number) {
		const geometry = new THREE.BoxGeometry(GAME_CONFIG.PADDLE.WIDTH, GAME_CONFIG.PADDLE.HEIGHT, GAME_CONFIG.PADDLE.DEPTH);
		const material = new THREE.MeshStandardMaterial({ color: color });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.set(x, y, z);
		this.speed = GAME_CONFIG.PADDLE.BASE_SPEED * speedMultiplier;
	}

	// Moves paddle up
	moveUp() {
		if (this.mesh.position.z > -GAME_CONFIG.PADDLE.LIMIT_Z) {
			this.mesh.position.z -= this.speed;
		}
	}

	// Moves paddle down
	moveDown() {
		if (this.mesh.position.z < GAME_CONFIG.PADDLE.LIMIT_Z) {
			this.mesh.position.z += this.speed;
		}
	}

	movementAI(ball: any, difficulty: string) {
		const ballMesh = ball.mesh;
		const paddleZ = this.mesh.position.z;

		if (Math.sign(ball.velocity.x) !== this.lastBallDirX) {
			this.lastBallDirX = Math.sign(ball.velocity.x);
			const diffKey = difficulty.toUpperCase() as keyof typeof GAME_CONFIG.AI.REACTION_FRAMES;
			this.reactionTimer = GAME_CONFIG.AI.REACTION_FRAMES[diffKey] || 0;
		}

		if (difficulty === 'wall') {
			this.predictedZ = this.calculatePrediction(ball);
		}

		if (this.reactionTimer > 0) {
			this.reactionTimer--;
			return;
		}

		const targetZ = (difficulty === 'wall') ? this.predictedZ : ballMesh.position.z;

		if (targetZ < paddleZ - GAME_CONFIG.PADDLE.AI_DEADZONE) {
			this.moveUp();
		} else if (targetZ > paddleZ + GAME_CONFIG.PADDLE.AI_DEADZONE) {
			this.moveDown();
		}
	}

	private calculatePrediction(ball: any): number {
		if (Math.sign(ball.velocity.x) !== Math.sign(this.mesh.position.x)) {
			return 0; 
		}

		const distToPaddle = Math.abs(this.mesh.position.x - ball.mesh.position.x);
		const timeToHit = distToPaddle / Math.abs(ball.velocity.x);
		let rawZ = ball.mesh.position.z + (ball.velocity.z * timeToHit);

		const limit = GAME_CONFIG.ARENA.LIMIT_Z;
		const arenaHeight = limit * 2;
		
		let shiftedZ = rawZ + limit; 
		let modZ = ((shiftedZ % arenaHeight) + arenaHeight) % arenaHeight; 
		let bounces = Math.floor(shiftedZ / arenaHeight);
		
		if (Math.abs(bounces) % 2 === 1) {
			return limit - modZ;
		} else {
			return modZ - limit;
		}
	}
}
