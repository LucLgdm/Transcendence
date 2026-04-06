import * as THREE from 'three';

export class Ball {
	public mesh: THREE.Mesh;
	public velocity = { x: 0.15, z: 0.12 };

	constructor(x: number, y: number, z: number, color: number) {
		const geometry = new THREE.SphereGeometry(0.4, 32, 32);
		const material = new THREE.MeshStandardMaterial({ color : color });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.set(x, y, z);
	}

	reset() {
		this.mesh.position.set(0, 0.1, 0);
		// Randomize initial trajectory on reset
		this.velocity.x = (Math.random() > 0.5 ? 1 : -1) * 0.15;
		this.velocity.z = (Math.random() - 0.5) * 0.2;
	}

	update() {
		this.mesh.position.x += this.velocity.x;
		this.mesh.position.z += this.velocity.z;

		// Top/Bottom wall bounce (Z-axis)
		if (Math.abs(this.mesh.position.z) > 7) {
			this.velocity.z *= -1;
		}
	}
}
