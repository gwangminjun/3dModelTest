/**
 * main.js
 *
 * 애플리케이션의 진입점(Entry Point).
 * 모든 모듈을 임포트하여 인스턴스를 생성하고,
 * requestAnimationFrame 기반의 렌더링 루프를 실행한다.
 *
 * 초기화 순서:
 * 1. SceneManager     - 렌더러, 씬, 카메라, 조명, 컨트롤 초기화
 * 2. DeformManager    - 변형 셰이더 유니폼 초기화
 * 3. AxesDisplay      - XYZ 축 헬퍼 초기화
 * 4. Minimap          - 조감 미니맵 초기화
 * 5. ModelLoader      - GLB 모델 로드 및 씬 배치
 * 6. ParticleSystem   - 날씨 파티클 시스템 초기화
 * 7. WeatherController - 대기 환경 제어 초기화
 * 8. SimulationController - 시뮬레이션 재생 제어 초기화
 * 9. AgingController  - 자동 노쇠화 제어 초기화
 * 10. UIController    - UI 이벤트 바인딩
 *
 * 렌더링 루프에서 매 프레임 수행하는 작업:
 * - 애니메이션 믹서 업데이트 (모델 내장 애니메이션)
 * - 궤도 컨트롤 감쇠 업데이트
 * - 변형 셰이더 시간 유니폼 증가
 * - 파티클 시스템 이동
 * - 대기 환경(배경/안개/조명) 전환
 * - 노화 머티리얼 거칠기 업데이트
 * - 시뮬레이션 또는 자동 변형 진행
 * - 메인 씬 렌더링
 * - 미니맵 렌더링
 */

import * as THREE from 'three';
import { SceneManager }         from './SceneManager.js';
import { DeformManager }        from './DeformManager.js';
import { AxesDisplay }          from './AxesDisplay.js';
import { Minimap }              from './Minimap.js';
import { ModelLoader }          from './ModelLoader.js';
import { ParticleSystem }       from './ParticleSystem.js';
import { WeatherController }    from './WeatherController.js';
import { AgingController }      from './AgingController.js';
import { SimulationController } from './SimulationController.js';
import { UIController }         from './UIController.js';

// ── 인스턴스 생성 ──────────────────────────────────────────────
const sceneManager     = new SceneManager(); // 씬, 렌더러, 카메라, 조명 초기화
// SceneManager에서 주요 속성을 구조 분해 할당으로 꺼냄
const { scene, camera, controls, renderer, ambient, sunLight } = sceneManager;

const deformManager    = new DeformManager();                                           // 변형 효과 유니폼 관리
const axesDisplay      = new AxesDisplay(scene);                                        // XYZ 축 헬퍼
const minimap          = new Minimap(scene);                                             // 조감 미니맵
const modelLoader      = new ModelLoader(scene, camera, controls, deformManager, axesDisplay, minimap); // 모델 로더
const particleSystem   = new ParticleSystem(scene);                                     // 날씨 파티클 시스템
const weatherController = new WeatherController(scene, ambient, sunLight);              // 대기 환경 제어
const simController    = new SimulationController(deformManager);                       // 시뮬레이션 재생 제어
const agingCtrl    = new AgingController(deformManager);                                // 자동 노쇠화 제어
const uiController     = new UIController({ deformManager, simController, agingController: agingCtrl, weatherController, modelLoader, renderer, camera, controls }); // UI 이벤트 바인딩

// ── 렌더링 루프 ────────────────────────────────────────────────
const clock = new THREE.Clock(); // 프레임 간 시간(dt) 측정용 클럭

(function animate() {
  requestAnimationFrame(animate); // 다음 프레임 예약
  const dt = clock.getDelta();    // 이전 프레임과의 시간 차이 (초)

  // 모델 내장 애니메이션 업데이트 (모델 로드 후 존재할 경우)
  if (window._mixer) window._mixer.update(dt);
  // 궤도 컨트롤 감쇠(Damping) 업데이트
  controls.update();
  // 변형 셰이더의 시간 유니폼 증가 (흔들림 애니메이션용)
  deformManager.uTime.value += dt;
  // 현재 날씨 타입과 강도에 맞게 파티클 이동
  particleSystem.tick(weatherController.weatherTypes, weatherController.intensity);
  // 배경색, 안개, 조명을 날씨 상태에 맞게 부드럽게 전환
  weatherController.updateAtmosphere();
  // 노화 수치에 따른 메시 머티리얼 거칠기 업데이트
  deformManager.updateAgeMaterials();

  // 시뮬레이션 재생 중이면 시뮬레이션 진행, 아니면 날씨 기반 자동 변형
  simController.tick(dt);
  if (!simController.playing && !simController.completed) {
    agingCtrl.tick(dt);          // 자동 노쇠화 진행 (시뮬레이션 비활성 시)
    if (!agingCtrl.playing) {
      // 노쇠화 애니메이션 비활성 시에만 날씨 기반 자동 변형 실행
      uiController.tickAutoDeform(dt);
    }
  }

  // 메인 씬 렌더링 (전체 화면)
  sceneManager.renderMain();
  // 미니맵 렌더링 (우측 상단 영역)
  minimap.render(renderer, camera);
})();
