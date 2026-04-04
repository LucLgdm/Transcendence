import * as THREE from 'three';

export class Paddle {
	public mesh: THREE.Mesh;
	public speed: number = 0.2;

	constructor(x: number, color: number) {
		const geometry = new THREE.BoxGeometry(1, 0.5, 4); // Width, Height, Depth
		const material = new THREE.MeshStandardMaterial({ color: color });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.set(x, 0.25, 0); // Put it on the "floor"
	}

	moveUp() { this.mesh.position.z -= this.speed; }
	moveDown() { this.mesh.position.z += this.speed; }
}
