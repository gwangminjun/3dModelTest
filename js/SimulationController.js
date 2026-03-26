/**
 * SimulationController.js
 *
 * 시뮬레이션 재생/일시정지/리셋 및 변형 효과의 시간 진행을 관리하는 클래스.
 * 사용자가 설정한 목표값(균열, 붕괴, 침하, 노화)과 재생 시간을 바탕으로,
 * easing 함수를 적용한 부드러운 애니메이션 재생을 제공한다.
 *
 * UI 요소:
 * - 재생/일시정지 버튼 (sim-play-btn)
 * - 리셋 버튼 (sim-reset-btn)
 * - 재생 시간 입력 (sim-duration)
 * - 진행 바 (sim-progress-bar)
 * - 현재 시간 / 전체 시간 표시 (sim-time-cur / sim-time-total)
 */

export class SimulationController {
  /**
   * @param {DeformManager} deformManager - 변형 효과 유니폼을 직접 제어할 관리자
   */
  constructor(deformManager) {
    this.dm          = deformManager; // 변형 관리자 참조
    this.elapsed     = 0;            // 현재 경과 시간 (초)
    this.duration    = 30;           // 전체 재생 시간 (초, 기본값 30)
    this.playing     = false;        // 재생 중 여부
    this.completed   = false;        // 시뮬레이션 완료 여부
    this.weatherType = 'none';       // 현재 날씨 타입 (흔들림 효과 계산용)
    this.intensity   = 0.5;          // 날씨 강도 (0.0 ~ 1.0)
    this.speed       = 1.0;          // 재생 배속 (0.5 / 1 / 2 / 4)

    // ── UI 요소 참조 ────────────────────────────────────────────
    this._playBtn     = document.getElementById('sim-play-btn');
    this._resetBtn    = document.getElementById('sim-reset-btn');
    this._durInput    = document.getElementById('sim-duration');
    this._progressBar = document.getElementById('sim-progress-bar');
    this._timeCur     = document.getElementById('sim-time-cur');
    this._timeTotal   = document.getElementById('sim-time-total');

    this._bindUI(); // UI 이벤트 바인딩
  }

  /**
   * 시뮬레이션 UI 버튼 및 입력 요소에 이벤트 리스너를 등록한다.
   */
  _bindUI() {
    // 재생/일시정지 버튼
    this._playBtn.addEventListener('click', () => {
      if (this.completed) { this.reset(); return; } // 완료 상태에서 클릭 시 리셋
      if (this.elapsed >= this.duration) this.elapsed = 0; // 끝에 도달한 경우 처음부터
      this.playing = !this.playing; // 재생/일시정지 토글
      this._playBtn.textContent = this.playing ? '⏸ 일시정지' : '▶ 재생';
      this._playBtn.classList.toggle('playing', this.playing);
    });

    // 리셋 버튼
    this._resetBtn.addEventListener('click', () => this.reset());

    // 재생 시간 입력 변경
    this._durInput.addEventListener('change', () => {
      this.duration = Math.max(1, parseInt(this._durInput.value) || 30); // 최소 1초
      this._durInput.value = this.duration;
      this._updateUI();
    });

    // 배속 버튼
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.speed = parseFloat(btn.dataset.speed);
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  /**
   * 시뮬레이션 목표값 입력 요소에서 현재 값을 읽어 반환한다.
   * @returns {{ crack: number, collapse: number, sink: number, age: number }}
   */
  getTargets() {
    return {
      crack:    Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-crack-target').value)    || 0)),
      collapse: Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-collapse-target').value) || 0)),
      sink:     Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-sink-target').value)     || 0)),
      age:      Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-age-target').value)      || 0)),
    };
  }

  /**
   * 시뮬레이션 진행률(0 ~ 1)에 따라 변형 유니폼을 업데이트한다.
   * Ease In-Out Cubic 함수를 적용하여 시작과 끝이 부드럽게 이어진다.
   * @param {number} p - 진행률 (0.0 ~ 1.0)
   */
  setProgress(p) {
    // Ease In-Out Cubic: 시작은 천천히, 중간은 빠르게, 끝은 천천히
    const e   = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
    const tgt = this.getTargets();
    // 목표값 × easing 계수로 각 유니폼 설정
    this.dm.uCrack.value    = tgt.crack    * e;
    this.dm.uCollapse.value = tgt.collapse * e;
    this.dm.uSink.value     = tgt.sink     * e;
    this.dm.applyAge(tgt.age * e);
    // 지진 날씨일 때만 흔들림 효과 적용
    this.dm.uShake.value = this.weatherType === 'quake' ? this.intensity * e : 0;

    // ── UI 수치 동기화 ───────────────────────────────────────────
    document.getElementById('crack-val').value    = Math.round(this.dm.uCrack.value);
    document.getElementById('collapse-val').value = Math.round(this.dm.uCollapse.value);
    document.getElementById('sink-val').value     = Math.round(this.dm.uSink.value);
    document.getElementById('age-val').value      = Math.round(this.dm.age);
  }

  /**
   * 진행 바와 시간 표시를 현재 경과 시간에 맞게 업데이트한다.
   */
  _updateUI() {
    const p = this.duration > 0 ? Math.min(this.elapsed / this.duration, 1) : 0; // 진행률 (0 ~ 1)
    this._progressBar.style.width  = (p * 100).toFixed(1) + '%'; // 진행 바 너비
    this._timeCur.textContent   = Math.floor(this.elapsed); // 현재 경과 시간 (정수 초)
    this._timeTotal.textContent = this.duration;            // 전체 시간
  }

  /**
   * 시뮬레이션을 초기 상태로 리셋한다.
   * 경과 시간, 재생 상태, 변형 효과를 모두 초기화한다.
   */
  reset() {
    this.elapsed = 0; this.playing = false; this.completed = false;
    this._playBtn.textContent = '▶ 재생';
    this._playBtn.classList.remove('playing');
    this.setProgress(0);  // 변형 효과 초기화
    this._updateUI();     // UI 초기화
  }

  /**
   * 재생 중인 시뮬레이션을 일시정지한다.
   * 이미 멈춰 있으면 아무 동작도 하지 않는다.
   */
  pause() {
    if (this.playing) {
      this.playing = false;
      this._playBtn.textContent = '▶ 재생';
      this._playBtn.classList.remove('playing');
    }
  }

  /**
   * 매 프레임 호출되어 경과 시간을 증가시키고 변형 효과를 업데이트한다.
   * 재생 중이 아니면 즉시 반환한다.
   * @param {number} dt - 이전 프레임과의 시간 차이 (초)
   */
  tick(dt) {
    if (!this.playing) return; // 재생 중이 아니면 무시
    this.elapsed = Math.min(this.elapsed + dt * this.speed, this.duration); // 배속 적용하여 최대 duration까지 증가
    this.setProgress(this.elapsed / this.duration);            // 진행률에 따른 변형 적용
    this._updateUI();
    // 시뮬레이션 완료 처리
    if (this.elapsed >= this.duration) {
      this.playing   = false;
      this.completed = true;
      this._playBtn.textContent = '✓ 완료'; // 완료 상태로 버튼 변경
      this._playBtn.classList.remove('playing');
    }
  }
}
