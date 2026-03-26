/**
 * ModelLoader.js
 *
 * GLB/GLTF 형식의 3D 모델을 로드하여 씬에 배치하는 클래스.
 * 파일 버튼 클릭, 드래그&드롭 두 가지 방식으로 모델을 불러올 수 있다.
 *
 * 모델 로드 시 수행하는 작업:
 * 1. 기존 모델 제거 및 애니메이션 믹서 초기화
 * 2. 모든 메시에 변형(Deform) 셰이더 주입
 * 3. 바운딩 박스 기반으로 모델 정규화 (크기·위치)
 * 4. 미니맵/축 헬퍼 업데이트
 * 5. 카메라를 모델 크기에 맞는 위치로 이동
 * 6. GLTF 내장 애니메이션 자동 재생
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
  /**
   * @param {THREE.Scene} scene - 모델을 추가할 씬
   * @param {THREE.Camera} camera - 씬 카메라
   * @param {OrbitControls} controls - 궤도 컨트롤
   * @param {DeformManager} deformManager - 변형 효과 관리자
   * @param {AxesDisplay} axesDisplay - 축 표시 관리자
   * @param {Minimap} minimap - 미니맵 관리자
   */
  constructor(scene, camera, controls, deformManager, axesDisplay, minimap) {
    this.scene         = scene;
    this.camera        = camera;
    this.controls      = controls;
    this.deformManager = deformManager;
    this.axesDisplay   = axesDisplay;
    this.minimap       = minimap;

    this.loader        = new GLTFLoader();  // GLTF/GLB 로더
    this.currentModel  = null;              // 현재 씬에 배치된 모델
    this.initCamPos    = null;              // 초기 카메라 위치 (리셋용)
    this.initCamTarget = null;             // 초기 카메라 타겟 (리셋용)
    this.worldModelH   = 2.0;              // 월드 공간에서의 모델 높이

    this._setupFileInput(); // 파일 버튼 이벤트 바인딩
    this._setupDropZone();  // 드래그&드롭 이벤트 바인딩
  }

  /**
   * 파일 선택 버튼과 input[type=file] 요소를 연결한다.
   */
  _setupFileInput() {
    document.getElementById('file-btn').onclick = () =>
      document.getElementById('file-input').click(); // 버튼 클릭 시 파일 선택창 열기
    document.getElementById('file-input').onchange = e => {
      if (e.target.files[0]) this.loadFromFile(e.target.files[0]); // 파일 선택 시 로드
    };
  }

  /**
   * 전체 페이지에 드래그&드롭 이벤트를 등록한다.
   * GLB/GLTF 파일만 허용한다.
   */
  _setupDropZone() {
    const overlay = document.getElementById('drop-overlay');
    document.addEventListener('dragover',  e => { e.preventDefault(); overlay.style.display = 'block'; }); // 파일 드래그 시 오버레이 표시
    document.addEventListener('dragleave', e => { if (!e.relatedTarget) overlay.style.display = 'none'; }); // 드래그 해제 시 오버레이 숨김
    document.addEventListener('drop', e => {
      e.preventDefault(); overlay.style.display = 'none';
      const f = e.dataTransfer.files[0];
      // GLB 또는 GLTF 파일만 허용
      if (f && (f.name.endsWith('.glb') || f.name.endsWith('.gltf'))) this.loadFromFile(f);
    });
  }

  /**
   * File 객체를 DataURL로 변환 후 loadGLB()를 호출한다.
   * @param {File} file - 로드할 GLB/GLTF 파일
   */
  loadFromFile(file) {
    const r = new FileReader();
    r.onload = e => this.loadGLB(e.target.result); // DataURL 변환 완료 후 로드
    r.readAsDataURL(file);
  }

  /**
   * DataURL(또는 URL 문자열)로부터 GLB 모델을 로드한다.
   * 로딩 진행률을 UI에 표시하며, 실패 시 오류 메시지를 보여준다.
   * @param {string} src - GLB/GLTF 데이터 URL 또는 경로
   */
  loadGLB(src) {
    document.getElementById('loading-text').textContent = 'Loading...';
    document.getElementById('sample-btn').style.display = 'none'; // 샘플 버튼 숨김
    document.getElementById('file-btn').style.display   = 'none'; // 파일 버튼 숨김
    this.loader.load(
      src,
      gltf => this._placeModel(gltf), // 로드 성공 콜백
      p => { if (p.total > 0) document.getElementById('loading-text').textContent = `Loading... ${Math.round(p.loaded / p.total * 100)}%`; }, // 진행률 업데이트
      err => {
        // 로드 실패 처리
        console.error(err);
        document.getElementById('loading-text').textContent = '불러오기 실패. 다시 시도해주세요.';
        document.getElementById('sample-btn').style.display = 'inline-block'; // 버튼 다시 표시
        document.getElementById('file-btn').style.display   = 'inline-block';
      }
    );
  }

  /**
   * 로드된 GLTF 모델을 씬에 배치한다.
   * 모델 크기를 정규화하고, 변형 셰이더를 주입하며,
   * 카메라와 미니맵을 모델 크기에 맞게 조정한다.
   * @param {GLTF} gltf - GLTFLoader가 반환한 GLTF 객체
   */
  _placeModel(gltf) {
    // ── 기존 모델 제거 ────────────────────────────────────────────
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
      window._mixer = null; // 애니메이션 믹서 초기화
    }
    this.deformManager.meshMaterials = []; // 머티리얼 목록 초기화

    const model = gltf.scene;
    this.currentModel = model;

    // ── 모든 메시에 변형 셰이더 주입 및 머티리얼 등록 ───────────
    model.traverse(child => {
      if (!child.isMesh) return; // 메시가 아닌 오브젝트 무시
      child.castShadow = true;    // 그림자 생성
      child.receiveShadow = true; // 그림자 수신
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(mat => {
        this.deformManager.injectDeform(mat); // 변형 셰이더 주입
        this.deformManager.meshMaterials.push({ mat, origRoughness: mat.roughness ?? 0.5 }); // 원래 거칠기 저장
      });
    });

    // ── 바운딩 박스 기반 모델 정규화 ─────────────────────────────
    const box    = new THREE.Box3().setFromObject(model);
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale  = 2.0 / Math.max(size.x, size.y, size.z); // 가장 큰 축을 기준으로 2 유닛 크기로 정규화
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale); // 중심을 원점에, 바닥을 Y=0에 맞춤

    // ── 변형 셰이더에 모델 크기 정보 전달 ────────────────────────
    this.deformManager.uModelMinY.value = box.min.y; // 모델 최소 Y값 (높이 비율 계산용)
    this.deformManager.uModelH.value    = size.y;    // 모델 원본 높이
    this.worldModelH = size.y * scale;               // 월드 공간에서의 실제 높이
    this.scene.add(model);

    // ── 미니맵 및 축 헬퍼 업데이트 ──────────────────────────────
    this.minimap.updateFromModel(size, scale, this.worldModelH);
    this.axesDisplay.show(size, scale, this.worldModelH);

    // ── 카메라를 모델 크기에 맞는 위치로 이동 ────────────────────
    const h = this.worldModelH;
    this.initCamPos    = new THREE.Vector3(0, h * 0.8, h * 2.8); // 모델 정면 상단 위치
    this.initCamTarget = new THREE.Vector3(0, h * 0.4, 0);       // 모델 중앙 하부를 바라봄
    this.camera.position.copy(this.initCamPos);
    this.controls.target.copy(this.initCamTarget);
    this.controls.update();

    // ── GLTF 내장 애니메이션 자동 재생 ──────────────────────────
    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(c => mixer.clipAction(c).play()); // 모든 클립 재생
      window._mixer = mixer; // 전역에서 애니메이션 업데이트 가능하도록 저장
    }
    document.getElementById('loading').style.display = 'none'; // 로딩 화면 숨김

    // ── 모델 정보 표시 ────────────────────────────────────────────
    let meshCount = 0, vertexCount = 0;
    model.traverse(child => {
      if (!child.isMesh) return;
      meshCount++;
      vertexCount += child.geometry.attributes.position?.count ?? 0;
    });
    const infoEl = document.getElementById('model-info');
    if (infoEl) {
      infoEl.textContent = `메시 ${meshCount}개 · 버텍스 ${vertexCount.toLocaleString()}개`;
    }
  }

  /**
   * 카메라를 모델 로드 시 설정된 초기 위치로 되돌린다.
   */
  resetCamera() {
    if (this.initCamPos) {
      this.camera.position.copy(this.initCamPos);    // 저장된 초기 위치로 복원
      this.controls.target.copy(this.initCamTarget); // 저장된 초기 타겟으로 복원
      this.controls.update();
    }
  }
}
