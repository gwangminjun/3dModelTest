/**
 * ParticleSystem.js
 *
 * 날씨 및 재해 시뮬레이션에 사용되는 파티클 효과를 관리하는 클래스.
 * 세 가지 파티클 시스템을 포함한다:
 *
 * 1. 비(Rain)   - 위에서 아래로 떨어지는 빗방울 (4000개)
 * 2. 바람(Wind) - 한 방향으로 흐르는 먼지 입자 (2000개)
 * 3. 지진(Quake) 지면 먼지 - 지면에서 위로 솟구치는 먼지 (1500개)
 *
 * 각 파티클 시스템은 날씨 타입과 강도에 따라 매 프레임 위치를 업데이트한다.
 */

import * as THREE from 'three';

export class ParticleSystem {
  /**
   * @param {THREE.Scene} scene - 파티클을 추가할 씬
   */
  constructor(scene) {
    const RANGE = 14; // 파티클 생성 범위 (XZ 평면 반경)
    const CEIL  = 12; // 파티클 최대 높이 (Y축 상한)
    this._RANGE = RANGE;
    this._CEIL  = CEIL;

    // ── 비(Rain) 파티클 시스템 ───────────────────────────────────
    this._RAIN_N = 4000;                             // 빗방울 개수
    this._rPos = new Float32Array(this._RAIN_N * 3); // 각 빗방울 XYZ 위치
    this._rSpd = new Float32Array(this._RAIN_N);     // 각 빗방울 낙하 속도
    for (let i = 0; i < this._RAIN_N; i++) {
      // 공간 내 랜덤 위치로 초기화
      this._rPos[i*3]   = (Math.random()-0.5)*RANGE*2; // X: -RANGE ~ +RANGE
      this._rPos[i*3+1] = Math.random()*CEIL;           // Y: 0 ~ CEIL
      this._rPos[i*3+2] = (Math.random()-0.5)*RANGE*2; // Z: -RANGE ~ +RANGE
      this._rSpd[i]     = 0.06 + Math.random()*0.1;    // 개별 낙하 속도 (랜덤)
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this._rPos, 3));
    this._rainGeo = rainGeo;
    this._rainMat = new THREE.PointsMaterial({ color: 0xaaddff, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false }); // 하늘색 반투명
    this._rainMesh = new THREE.Points(rainGeo, this._rainMat);
    this._rainMesh.visible = false; // 기본 숨김
    scene.add(this._rainMesh);

    // ── 바람 먼지(Wind Dust) 파티클 시스템 ──────────────────────
    this._WIND_N = 2000;                             // 먼지 입자 개수
    this._wPos = new Float32Array(this._WIND_N * 3); // 각 입자 XYZ 위치
    this._wSpd = new Float32Array(this._WIND_N);     // 각 입자 이동 속도
    this._wPhs = new Float32Array(this._WIND_N);     // 위아래 흔들림을 위한 위상(phase)
    for (let i = 0; i < this._WIND_N; i++) {
      this._wPos[i*3]   = (Math.random()-0.5)*RANGE*2;   // X
      this._wPos[i*3+1] = Math.random()*CEIL*0.55;        // Y: 지면 근처에서 중간 높이
      this._wPos[i*3+2] = (Math.random()-0.5)*RANGE*2;   // Z
      this._wSpd[i]     = 0.04 + Math.random()*0.08;     // 이동 속도 (랜덤)
      this._wPhs[i]     = Math.random()*Math.PI*2;        // 위아래 흔들림 위상 (랜덤)
    }
    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', new THREE.BufferAttribute(this._wPos, 3));
    this._windGeo = windGeo;
    this._windMat = new THREE.PointsMaterial({ color: 0xd4b07a, size: 0.08, transparent: true, opacity: 0.5, depthWrite: false }); // 모래색 반투명
    this._windMesh = new THREE.Points(windGeo, this._windMat);
    this._windMesh.visible = false; // 기본 숨김
    scene.add(this._windMesh);

