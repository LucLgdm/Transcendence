import * as THREE from 'three';
import { GAME_CONFIG } from './constants.js';

export class Paddle {
	public mesh: THREE.Mesh;
	public speed: number;

	constructor(x: number, y: number, z : number, color: number, speedMultiplier: number) {
		const geometry = new THREE.BoxGeometry(
			GAME_CONFIG.PADDLE.WIDTH, 
			GAME_CONFIG.PADDLE.HEIGHT, 
			GAME_CONFIG.PADDLE.DEPTH
		);
		const material = new THREE.MeshStandardMaterial({ color: color });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.set(x, y, z);
		this.speed = GAME_CONFIG.PADDLE.BASE_SPEED * speedMultiplier;
	}

	// Vertical movement constrained by arena boundaries
	moveUp() { 
		if (this.mesh.position.z > -GAME_CONFIG.ARENA.LIMIT_Z) {
			this.mesh.position.z -= this.speed; 
		}
	}
	
	moveDown() { 
		if (this.mesh.position.z < GAME_CONFIG.ARENA.LIMIT_Z) {
			this.mesh.position.z += this.speed; 
		}
	}
	
	movementAI(ballMesh: THREE.Mesh) {
		const ballZ = ballMesh.position.z;
		const paddleZ = this.mesh.position.z;
	
		if (ballZ < paddleZ - GAME_CONFIG.PADDLE.AI_DEADZONE) {
			this.moveUp();
		} else if (ballZ > paddleZ + GAME_CONFIG.PADDLE.AI_DEADZONE) {
			this.moveDown();
		}
	}
}
