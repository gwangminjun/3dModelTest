import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    const RANGE = 14, CEIL = 12;
    this._RANGE = RANGE;
    this._CEIL  = CEIL;

    // ── 비 ──
    this._RAIN_N = 4000;
    this._rPos = new Float32Array(this._RAIN_N * 3);
    this._rSpd = new Float32Array(this._RAIN_N);
    for (let i = 0; i < this._RAIN_N; i++) {
      this._rPos[i*3]   = (Math.random()-0.5)*RANGE*2;
      this._rPos[i*3+1] = Math.random()*CEIL;
      this._rPos[i*3+2] = (Math.random()-0.5)*RANGE*2;
      this._rSpd[i]     = 0.06 + Math.random()*0.1;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this._rPos, 3));
    this._rainGeo = rainGeo;
    this._rainMat = new THREE.PointsMaterial({ color: 0xaaddff, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
    this._rainMesh = new THREE.Points(rainGeo, this._rainMat);
    this._rainMesh.visible = false;
    scene.add(this._rainMesh);

    // ── 강풍 먼지 ──
    this._WIND_N = 2000;
    this._wPos = new Float32Array(this._WIND_N * 3);
    this._wSpd = new Float32Array(this._WIND_N);
    this._wPhs = new Float32Array(this._WIND_N);
    for (let i = 0; i < this._WIND_N; i++) {
      this._wPos[i*3]   = (Math.random()-0.5)*RANGE*2;
      this._wPos[i*3+1] = Math.random()*CEIL*0.55;
      this._wPos[i*3+2] = (Math.random()-0.5)*RANGE*2;
      this._wSpd[i]     = 0.04 + Math.random()*0.08;
      this._wPhs[i]     = Math.random()*Math.PI*2;
    }
    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', new THREE.BufferAttribute(this._wPos, 3));
    this._windGeo = windGeo;
    this._windMat = new THREE.PointsMaterial({ color: 0xd4b07a, size: 0.08, transparent: true, opacity: 0.5, depthWrite: false });
    this._windMesh = new THREE.Points(windGeo, this._windMat);
    this._windMesh.visible = false;
    scene.add(this._windMesh);

    // ── 지진 지면 먼지 ──
    this._QDUST_N = 1500;
    this._qdPos = new Float32Array(this._QDUST_N * 3);
    this._qdVx  = new Float32Array(this._QDUST_N);
    this._qdVy  = new Float32Array(this._QDUST_N);
    this._qdPhs = new Float32Array(this._QDUST_N);
    for (let i = 0; i < this._QDUST_N; i++) {
      this._qdPos[i*3]   = (Math.random()-0.5)*8;
      this._qdPos[i*3+1] = Math.random()*0.5;
      this._qdPos[i*3+2] = (Math.random()-0.5)*8;
      this._qdVx[i]      = (Math.random()-0.5)*0.03;
      this._qdVy[i]      = 0.008 + Math.random()*0.025;
      this._qdPhs[i]     = Math.random()*Math.PI*2;
    }
    const qdustGeo = new THREE.BufferGeometry();
    qdustGeo.setAttribute('position', new THREE.BufferAttribute(this._qdPos, 3));
    this._qdustGeo  = qdustGeo;
    this._qdustMat  = new THREE.PointsMaterial({ color: 0xaa9977, size: 0.10, transparent: true, opacity: 0.6, depthWrite: false });
    this._qdustMesh = new THREE.Points(qdustGeo, this._qdustMat);
    this._qdustMesh.visible = false;
    scene.add(this._qdustMesh);
  }

  tick(weatherType, intensity) {
    const hasRain  = weatherType === 'rain';
    const hasWind  = weatherType === 'wind';
    const hasQuake = weatherType === 'quake';
    const sp = intensity, t = performance.now() * 0.001;
    const { _RANGE: RANGE, _CEIL: CEIL } = this;

    this._rainMesh.visible  = hasRain;
    this._windMesh.visible  = hasWind;
    this._qdustMesh.visible = hasQuake;

    if (hasRain) {
      for (let i = 0; i < this._RAIN_N; i++) {
        this._rPos[i*3+1] -= this._rSpd[i] * (sp*1.6 + 0.4);
        if (this._rPos[i*3+1] < -0.3) {
          this._rPos[i*3]   = (Math.random()-0.5)*RANGE*2;
          this._rPos[i*3+1] = CEIL + Math.random()*2;
          this._rPos[i*3+2] = (Math.random()-0.5)*RANGE*2;
        }
      }
      this._rainGeo.attributes.position.needsUpdate = true;
      this._rainMat.opacity = 0.3 + sp*0.45;
    }

    if (hasWind) {
      for (let i = 0; i < this._WIND_N; i++) {
        this._wPos[i*3]   += this._wSpd[i] * (sp*1.6 + 0.3);
        this._wPos[i*3+1] += Math.sin(t*1.2 + this._wPhs[i]) * 0.015 * sp;
        if (this._wPos[i*3] > RANGE) {
          this._wPos[i*3]   = -RANGE;
          this._wPos[i*3+1] = Math.random()*CEIL*0.55;
          this._wPos[i*3+2] = (Math.random()-0.5)*RANGE*2;
        }
      }
      this._windGeo.attributes.position.needsUpdate = true;
      this._windMat.opacity = 0.3 + sp*0.4;
    }

    if (hasQuake) {
      for (let i = 0; i < this._QDUST_N; i++) {
        this._qdPos[i*3]   += this._qdVx[i] + Math.sin(t*6 + this._qdPhs[i]) * 0.008 * sp;
        this._qdPos[i*3+1] += this._qdVy[i] * sp;
        if (this._qdPos[i*3+1] > 3.0) {
          this._qdPos[i*3]   = (Math.random()-0.5)*8;
          this._qdPos[i*3+1] = 0;
          this._qdPos[i*3+2] = (Math.random()-0.5)*8;
        }
      }
      this._qdustGeo.attributes.position.needsUpdate = true;
      this._qdustMat.opacity = 0.3 + sp*0.5;
    }
  }
}
