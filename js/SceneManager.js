import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  constructor() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.018);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 500);
    this.camera.position.set(0, 2, 5);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 100;

    // Lights
    this.ambient   = new THREE.AmbientLight(0xffffff, 0.6);
    this.sunLight  = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.position.set(5, 10, 7);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.fillLight = new THREE.DirectionalLight(0x8899ff, 0.4);
    this.fillLight.position.set(-5, 2, -5);
    this.scene.add(this.ambient, this.sunLight, this.fillLight);

    // Grid
    const grid = new THREE.GridHelper(30, 60, 0x444466, 0x333355);
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    this.scene.add(grid);

    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  renderMain() {
    this.renderer.autoClear = true;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, innerWidth, innerHeight);
    this.renderer.render(this.scene, this.camera);
  }
}
