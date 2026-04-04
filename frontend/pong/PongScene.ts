import * as THREE from 'three';

export class PongScene {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;
	public renderer: THREE.WebGLRenderer;

	constructor(canvas: HTMLCanvasElement) {
		this.scene = new THREE.Scene();
		
		const w = canvas.clientWidth || 600;
		const h = canvas.clientHeight || 400;
		
		// Setup Camera: FOV, Aspect, Near, Far
		this.scene.background = new THREE.Color(0x111111);
		this.camera = new THREE.PerspectiveCamera(75, w/h, 0.1, 1000);
		this.camera.position.set(0, 10, 15); // High and back
		this.camera.lookAt(0, 0, 0); // Point at the center

		// Setup Renderer
		this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(w, h, false);

		// Add some light or you won't see anything!
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		this.scene.add(ambientLight);
		const pointLight = new THREE.PointLight(0xffffff, 1);
		pointLight.position.set(5, 5, 5);
		this.scene.add(pointLight);
	}
}
