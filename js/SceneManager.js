/**
 * SceneManager.js
 *
 * Three.js의 핵심 렌더링 환경을 초기화하고 관리하는 클래스.
 * WebGL 렌더러, 씬(Scene), 카메라(Camera), 조명(Lights),
 * 궤도 컨트롤(OrbitControls), 그리드 헬퍼를 설정한다.
 * 창 크기 변경 이벤트에도 자동으로 대응한다.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  constructor() {
    // ── 렌더러 설정 ──────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); // 안티앨리어싱·스크린샷 지원
    this.renderer.setPixelRatio(window.devicePixelRatio);          // 디스플레이 픽셀 비율 적용
    this.renderer.setSize(innerWidth, innerHeight);                // 렌더 크기를 화면 전체로 설정
    this.renderer.shadowMap.enabled = true;                        // 그림자 맵 활성화
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;         // 부드러운 그림자 타입 사용
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;         // sRGB 색 공간 출력
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;       // 영화적 톤 매핑 적용
    document.body.appendChild(this.renderer.domElement);           // 캔버스를 body에 추가

    // ── 씬 설정 ──────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e); // 배경색: 어두운 남색
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.018); // 지수 안개 (배경색과 동일)

    // ── 카메라 설정 ──────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 500); // 원근 카메라 (FOV 45도)
    this.camera.position.set(0, 2, 5); // 초기 카메라 위치

    // ── 궤도 컨트롤 설정 ─────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;    // 부드러운 관성 효과 활성화
    this.controls.dampingFactor = 0.05;   // 감쇠 계수
    this.controls.minDistance = 0.5;      // 카메라 최소 거리
    this.controls.maxDistance = 100;      // 카메라 최대 거리

    // ── 조명 설정 ────────────────────────────────────────────────
    this.ambient   = new THREE.AmbientLight(0xffffff, 0.6);           // 전체적인 환경광
    this.sunLight  = new THREE.DirectionalLight(0xffffff, 1.5);       // 주 태양광 (방향성 조명)
    this.sunLight.position.set(5, 10, 7);                             // 태양 위치
    this.sunLight.castShadow = true;                                  // 그림자 생성 활성화
    this.sunLight.shadow.mapSize.set(2048, 2048);                     // 그림자 맵 해상도
    this.fillLight = new THREE.DirectionalLight(0x8899ff, 0.4);       // 보조 채우기 조명 (청색 계열)
    this.fillLight.position.set(-5, 2, -5);                           // 반대쪽에서 비추는 위치
    this.scene.add(this.ambient, this.sunLight, this.fillLight);      // 씬에 조명 추가

    // ── 그리드 헬퍼 ──────────────────────────────────────────────
    const grid = new THREE.GridHelper(30, 60, 0x444466, 0x333355); // 30 유닛 크기, 60분할 격자
    grid.material.opacity = 0.4;     // 반투명 설정
    grid.material.transparent = true;
    this.scene.add(grid);

    // ── 창 크기 변경 대응 ─────────────────────────────────────────
    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; // 카메라 종횡비 업데이트
      this.camera.updateProjectionMatrix();          // 투영 행렬 재계산
      this.renderer.setSize(innerWidth, innerHeight); // 렌더러 크기 재설정
    });
  }

  /**
   * 메인 씬을 전체 뷰포트에 렌더링한다.
   * 미니맵 렌더링 전에 호출되어야 한다.
   */
  renderMain() {
    this.renderer.autoClear = true;                             // 자동 클리어 활성화
    this.renderer.setScissorTest(false);                        // 가위 테스트 비활성화
    this.renderer.setViewport(0, 0, innerWidth, innerHeight);  // 전체 화면 뷰포트 설정
    this.renderer.render(this.scene, this.camera);             // 메인 카메라로 씬 렌더링
  }
}
