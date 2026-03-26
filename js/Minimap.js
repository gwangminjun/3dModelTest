/**
 * Minimap.js
 *
 * 화면 우측 상단에 조감(鳥瞰) 미니맵을 렌더링하는 클래스.
 * 직교(Orthographic) 카메라를 사용하여 씬을 위에서 내려다보는 뷰를 제공하며,
 * 메인 카메라의 방향과 위치를 실시간으로 반영한다.
 *
 * - 미니맵 카메라는 레이어 1을 활성화하여 전용 오브젝트(카메라 인디케이터)를 렌더링한다.
 * - 렌더링 시 안개(fog)를 일시적으로 비활성화하여 미니맵에서 오브젝트가 명확하게 보이도록 한다.
 */

import * as THREE from 'three';

export class Minimap {
  /**
   * @param {THREE.Scene} scene - 미니맵이 참조할 메인 씬
   */
  constructor(scene) {
    this.scene  = scene;
    this.MM_W   = 180;   // 미니맵 너비 (픽셀)
    this.MM_H   = 180;   // 미니맵 높이 (픽셀)
    this.MM_M   = 10;    // 화면 가장자리 여백 (픽셀)
    this.active = false; // 미니맵 활성 상태 (모델 로드 후 true)
    this.sideRange = 8;  // 직교 카메라 시야 범위
    this.centerY   = 1;  // 모델 중심 Y값
    this.viewMode  = 'side'; // 뷰 모드: 'side' | 'top' | 'front'

    // ── 미니맵 전용 직교 카메라 ───────────────────────────────────
    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 300);
    this.camera.position.set(0, 2, 30); // 초기 위치 (씬 앞쪽)
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 2, 0);
    this.camera.layers.enable(1); // 레이어 1: 카메라 인디케이터 표시용

    // ── 카메라 위치 인디케이터 (미니맵 전용, 레이어 1) ──────────
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.65, 6),                           // 삼각뿔 형태
      new THREE.MeshBasicMaterial({ color: 0xffee44, depthTest: false }) // 노란색, 항상 위에 표시
    );
    cone.rotation.x = Math.PI / 2; // 앞쪽을 향하도록 회전
    cone.layers.set(1);             // 레이어 1에만 렌더링
    this._camGroup = new THREE.Group();
    this._camGroup.add(cone);
    scene.add(this._camGroup);
  }

  /**
   * 로드된 모델 크기에 맞게 미니맵 카메라 범위를 갱신하고 활성화한다.
   * @param {THREE.Vector3} size - 모델 바운딩 박스 크기
   * @param {number} scale - 모델 스케일 계수
   * @param {number} worldModelH - 월드 공간에서의 모델 높이
   */
  updateFromModel(size, scale, worldModelH) {
    // 모델 크기에 맞게 카메라 시야 범위 조정
    this.sideRange = Math.max(size.x, size.y) * scale * 0.75 + 1.5;
    this.centerY   = worldModelH * 0.5; // 모델 중심 높이
    this.camera.left   = -this.sideRange; this.camera.right  = this.sideRange;
    this.camera.top    =  this.sideRange; this.camera.bottom = -this.sideRange;
    this.camera.updateProjectionMatrix(); // 투영 행렬 재계산
    document.getElementById('minimap-frame').style.display = 'block'; // 미니맵 UI 표시
    this.active = true; // 렌더링 활성화
    this._bindViewToggle(); // 뷰 전환 이벤트 등록
  }

  /**
   * 미니맵 레이블 클릭 시 뷰 모드를 순환한다 (side → top → front → side).
   */
  _bindViewToggle() {
    const label = document.getElementById('minimap-label');
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => {
      const modes = ['side', 'top', 'front'];
      const names = { side: 'SIDE VIEW', top: 'TOP VIEW', front: 'FRONT VIEW' };
      this.viewMode = modes[(modes.indexOf(this.viewMode) + 1) % modes.length];
      label.textContent = names[this.viewMode];
    });
  }

  /**
   * 미니맵을 화면 우측 상단 영역에 렌더링한다.
   * 메인 카메라의 방향을 따라 미니맵 카메라도 회전한다.
   * @param {THREE.WebGLRenderer} renderer - 렌더러
   * @param {THREE.Camera} mainCamera - 메인 카메라 (방향 동기화 기준)
   */
  render(renderer, mainCamera) {
    if (!this.active) return; // 모델 로드 전에는 렌더링하지 않음

    // ── 뷰 모드에 따라 미니맵 카메라 위치 결정 ─────────────────
    const target = new THREE.Vector3(0, this.centerY, 0);
    const dist   = this.sideRange * 5;
    if (this.viewMode === 'top') {
      // 상단 뷰: 정위에서 내려다봄
      this.camera.position.set(0, dist, 0.001);
      this.camera.up.set(0, 0, -1);
    } else if (this.viewMode === 'front') {
      // 정면 뷰: 앞에서 바라봄
      this.camera.position.set(0, this.centerY, dist);
      this.camera.up.set(0, 1, 0);
    } else {
      // 사이드 뷰: 메인 카메라 방향 동기화 (기존 동작)
      const dir = new THREE.Vector3();
      mainCamera.getWorldDirection(dir);
      this.camera.position.copy(target).addScaledVector(dir, -dist);
      this.camera.up.copy(mainCamera.up);
    }
    this.camera.lookAt(target);

    // ── 미니맵 뷰포트 계산 (우측 상단) ──────────────────────────
    const { MM_W, MM_H, MM_M } = this;
    const mmX = innerWidth - MM_W - MM_M;  // X 좌표: 화면 오른쪽에서 역산
    const mmY = MM_M;                      // Y 좌표: 화면 상단 여백

    // ── 미니맵 영역에만 렌더링 (가위 테스트) ─────────────────────
    renderer.autoClear = false;
    renderer.setScissorTest(true);
    renderer.setScissor(mmX, mmY, MM_W, MM_H);   // 렌더링 영역 제한
    renderer.setViewport(mmX, mmY, MM_W, MM_H);  // 뷰포트 설정

    // ── 미니맵 배경색 설정 후 클리어 ─────────────────────────────
    const savedColor = new THREE.Color();
    renderer.getClearColor(savedColor);
    const savedAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x080812, 1); // 어두운 남색 배경
    renderer.clear();
    renderer.setClearColor(savedColor, savedAlpha); // 원래 클리어 색상 복원

    // ── 안개 일시 비활성화 후 미니맵 렌더링 ─────────────────────
    const savedFog = this.scene.fog;
    this.scene.fog = null; // 미니맵에서는 안개 없이 렌더링
    renderer.render(this.scene, this.camera);
    this.scene.fog = savedFog; // 안개 복원

    // ── 렌더러 상태 복원 ─────────────────────────────────────────
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight); // 전체 화면 뷰포트로 복원
    renderer.autoClear = true;
  }
}
