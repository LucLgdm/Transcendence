import * as THREE from 'three';

export class Paddle {
	public mesh: THREE.Mesh;
	public speed: number = 0.2;

	constructor(x: number, y: number, z : number, color: number) {
		// [Width, Height, Depth]
		const geometry = new THREE.BoxGeometry(1, 0.5, 4); 
		const material = new THREE.MeshStandardMaterial({ color: color });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.set(x, y, z);
	}

	// Vertical movement constrained by arena boundaries
	moveUp() { 
		if (this.mesh.position.z > -5) {
			this.mesh.position.z -= this.speed; 
		}
	}
	
	moveDown() { 
		if (this.mesh.position.z < 5) {
			this.mesh.position.z += this.speed; 
		}
	}
}