    // ── 지진 지면 먼지(Quake Dust) 파티클 시스템 ────────────────
    this._QDUST_N = 1500;                              // 먼지 입자 개수
    this._qdPos = new Float32Array(this._QDUST_N * 3); // 각 입자 XYZ 위치
    this._qdVx  = new Float32Array(this._QDUST_N);     // X축 속도 (수평 분산)
    this._qdVy  = new Float32Array(this._QDUST_N);     // Y축 속도 (상승 속도)
    this._qdPhs = new Float32Array(this._QDUST_N);     // 좌우 흔들림 위상(phase)
    for (let i = 0; i < this._QDUST_N; i++) {
      this._qdPos[i*3]   = (Math.random()-0.5)*8;       // X: 모델 주변 지면
      this._qdPos[i*3+1] = Math.random()*0.5;            // Y: 지면 근처에서 시작
      this._qdPos[i*3+2] = (Math.random()-0.5)*8;       // Z
      this._qdVx[i]      = (Math.random()-0.5)*0.03;    // X 방향 이동 속도
      this._qdVy[i]      = 0.008 + Math.random()*0.025; // 상승 속도 (랜덤)
      this._qdPhs[i]     = Math.random()*Math.PI*2;     // 좌우 흔들림 위상
    }
    const qdustGeo = new THREE.BufferGeometry();
    qdustGeo.setAttribute('position', new THREE.BufferAttribute(this._qdPos, 3));
    this._qdustGeo  = qdustGeo;
    this._qdustMat  = new THREE.PointsMaterial({ color: 0xaa9977, size: 0.10, transparent: true, opacity: 0.6, depthWrite: false }); // 흙색 반투명
    this._qdustMesh = new THREE.Points(qdustGeo, this._qdustMat);
    this._qdustMesh.visible = false; // 기본 숨김
    scene.add(this._qdustMesh);
  }

  /**
   * 매 프레임 파티클 위치를 업데이트한다.
   * 활성화된 날씨 타입에 해당하는 파티클을 동시에 표시하고 이동시킨다.
   * @param {Set<string>} weatherTypes - 활성 날씨 타입 집합
   * @param {number} intensity - 강도 (0.0 ~ 1.0)
   */
  tick(weatherTypes, intensity) {
    const hasRain  = weatherTypes.has('rain');
    const hasWind  = weatherTypes.has('wind');
    const hasQuake = weatherTypes.has('quake');
    const sp = intensity; // 강도 단축 변수
    const t = performance.now() * 0.001; // 경과 시간 (초)
    const { _RANGE: RANGE, _CEIL: CEIL } = this;

    // 현재 날씨에 맞는 파티클만 표시
    this._rainMesh.visible  = hasRain;
    this._windMesh.visible  = hasWind;
    this._qdustMesh.visible = hasQuake;

    // ── 비(Rain) 파티클 업데이트 ─────────────────────────────────
    if (hasRain) {
      for (let i = 0; i < this._RAIN_N; i++) {
        this._rPos[i*3+1] -= this._rSpd[i] * (sp*1.6 + 0.4); // 강도에 비례한 낙하 속도
        if (this._rPos[i*3+1] < -0.3) {
          // 바닥에 닿으면 위에서 다시 시작 (위치 랜덤 재배치)
          this._rPos[i*3]   = (Math.random()-0.5)*RANGE*2;
          this._rPos[i*3+1] = CEIL + Math.random()*2; // 천장 위에서 다시 생성
          this._rPos[i*3+2] = (Math.random()-0.5)*RANGE*2;
        }
      }
      this._rainGeo.attributes.position.needsUpdate = true; // GPU에 위치 데이터 업로드
      this._rainMat.opacity = 0.3 + sp*0.45; // 강도에 따라 불투명도 조절
    }

    // ── 바람 먼지(Wind) 파티클 업데이트 ─────────────────────────
    if (hasWind) {
      for (let i = 0; i < this._WIND_N; i++) {
        this._wPos[i*3]   += this._wSpd[i] * (sp*1.6 + 0.3);            // X축: 강도에 비례한 수평 이동
        this._wPos[i*3+1] += Math.sin(t*1.2 + this._wPhs[i]) * 0.015 * sp; // Y축: 위아래 흔들림
        if (this._wPos[i*3] > RANGE) {
          // 오른쪽 경계를 벗어나면 왼쪽에서 다시 생성
          this._wPos[i*3]   = -RANGE;
          this._wPos[i*3+1] = Math.random()*CEIL*0.55;
          this._wPos[i*3+2] = (Math.random()-0.5)*RANGE*2;
        }
      }
      this._windGeo.attributes.position.needsUpdate = true;
      this._windMat.opacity = 0.3 + sp*0.4;
    }

    // ── 지진 지면 먼지(Quake Dust) 파티클 업데이트 ──────────────
    if (hasQuake) {
      for (let i = 0; i < this._QDUST_N; i++) {
        this._qdPos[i*3]   += this._qdVx[i] + Math.sin(t*6 + this._qdPhs[i]) * 0.008 * sp; // X: 지진 진동에 따른 좌우 흔들림
        this._qdPos[i*3+1] += this._qdVy[i] * sp; // Y: 강도에 비례한 상승
        if (this._qdPos[i*3+1] > 3.0) {
          // 일정 높이 이상 올라가면 지면에서 다시 생성
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
