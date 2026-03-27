/**
 * UIController.js
 *
 * 사용자 인터페이스(UI)와 3D 씬의 변형/날씨 시스템을 연결하는 컨트롤러 클래스.
 * 수동 제어(Manual)와 시뮬레이션(Simulation) 두 가지 탭을 관리하며,
 * 날씨/강도 설정, 수동 변형 수치 입력, 전체 리셋 기능을 담당한다.
 *
 * 주요 역할:
 * - 날씨 라디오 버튼 및 강도 슬라이더 이벤트 처리
 * - 수동 모드에서 균열/붕괴/침하/노화 수치 입력 처리
 * - 자동 모드(날씨 기반)에서 매 프레임 목표값으로 부드럽게 lerp
 * - 탭 전환 (수동 패널 ↔ 시뮬레이션 패널)
 * - 리셋 버튼: 모든 상태 초기화
 */

import * as THREE from 'three';

export class UIController {
  /**
   * @param {object} deps - 의존성 객체
   * @param {DeformManager} deps.deformManager - 변형 유니폼 제어
   * @param {SimulationController} deps.simController - 시뮬레이션 재생 제어
   * @param {WeatherController} deps.weatherController - 날씨 대기 제어
   * @param {ModelLoader} deps.modelLoader - 카메라 리셋용 모델 로더
   */
  constructor({ deformManager, simController, agingController, weatherController, modelLoader, renderer, camera, controls }) {
    this.dm       = deformManager;
    this.sim      = simController;
    this.aging    = agingController;
    this.wc       = weatherController;
    this.ml       = modelLoader;
    this.renderer = renderer;
    this.camera   = camera;
    this.controls = controls;

    // ── 수동 제어 UI 요소 참조 ──────────────────────────────────
    this._crackChk    = document.getElementById('crack-chk');     // 균열 수동 제어 체크박스
    this._collapseChk = document.getElementById('collapse-chk');  // 붕괴 수동 제어 체크박스
    this._sinkChk     = document.getElementById('sink-chk');      // 침하 수동 제어 체크박스
    this._ageChk      = document.getElementById('age-chk');       // 노화 수동 제어 체크박스
    this._crackInput   = document.getElementById('crack-val');    // 균열 수치 입력
    this._collapseInput = document.getElementById('collapse-val'); // 붕괴 수치 입력
    this._sinkInput    = document.getElementById('sink-val');     // 침하 수치 입력
    this._ageInput     = document.getElementById('age-val');      // 노화 수치 입력
    this._crackAuto    = document.getElementById('crack-auto');   // 균열 자동 배지
    this._collapseAuto = document.getElementById('collapse-auto'); // 붕괴 자동 배지
    this._sinkAuto     = document.getElementById('sink-auto');    // 침하 자동 배지
    this._ageAuto      = document.getElementById('age-auto');     // 노화 자동 배지
    this._intensitySlider = document.getElementById('intensity'); // 날씨 강도 슬라이더

    // ── 날씨별 노화 누적 속도 (초당 노화 수치 증가량) ─────────────
    this._AGE_RATE = { none: 0, rain: 3, wind: 4, quake: 7 };

    // ── 이벤트 바인딩 ────────────────────────────────────────────
    this._bindWeather();       // 날씨 설정 이벤트
    this._bindManual();        // 수동 변형 이벤트
    this._bindTabs();          // 탭 전환 이벤트
    this._bindReset();         // 리셋 버튼 이벤트
    this._bindScreenshot();    // 스크린샷 저장 이벤트
    this._bindCameraPresets(); // 카메라 시점 프리셋 이벤트
    this._bindCopyToSim();     // 수동값 → 시뮬레이션 목표 복사 이벤트
    this._loadState();         // 저장된 상태 복원
  }

