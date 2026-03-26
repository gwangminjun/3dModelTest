/**
 * AxesDisplay.js
 *
 * 3D 씬에 XYZ 축 헬퍼와 축 레이블(X, Y, Z 스프라이트)을 표시하는 클래스.
 * 모델이 로드된 후 모델 크기에 맞게 축의 크기와 위치를 자동 조정한다.
 * - X축: 빨간색, Y축: 초록색, Z축: 파란색
 */

import * as THREE from 'three';

export class AxesDisplay {
  /**
   * @param {THREE.Scene} scene - 축 헬퍼를 추가할 씬
   */
  constructor(scene) {
    // ── 축 헬퍼 생성 (초기에는 숨김 상태) ───────────────────────
    this.helper = new THREE.AxesHelper(1);
    this.helper.visible = false; // 모델 로드 전까지 숨김
    scene.add(this.helper);

    // ── 각 축 레이블 스프라이트 생성 ─────────────────────────────
    this.xLabel = this._makeLabel('X', '#ff5555', scene); // X축: 빨간색
    this.yLabel = this._makeLabel('Y', '#55ff55', scene); // Y축: 초록색
    this.zLabel = this._makeLabel('Z', '#5599ff', scene); // Z축: 파란색
  }

  /**
   * Canvas API로 텍스트 레이블을 그린 후 Three.js 스프라이트로 반환한다.
   * @param {string} text - 레이블 텍스트 (X, Y, Z)
   * @param {string} color - CSS 색상 문자열
   * @param {THREE.Scene} scene - 스프라이트를 추가할 씬
   * @returns {THREE.Sprite} 레이블 스프라이트
   */
  _makeLabel(text, color, scene) {
    // 64x64 캔버스에 텍스트 렌더링
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 34); // 중앙에 텍스트 그리기

    // 캔버스 텍스처로 스프라이트 생성
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,  // 항상 다른 오브젝트 위에 표시
      transparent: true,
    }));
    sprite.visible = false; // 모델 로드 전까지 숨김
    scene.add(sprite);
    return sprite;
  }

  /**
   * 모델 크기에 맞게 축 헬퍼와 레이블을 배치하고 표시한다.
   * @param {THREE.Vector3} size - 모델의 바운딩 박스 크기
   * @param {number} scale - 모델에 적용된 스케일 계수
   * @param {number} worldModelH - 월드 공간에서의 모델 높이
   */
  show(size, scale, worldModelH) {
    // 모델 오른쪽 옆에 축 헬퍼 배치
    const axisOffset = size.x * scale / 2 + 0.5; // 모델 우측에 여백 포함
    const axisScale  = Math.max(0.4, worldModelH * 0.45); // 모델 높이에 비례한 축 크기
    this.helper.position.set(axisOffset, 0, 0);
    this.helper.scale.setScalar(axisScale);
    this.helper.visible = true; // 축 표시

    // 각 축 레이블의 크기와 위치 설정
    const ls = axisScale * 0.22; // 레이블 크기 (축 크기의 22%)
    const lp = axisScale * 1.22; // 레이블 오프셋 (축 끝보다 약간 더 멀리)
    this.xLabel.position.set(axisOffset + lp, 0,  0); this.xLabel.scale.set(ls, ls, 1); this.xLabel.visible = true;
    this.yLabel.position.set(axisOffset,  lp, 0);     this.yLabel.scale.set(ls, ls, 1); this.yLabel.visible = true;
    this.zLabel.position.set(axisOffset,  0,  lp);    this.zLabel.scale.set(ls, ls, 1); this.zLabel.visible = true;
  }
}
