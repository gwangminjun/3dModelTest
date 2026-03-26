import * as THREE from 'three';

export class Minimap {
  constructor(scene) {
    this.scene  = scene;
    this.MM_W   = 180;
    this.MM_H   = 180;
    this.MM_M   = 10;
    this.active = false;
    this.sideRange = 8;
    this.centerY   = 1;

    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 300);
    this.camera.position.set(0, 2, 30);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 2, 0);
    this.camera.layers.enable(1);

    // 카메라 인디케이터 (layer 1 — 미니맵 전용)
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.65, 6),
      new THREE.MeshBasicMaterial({ color: 0xffee44, depthTest: false })
    );
    cone.rotation.x = Math.PI / 2;
    cone.layers.set(1);
    this._camGroup = new THREE.Group();
    this._camGroup.add(cone);
    scene.add(this._camGroup);
  }

  updateFromModel(size, scale, worldModelH) {
    this.sideRange = Math.max(size.x, size.y) * scale * 0.75 + 1.5;
    this.centerY   = worldModelH * 0.5;
    this.camera.left   = -this.sideRange; this.camera.right  = this.sideRange;
    this.camera.top    =  this.sideRange; this.camera.bottom = -this.sideRange;
    this.camera.updateProjectionMatrix();
    document.getElementById('minimap-frame').style.display = 'block';
    this.active = true;
  }

  render(renderer, mainCamera) {
    if (!this.active) return;

    // 메인 카메라 방향 동기화
    const dir = new THREE.Vector3();
    mainCamera.getWorldDirection(dir);
    const target = new THREE.Vector3(0, this.centerY, 0);
    this.camera.position.copy(target).addScaledVector(dir, -this.sideRange * 5);
    this.camera.up.copy(mainCamera.up);
    this.camera.lookAt(target);

    const { MM_W, MM_H, MM_M } = this;
    const mmX = innerWidth - MM_W - MM_M;
    const mmY = MM_M;

    renderer.autoClear = false;
    renderer.setScissorTest(true);
    renderer.setScissor(mmX, mmY, MM_W, MM_H);
    renderer.setViewport(mmX, mmY, MM_W, MM_H);

    const savedColor = new THREE.Color();
    renderer.getClearColor(savedColor);
    const savedAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x080812, 1);
    renderer.clear();
    renderer.setClearColor(savedColor, savedAlpha);

    const savedFog = this.scene.fog;
    this.scene.fog = null;
    renderer.render(this.scene, this.camera);
    this.scene.fog = savedFog;

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    renderer.autoClear = true;
  }
}
