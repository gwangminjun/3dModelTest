/**
 * WeatherController.js
 *
 * 날씨 타입과 강도에 따라 씬의 대기 환경(배경색, 안개, 조명)을
 * 부드럽게(lerp) 전환하는 클래스.
 *
 * 지원하는 날씨 타입:
 * - 'none'  : 맑은 날씨 (밝은 배경, 정상 조명)
 * - 'rain'  : 비 (어두운 폭풍 배경, 조명 감소)
 * - 'wind'  : 강풍 (비와 동일한 어두운 배경)
 * - 'quake' : 지진 (붉은 빛이 도는 어두운 배경)
 *
 * 또한 각 날씨 타입에서 변형(Deform) 효과의 자동 목표값을 계산한다.
 */

import * as THREE from 'three';

export class WeatherController {
  /**
   * @param {THREE.Scene} scene - 배경색과 안개를 제어할 씬
   * @param {THREE.AmbientLight} ambient - 환경광
   * @param {THREE.DirectionalLight} sunLight - 태양 방향성 조명
   */
  constructor(scene, ambient, sunLight) {
    this.scene     = scene;
    this.ambient   = ambient;
    this.sunLight  = sunLight;
    this.weatherType = 'none'; // 현재 날씨 타입
    this.intensity   = 0.5;   // 날씨 강도 (0.0 ~ 1.0)

    // ── 날씨별 배경색 정의 ─────────────────────────────────────────
    this._clearBg = new THREE.Color(0x1a1a2e); // 맑은 날: 어두운 남색
    this._stormBg = new THREE.Color(0x07070f); // 폭풍(비/바람): 거의 검정
    this._quakeBg = new THREE.Color(0x100808); // 지진: 어두운 붉은 빛
  }

  /**
   * 현재 날씨 타입과 강도에 따라 변형 효과의 자동 목표값을 계산한다.
   * UIController의 자동 lerp 시스템이 이 값을 목표로 수렴한다.
   * @returns {{ crack: number, collapse: number, sink: number }} 각 효과의 목표값 (0 ~ 100)
   */
  calcAutoTargets() {
    const sp = this.intensity;
    let crack = 0, collapse = 0, sink = 0;
    // 날씨별 변형 목표값 계산 (강도에 비례)
    if (this.weatherType === 'rain')  { crack += sp * 220; sink     += sp * 110; } // 비: 균열 + 침하
    if (this.weatherType === 'wind')  { collapse += sp * 320; crack  += sp * 100; } // 바람: 붕괴 + 균열
    if (this.weatherType === 'quake') { crack += sp * 375; collapse += sp * 400; sink += sp * 275; } // 지진: 전 효과 극대
    return {
      crack:    Math.min(crack,    500), // 최대값 500으로 제한
      collapse: Math.min(collapse, 500),
      sink:     Math.min(sink,     500),
    };
  }

  /**
   * 매 프레임 씬의 대기 환경을 현재 날씨 상태에 맞게 부드럽게 전환한다.
   * lerp(선형 보간)로 배경색, 안개, 조명을 서서히 변화시킨다.
   */
  updateAtmosphere() {
    const stormy   = this.weatherType !== 'none';          // 폭풍 상태 여부
    const isQuake  = this.weatherType === 'quake';         // 지진 여부
    const targetBg = isQuake ? this._quakeBg : (stormy ? this._stormBg : this._clearBg); // 목표 배경색 결정

    // 배경색과 안개색을 목표 색상으로 서서히 전환 (3% 보간)
    this.scene.background.lerp(targetBg, 0.03);
    this.scene.fog.color.lerp(targetBg, 0.03);
    // 안개 밀도: 폭풍 시 2배 증가
    this.scene.fog.density  = THREE.MathUtils.lerp(this.scene.fog.density,  stormy ? 0.038 : 0.018, 0.03);
    // 태양 조명: 폭풍 시 크게 감소
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, stormy ? 0.50  : 1.5,   0.04);
    // 환경광: 폭풍 시 감소
    this.ambient.intensity  = THREE.MathUtils.lerp(this.ambient.intensity,  stormy ? 0.20  : 0.6,   0.04);
  }
}