  /**
   * 날씨 체크박스와 강도 슬라이더에 이벤트 리스너를 등록한다.
   * '없음' 체크 시 다른 날씨를 모두 해제하고, 반대로 날씨 선택 시 '없음'을 해제한다.
   * SimulationController는 WeatherController와 같은 Set 참조를 공유한다.
   */
  _bindWeather() {
    // sim이 wc와 동일한 Set을 참조하도록 초기화
    this.sim.weatherTypes = this.wc.weatherTypes;

    const noneChk = document.querySelector('.weather-chk[value="none"]');

    document.querySelectorAll('.weather-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        if (chk.value === 'none') {
          // '없음' 선택 → 모든 날씨 해제
          if (chk.checked) {
            document.querySelectorAll('.weather-chk:not([value="none"])').forEach(c => c.checked = false);
            this.wc.weatherTypes.clear();
          } else {
            // '없음' 단독 해제는 허용하지 않음
            chk.checked = true;
          }
        } else {
          // 개별 날씨 토글
          if (chk.checked) {
            noneChk.checked = false;
            this.wc.weatherTypes.add(chk.value);
          } else {
            this.wc.weatherTypes.delete(chk.value);
            // 모두 해제되면 자동으로 '없음' 체크
            if (this.wc.weatherTypes.size === 0) noneChk.checked = true;
          }
        }
        this.saveState();
      });
    });

    // 강도 슬라이더 값 변경 시
    this._intensitySlider.addEventListener('input', e => {
      const v = e.target.value / 100; // 0 ~ 100 → 0.0 ~ 1.0
      this.wc.intensity  = v;
      this.sim.intensity = v;
      document.getElementById('intensity-val').textContent = e.target.value; // 수치 표시
      this.saveState();
    });
  }

  /**
   * 수동 변형 체크박스와 수치 입력 요소에 이벤트를 바인딩한다.
   * 각 변형 항목(균열, 붕괴, 침하)은 공통 헬퍼 메서드로 처리하고,
   * 노화(Age)는 applyAge() 메서드 특성상 별도로 처리한다.
   */
  _bindManual() {
    // 균열(Crack) 수동 제어
    this._setupManualInput(
      this._crackChk, this._crackInput, this._crackAuto,
      () => this.dm.uCrack.value / 100,    // 현재 값 읽기 (0 ~ 1)
      v  => { this.dm.uCrack.value = v * 100; } // 값 설정 (0 ~ 100)
    );
    // 붕괴(Collapse) 수동 제어
    this._setupManualInput(
      this._collapseChk, this._collapseInput, this._collapseAuto,
      () => this.dm.uCollapse.value / 100,
      v  => { this.dm.uCollapse.value = v * 100; }
    );
    // 침하(Sink) 수동 제어
    this._setupManualInput(
      this._sinkChk, this._sinkInput, this._sinkAuto,
      () => this.dm.uSink.value / 100,
      v  => { this.dm.uSink.value = v * 100; }
    );

    // 노화(Age) 수동 제어 (applyAge를 통해 다중 유니폼 갱신)
    this._ageChk.addEventListener('change', () => {
      const manual = this._ageChk.checked;
      this._ageInput.disabled = !manual;                          // 수동 모드일 때만 입력 활성화
      this._ageAuto.style.display = manual ? 'none' : 'inline';  // 자동 배지 숨김/표시
      if (manual) this._ageInput.value = Math.round(this.dm.age); // 현재 값으로 초기화
    });
    this._ageInput.addEventListener('input', () => {
      if (this._ageChk.checked) {
        // 수동 모드에서 입력 값을 0 ~ 1000으로 제한하여 적용
        this.dm.applyAge(Math.max(0, Math.min(1000, parseFloat(this._ageInput.value) || 0)));
        this.saveState();
      }
    });
  }

  /**
   * 변형 수치의 수동/자동 모드 전환과 입력 이벤트를 설정하는 공통 헬퍼.
   * 체크박스가 ON이면 수동 입력 활성화, OFF이면 자동 lerp 모드.
   * @param {HTMLInputElement} chk - 수동 모드 체크박스
   * @param {HTMLInputElement} input - 수치 입력 요소
   * @param {HTMLElement} autoBadge - 자동 모드 배지 요소
   * @param {Function} getVal - 현재 정규화된 값을 반환하는 함수 (0 ~ 1)
   * @param {Function} setVal - 정규화된 값을 설정하는 함수 (0 ~ 1)
   */
  _setupManualInput(chk, input, autoBadge, getVal, setVal) {
    // 체크박스 상태 변경 시
    chk.addEventListener('change', () => {
      const manual = chk.checked;
      input.disabled = !manual;                              // 수동 모드에서만 입력 가능
      autoBadge.style.display = manual ? 'none' : 'inline'; // 자동 배지 토글
      if (manual) input.value = Math.round(getVal() * 100); // 현재 값 표시
      this.saveState();
    });
    // 수치 입력 변경 시 (수동 모드에서만 적용)
    input.addEventListener('input', () => {
      if (chk.checked) { setVal((parseFloat(input.value) || 0) / 100); this.saveState(); }
    });
  }

  /**
   * 수동/시뮬레이션/자동 노쇠화 탭 전환 이벤트를 등록한다.
   * 수동 탭으로 전환 시 진행 중인 시뮬레이션과 노쇠화를 일시정지한다.
   */
  _bindTabs() {
    // 수동(Manual) 탭
    document.getElementById('tab-manual').addEventListener('click', () => {
      this._setTab('manual');
      this.sim.pause();
      this.aging.pause();
    });
    // 시뮬레이션(Simulation) 탭
    document.getElementById('tab-sim').addEventListener('click', () => {
      this._setTab('sim');
      this.aging.pause();
    });
    // 자동 노쇠화(Aging) 탭
    document.getElementById('tab-aging').addEventListener('click', () => {
      this._setTab('aging');
      this.sim.pause();
    });
  }

  _setTab(name) {
    const tabs   = ['manual', 'sim', 'aging'];
    const panels = ['manual', 'sim', 'aging'];
    tabs.forEach(t => {
      document.getElementById(`tab-${t}`).classList.toggle('active', t === name);
    });
    panels.forEach(p => {
      const el = document.getElementById(`panel-${p}`);
      if (el) el.style.display = p === name ? '' : 'none';
    });
  }

  /**
   * 전체 리셋 버튼에 이벤트를 등록한다.
   * 날씨, 강도, 모든 변형 수치, 시뮬레이션 상태, 카메라를 초기화한다.
   */
  _bindReset() {
    document.getElementById('reset-btn').addEventListener('click', () => {
      // 날씨를 '없음'으로 초기화
      document.querySelectorAll('.weather-chk').forEach(c => { c.checked = c.value === 'none'; });
      this.wc.weatherTypes.clear();
      // 강도를 기본값(50%)으로 초기화
      this._intensitySlider.value = 50;
      this.wc.intensity  = 0.5;
      this.sim.intensity = 0.5;
      document.getElementById('intensity-val').textContent = '50';

      // 모든 수동 제어 체크박스와 입력값 초기화
      [
        [this._crackChk,    this._crackInput,    this._crackAuto],
        [this._collapseChk, this._collapseInput, this._collapseAuto],
        [this._sinkChk,     this._sinkInput,     this._sinkAuto],
        [this._ageChk,      this._ageInput,      this._ageAuto],
      ].forEach(([chk, inp, aut]) => {
        chk.checked = false;        // 체크박스 해제
        inp.disabled = true;        // 입력 비활성화
        inp.value = 0;              // 수치 초기화
        aut.style.display = 'none'; // 자동 배지 숨김
      });

      this.dm.reset();         // 변형 유니폼 초기화
      this.sim.reset();        // 시뮬레이션 상태 초기화
      this.aging.reset();      // 자동 노쇠화 상태 초기화
      this.ml.resetCamera();   // 카메라 위치 초기화
      localStorage.removeItem('damageSimState'); // 저장된 상태 삭제
    });
  }

  /**
   * 현재 렌더링 화면을 PNG 파일로 다운로드한다.
   */
  _bindScreenshot() {
    document.getElementById('screenshot-btn').addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `damage_sim_${Date.now()}.png`;
      link.href = this.renderer.domElement.toDataURL('image/png');
      link.click();
    });
  }

  /**
   * 정면/측면/상단 카메라 시점 프리셋 버튼 이벤트를 등록한다.
   * 모델이 로드되지 않은 경우 기본 거리를 사용한다.
   */
  _bindCameraPresets() {
    const go = (pos, target) => {
      this.camera.position.set(...pos);
      this.controls.target.set(...target);
      this.controls.update();
    };
    document.getElementById('cam-front').addEventListener('click', () => {
      const h = this.ml.worldModelH || 2;
      go([0, h * 0.8, h * 2.8], [0, h * 0.4, 0]);
    });
    document.getElementById('cam-side').addEventListener('click', () => {
      const h = this.ml.worldModelH || 2;
      go([h * 2.8, h * 0.8, 0], [0, h * 0.4, 0]);
    });
    document.getElementById('cam-top').addEventListener('click', () => {
      const h = this.ml.worldModelH || 2;
      go([0, h * 4.5, 0.001], [0, 0, 0]);
    });
  }

  /**
   * 현재 변형 수치를 새 키프레임으로 추가한다.
   * 추가 시점은 마지막 키프레임 시간 + 5초.
   */
  _bindCopyToSim() {
    document.getElementById('sim-copy-btn').addEventListener('click', () => {
      this.sim.addKeyframe(
        this.sim.getNextKeyframeTime(),
        Math.round(this.dm.uCrack.value),
        Math.round(this.dm.uCollapse.value),
        Math.round(this.dm.uSink.value),
        Math.round(this.dm.age)
      );
    });
  }

  /**
   * animate 루프에서 매 프레임 호출된다.
   * 자동 모드(날씨 기반)에서 변형 수치를 목표값으로 부드럽게 lerp하고,
   * 날씨에 따른 노화를 실시간으로 누적한다.
   * 시뮬레이션 재생 중이거나 완료 상태에서는 호출되지 않는다.
   * @param {number} dt - 이전 프레임과의 시간 차이 (초)
   */
  tickAutoDeform(dt) {
    const { weatherTypes, intensity } = this.wc;
    const tgt        = this.wc.calcAutoTargets(); // 활성 날씨 합산 목표값 계산
    const hasWeather = weatherTypes.size > 0;     // 날씨 활성 여부

    // 각 변형 항목을 목표값으로 부드럽게 수렴 (자동 모드일 때만)
    this._autoLerp(this._crackChk,    this._crackInput,    this._crackAuto,    this.dm.uCrack,    tgt.crack,    0.020, hasWeather);
    this._autoLerp(this._collapseChk, this._collapseInput, this._collapseAuto, this.dm.uCollapse, tgt.collapse, 0.015, hasWeather);
    this._autoLerp(this._sinkChk,     this._sinkInput,     this._sinkAuto,     this.dm.uSink,     tgt.sink,     0.015, hasWeather);

    // 흔들림: 지진이 활성화된 경우 강도로 수렴, 아닐 때 0으로 수렴
    this.dm.uShake.value = THREE.MathUtils.lerp(
      this.dm.uShake.value,
      weatherTypes.has('quake') ? intensity : 0,
      0.05
    );

    // 노화 자동 누적 (수동 모드가 아닐 때만) — 활성 날씨 누적 속도 합산
    if (!this._ageChk.checked) {
      const rate   = [...weatherTypes].reduce((sum, t) => sum + (this._AGE_RATE[t] || 0), 0) * intensity;
      const newAge = Math.min(1000, this.dm.age + rate * dt);
      this.dm.applyAge(newAge);
      this._ageInput.value = Math.round(this.dm.age);
      this._ageAuto.style.display = hasWeather ? 'inline' : 'none';
    }
  }

  /**
   * 단일 변형 항목의 자동 lerp를 수행하는 내부 헬퍼.
   * 수동 모드(체크박스 ON)일 때는 값을 유지하고 UI만 갱신한다.
   * 자동 모드(체크박스 OFF)일 때는 목표값으로 lerp한다.
   * @param {HTMLInputElement} chk - 수동 모드 체크박스
   * @param {HTMLInputElement} inp - 수치 입력 요소
   * @param {HTMLElement} aut - 자동 배지 요소
   * @param {{ value: number }} uVal - 유니폼 값 객체 (참조)
   * @param {number} target - 자동 모드에서의 목표값
   * @param {number} speed - lerp 속도 (0 ~ 1)
   * @param {boolean} hasWeather - 날씨가 하나라도 활성화된 여부
   */
  _autoLerp(chk, inp, aut, uVal, target, speed, hasWeather) {
    if (chk.checked) {
      // 수동 모드: 값을 0 ~ 1000 범위로 제한만 함
      uVal.value = Math.max(0, Math.min(1000, uVal.value));
    } else {
      // 자동 모드: 목표값으로 부드럽게 수렴
      uVal.value = THREE.MathUtils.lerp(uVal.value, target, speed);
      inp.value  = Math.round(uVal.value); // UI 수치 업데이트
      aut.style.display = hasWeather ? 'inline' : 'none'; // 자동 배지 표시
    }
  }

  /**
   * 현재 날씨·강도·변형 수치를 localStorage에 저장한다.
   * 날씨/강도/수동체크 변경 시 자동 호출된다.
   */
  saveState() {
    const state = {
      weather:  [...this.wc.weatherTypes], // 활성 날씨 배열로 직렬화
      intensity: Math.round(this._intensitySlider.value),
      crack:    { manual: this._crackChk.checked,    val: Math.round(this.dm.uCrack.value) },
      collapse: { manual: this._collapseChk.checked, val: Math.round(this.dm.uCollapse.value) },
      sink:     { manual: this._sinkChk.checked,     val: Math.round(this.dm.uSink.value) },
      age:      { manual: this._ageChk.checked,      val: Math.round(this.dm.age) },
    };
    localStorage.setItem('damageSimState', JSON.stringify(state));
  }

  /**
   * localStorage에서 저장된 상태를 불러와 UI와 변형값을 복원한다.
   */
  _loadState() {
    let state;
    try { state = JSON.parse(localStorage.getItem('damageSimState')); } catch { return; }
    if (!state) return;

    // 날씨 복원 (구버전 문자열 형식도 호환)
    const weathers = Array.isArray(state.weather)
      ? state.weather
      : (state.weather && state.weather !== 'none' ? [state.weather] : []);
    const noneChk = document.querySelector('.weather-chk[value="none"]');
    weathers.forEach(w => {
      this.wc.weatherTypes.add(w);
      const chk = document.querySelector(`.weather-chk[value="${w}"]`);
      if (chk) chk.checked = true;
    });
    if (noneChk) noneChk.checked = this.wc.weatherTypes.size === 0;
    // 강도 복원
    const iv = state.intensity ?? 50;
    this._intensitySlider.value = iv;
    this.wc.intensity  = iv / 100;
    this.sim.intensity = iv / 100;
    document.getElementById('intensity-val').textContent = iv;

    // 각 변형 항목 복원
    const restore = (chk, inp, aut, setFn, entry) => {
      if (!entry) return;
      chk.checked         = entry.manual;
      inp.disabled        = !entry.manual;
      aut.style.display   = entry.manual ? 'none' : 'none';
      if (entry.manual) { inp.value = entry.val; setFn(entry.val); }
    };
    restore(this._crackChk,    this._crackInput,    this._crackAuto,    v => { this.dm.uCrack.value = v; },    state.crack);
    restore(this._collapseChk, this._collapseInput, this._collapseAuto, v => { this.dm.uCollapse.value = v; }, state.collapse);
    restore(this._sinkChk,     this._sinkInput,     this._sinkAuto,     v => { this.dm.uSink.value = v; },    state.sink);
    restore(this._ageChk,      this._ageInput,      this._ageAuto,      v => this.dm.applyAge(v),             state.age);
  }
}
