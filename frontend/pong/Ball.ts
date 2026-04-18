import * as THREE from 'three';
import { GAME_CONFIG } from './constants.js';

export class Ball {
	public mesh: THREE.Mesh;
	public velocity = { x: 0, z: 0 };

	constructor(x: number, y: number, z: number, color: number, speedMultiplier: number) {
		const geometry = new THREE.SphereGeometry(GAME_CONFIG.BALL.RADIUS, 32, 32);
		const material = new THREE.MeshStandardMaterial({ color : color });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.set(x, y, z);
		this.velocity.x = GAME_CONFIG.BALL.BASE_SPEED * (Math.random() > 0.5 ? 1 : -1) * speedMultiplier;
		this.velocity.z = GAME_CONFIG.BALL.BASE_SPEED * (Math.random() > 0.5 ? 1 : -1) * speedMultiplier;
	}

	reset() {
		this.mesh.position.set(0, GAME_CONFIG.BALL.SPAWN_Y, 0);
		
		// Randomize initial trajectory on reset
		this.velocity.x = (Math.random() > 0.5 ? 1 : -1) * GAME_CONFIG.BALL.RESET_VELOCITY_X;
		this.velocity.z = (Math.random() - 0.5) * GAME_CONFIG.BALL.RESET_VELOCITY_Z_MAX;

	}

	update() {
		this.mesh.position.x += this.velocity.x;
		this.mesh.position.z += this.velocity.z;

		// Top/Bottom wall bounce (Z-axis)
		if (Math.abs(this.mesh.position.z) > GAME_CONFIG.ARENA.LIMIT_Z) {
			this.velocity.z *= -1;
		}
	}
}
