import * as THREE from 'three';

export class WeatherController {
  constructor(scene, ambient, sunLight) {
    this.scene     = scene;
    this.ambient   = ambient;
    this.sunLight  = sunLight;
    this.weatherType = 'none';
    this.intensity   = 0.5;

    this._clearBg = new THREE.Color(0x1a1a2e);
    this._stormBg = new THREE.Color(0x07070f);
    this._quakeBg = new THREE.Color(0x100808);
  }

  calcAutoTargets() {
    const sp = this.intensity;
    let crack = 0, collapse = 0, sink = 0;
    if (this.weatherType === 'rain')  { crack += sp * 45; sink     += sp * 22; }
    if (this.weatherType === 'wind')  { collapse += sp * 65; crack  += sp * 20; }
    if (this.weatherType === 'quake') { crack += sp * 75; collapse  += sp * 80; sink += sp * 55; }
    return {
      crack:    Math.min(crack,    100),
      collapse: Math.min(collapse, 100),
      sink:     Math.min(sink,     100),
    };
  }

  updateAtmosphere() {
    const stormy   = this.weatherType !== 'none';
    const isQuake  = this.weatherType === 'quake';
    const targetBg = isQuake ? this._quakeBg : (stormy ? this._stormBg : this._clearBg);
    this.scene.background.lerp(targetBg, 0.03);
    this.scene.fog.color.lerp(targetBg, 0.03);
    this.scene.fog.density  = THREE.MathUtils.lerp(this.scene.fog.density,  stormy ? 0.038 : 0.018, 0.03);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, stormy ? 0.50  : 1.5,   0.04);
    this.ambient.intensity  = THREE.MathUtils.lerp(this.ambient.intensity,  stormy ? 0.20  : 0.6,   0.04);
  }
}
