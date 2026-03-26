import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor(scene, camera, controls, deformManager, axesDisplay, minimap) {
    this.scene         = scene;
    this.camera        = camera;
    this.controls      = controls;
    this.deformManager = deformManager;
    this.axesDisplay   = axesDisplay;
    this.minimap       = minimap;

    this.loader        = new GLTFLoader();
    this.currentModel  = null;
    this.initCamPos    = null;
    this.initCamTarget = null;
    this.worldModelH   = 2.0;

    this._setupFileInput();
    this._setupDropZone();
  }

  _setupFileInput() {
    document.getElementById('file-btn').onclick = () =>
      document.getElementById('file-input').click();
    document.getElementById('file-input').onchange = e => {
      if (e.target.files[0]) this.loadFromFile(e.target.files[0]);
    };
  }

  _setupDropZone() {
    const overlay = document.getElementById('drop-overlay');
    document.addEventListener('dragover',  e => { e.preventDefault(); overlay.style.display = 'block'; });
    document.addEventListener('dragleave', e => { if (!e.relatedTarget) overlay.style.display = 'none'; });
    document.addEventListener('drop', e => {
      e.preventDefault(); overlay.style.display = 'none';
      const f = e.dataTransfer.files[0];
      if (f && (f.name.endsWith('.glb') || f.name.endsWith('.gltf'))) this.loadFromFile(f);
    });
  }

  loadFromFile(file) {
    const r = new FileReader();
    r.onload = e => this.loadGLB(e.target.result);
    r.readAsDataURL(file);
  }

  loadGLB(src) {
    document.getElementById('loading-text').textContent = 'Loading...';
    document.getElementById('sample-btn').style.display = 'none';
    document.getElementById('file-btn').style.display   = 'none';
    this.loader.load(
      src,
      gltf => this._placeModel(gltf),
      p => { if (p.total > 0) document.getElementById('loading-text').textContent = `Loading... ${Math.round(p.loaded / p.total * 100)}%`; },
      err => {
        console.error(err);
        document.getElementById('loading-text').textContent = '불러오기 실패. 다시 시도해주세요.';
        document.getElementById('sample-btn').style.display = 'inline-block';
        document.getElementById('file-btn').style.display   = 'inline-block';
      }
    );
  }

  _placeModel(gltf) {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
      window._mixer = null;
    }
    this.deformManager.meshMaterials = [];

    const model = gltf.scene;
    this.currentModel = model;

    model.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(mat => {
        this.deformManager.injectDeform(mat);
        this.deformManager.meshMaterials.push({ mat, origRoughness: mat.roughness ?? 0.5 });
      });
    });

    const box    = new THREE.Box3().setFromObject(model);
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale  = 2.0 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    this.deformManager.uModelMinY.value = box.min.y;
    this.deformManager.uModelH.value    = size.y;
    this.worldModelH = size.y * scale;
    this.scene.add(model);

    this.minimap.updateFromModel(size, scale, this.worldModelH);
    this.axesDisplay.show(size, scale, this.worldModelH);

    const h = this.worldModelH;
    this.initCamPos    = new THREE.Vector3(0, h * 0.8, h * 2.8);
    this.initCamTarget = new THREE.Vector3(0, h * 0.4, 0);
    this.camera.position.copy(this.initCamPos);
    this.controls.target.copy(this.initCamTarget);
    this.controls.update();

    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(c => mixer.clipAction(c).play());
      window._mixer = mixer;
    }
    document.getElementById('loading').style.display = 'none';
  }

  resetCamera() {
    if (this.initCamPos) {
      this.camera.position.copy(this.initCamPos);
      this.controls.target.copy(this.initCamTarget);
      this.controls.update();
    }
  }
}
