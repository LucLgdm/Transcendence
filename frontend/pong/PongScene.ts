import * as THREE from 'three';

export class PongScene {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;
	public renderer: THREE.WebGLRenderer;
	
	private scoreTexture: THREE.CanvasTexture;
	private scoreContext: CanvasRenderingContext2D;
	private scoreCanvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement, themeColor: number) {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x111111);
		
		const w = canvas.clientWidth || 600;
		const h = canvas.clientHeight || 400;
		
		this.camera = new THREE.PerspectiveCamera(75, w/h, 0.1, 1000);
		this.camera.position.set(0, 15, 18);
		this.camera.lookAt(0, 0, 0);

		this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
		this.renderer.setSize(w, h, false);
		this.renderer.setPixelRatio(window.devicePixelRatio);

		// Scoreboard initialization
		this.scoreCanvas = document.createElement('canvas');
		this.scoreCanvas.width = 512;
		this.scoreCanvas.height = 256;
		this.scoreContext = this.scoreCanvas.getContext('2d')!;
		
		this.scoreTexture = new THREE.CanvasTexture(this.scoreCanvas);
		const scoreMaterial = new THREE.MeshBasicMaterial({ map: this.scoreTexture, transparent: true });
		const scoreGeometry = new THREE.PlaneGeometry(10, 5);
		const scoreMesh = new THREE.Mesh(scoreGeometry, scoreMaterial);
		
		// Position scoreboard on arena floor
		scoreMesh.position.set(0, 0.01, -5); 
		scoreMesh.rotation.x = -Math.PI / 2;
		this.scene.add(scoreMesh);

		this.updateScore(0, 0);

		// Lighting setup
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(ambientLight);
		const pointLight = new THREE.PointLight(0xffffff, 1);
		pointLight.position.set(5, 5, 5);
		this.scene.add(pointLight);
		
		// Arena Floor
		const tableGeo = new THREE.PlaneGeometry(30, 14);
		const tableMat = new THREE.MeshStandardMaterial({ 
			color: 0x000000, 
			side: THREE.DoubleSide 
		});
		const table = new THREE.Mesh(tableGeo, tableMat);
		table.rotation.x = -Math.PI / 2;
		table.position.y = -0.05;
		this.scene.add(table);
		
		// Arena Boundaries
		const wallGeo = new THREE.BoxGeometry(30, 1, 0.5);
		const wallMat = new THREE.MeshStandardMaterial({ color: themeColor });
		
		const topWall = new THREE.Mesh(wallGeo, wallMat);
		topWall.position.set(0, 0.5, -7.25);
		this.scene.add(topWall);
		
		const bottomWall = new THREE.Mesh(wallGeo, wallMat);
		bottomWall.position.set(0, 0.5, 7.25);
		this.scene.add(bottomWall);
		
		// Visual court divider
		const lineGeo = new THREE.PlaneGeometry(0.2, 14);
		const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
		const line = new THREE.Mesh(lineGeo, lineMat);
		line.rotation.x = -Math.PI / 2;
		line.position.y = 0.01;
		this.scene.add(line);
	}

	public updateScore(left: number, right: number) {
		const ctx = this.scoreContext;
		ctx.clearRect(0, 0, 512, 256);
		
		ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.font = 'Bold 120px Arial';
		ctx.textAlign = 'center';
		ctx.fillText(`${left} | ${right}`, 256, 160);
		
		this.scoreTexture.needsUpdate = true;
	}
}
