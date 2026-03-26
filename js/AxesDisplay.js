import * as THREE from 'three';

export class AxesDisplay {
  constructor(scene) {
    this.helper = new THREE.AxesHelper(1);
    this.helper.visible = false;
    scene.add(this.helper);

    this.xLabel = this._makeLabel('X', '#ff5555', scene);
    this.yLabel = this._makeLabel('Y', '#55ff55', scene);
    this.zLabel = this._makeLabel('Z', '#5599ff', scene);
  }

  _makeLabel(text, color, scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 34);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
      transparent: true,
    }));
    sprite.visible = false;
    scene.add(sprite);
    return sprite;
  }

  show(size, scale, worldModelH) {
    const axisOffset = size.x * scale / 2 + 0.5;
    const axisScale  = Math.max(0.4, worldModelH * 0.45);
    this.helper.position.set(axisOffset, 0, 0);
    this.helper.scale.setScalar(axisScale);
    this.helper.visible = true;

    const ls = axisScale * 0.22;
    const lp = axisScale * 1.22;
    this.xLabel.position.set(axisOffset + lp, 0,  0); this.xLabel.scale.set(ls, ls, 1); this.xLabel.visible = true;
    this.yLabel.position.set(axisOffset,  lp, 0);     this.yLabel.scale.set(ls, ls, 1); this.yLabel.visible = true;
    this.zLabel.position.set(axisOffset,  0,  lp);    this.zLabel.scale.set(ls, ls, 1); this.zLabel.visible = true;
  }
}
