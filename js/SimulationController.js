/**
 * SimulationController.js
 *
 * 키프레임 기반 시뮬레이션을 관리하는 클래스.
 * 사용자가 정의한 키프레임(시간 + 변형값 세트)을 순서대로 보간하여
 * Ease In-Out Cubic 커브로 부드럽게 재생한다.
 *
 * 키프레임 구조:
 *   { id, time(초), crack, collapse, sink, age }
 *   - 암묵적 원점(t=0, 모든 값=0)은 항상 첫 번째 기준점으로 사용된다.
 *   - 사용자 키프레임은 시간 순으로 정렬하여 인접 구간을 보간한다.
 *
 * UI 요소:
 *   - 키프레임 목록 컨테이너 (kf-list)
 *   - 키프레임 추가 버튼 (kf-add-btn)
 *   - 재생/일시정지 버튼 (sim-play-btn)
 *   - 리셋 버튼 (sim-reset-btn)
 *   - 진행 바 (sim-progress-bar)
 *   - 현재·전체 시간 표시 (sim-time-cur / sim-time-total)
 *   - 배속 버튼 (.speed-btn)
 */

export class SimulationController {
  /**
   * @param {DeformManager} deformManager - 변형 효과 유니폼을 직접 제어할 관리자
   */
  constructor(deformManager) {
    this.dm          = deformManager; // 변형 관리자 참조
    this.elapsed     = 0;            // 현재 경과 시간 (초)
    this.playing     = false;        // 재생 중 여부
    this.completed   = false;        // 재생 완료 여부
    this.weatherTypes = new Set();   // 활성 날씨 집합 (WeatherController와 공유)
    this.intensity    = 0.5;         // 날씨 강도 (0.0 ~ 1.0)
    this.speed        = 1.0;         // 재생 배속

    this._nextKfId   = 0;            // 키프레임 고유 ID 카운터
    this.keyframes   = [];           // 사용자 정의 키프레임 배열

    // ── UI 요소 참조 ─────────────────────────────────────────────
    this._playBtn     = document.getElementById('sim-play-btn');
    this._resetBtn    = document.getElementById('sim-reset-btn');
    this._progressBar = document.getElementById('sim-progress-bar');
    this._timeCur     = document.getElementById('sim-time-cur');
    this._timeTotal   = document.getElementById('sim-time-total');

    // 기본 키프레임 1개 (10초 시점, 모두 0) 로 시작
    this._addKeyframe(10, 0, 0, 0, 0);
    this._bindUI();
  }

  // ── 공개 API ──────────────────────────────────────────────────

  /**
   * 새 키프레임을 추가하고 목록을 다시 렌더링한다.
   * UIController의 "현재 변형값 복사" 버튼에서도 호출된다.
   * @param {number} time - 키프레임 시간 (초)
   * @param {number} crack / collapse / sink / age - 해당 시점 목표값
   */
  addKeyframe(time, crack, collapse, sink, age) {
    this._addKeyframe(time, crack, collapse, sink, age);
  }

  /**
   * 마지막 키프레임 시간 + 5초를 반환한다.
   * "현재 변형값 복사" 시 다음 키프레임 시간으로 사용된다.
   * @returns {number}
   */
  getNextKeyframeTime() {
    return this.keyframes.length === 0 ? 5 : this._getDuration() + 5;
  }

  // ── 내부 키프레임 관리 ─────────────────────────────────────────

  /**
   * 내부 키프레임 생성·등록 후 DOM을 갱신한다.
   */
  _addKeyframe(time, crack, collapse, sink, age) {
    this.keyframes.push({
      id: this._nextKfId++,
      time:     Math.max(0.1, time),
      crack:    Math.max(0, crack),
      collapse: Math.max(0, collapse),
      sink:     Math.max(0, sink),
      age:      Math.max(0, age),
    });
    this._renderKeyframes();
    this._updateUI();
  }

  /**
   * 키프레임 목록 DOM을 현재 데이터로 전체 재렌더링한다.
   * 시간 순으로 정렬하여 표시한다.
   */
  _renderKeyframes() {
    const list = document.getElementById('kf-list');
    list.innerHTML = '';
    // 화면에는 시간 순으로 정렬하여 표시
    [...this.keyframes]
      .sort((a, b) => a.time - b.time)
      .forEach(kf => list.appendChild(this._createRow(kf)));
  }

  /**
   * 단일 키프레임 행(DOM) 을 생성하고 입력 이벤트를 바인딩한다.
   * @param {object} kf - 키프레임 데이터 객체 (참조)
   * @returns {HTMLElement}
   */
  _createRow(kf) {
    const row = document.createElement('div');
    row.className = 'kf-row';
    row.innerHTML =
      `<input type="number" class="kf-time"     value="${kf.time}"     min="0.1" step="1">` +
      `<input type="number" class="kf-crack"    value="${kf.crack}"    min="0" max="1000">` +
      `<input type="number" class="kf-collapse" value="${kf.collapse}" min="0" max="1000">` +
      `<input type="number" class="kf-sink"     value="${kf.sink}"     min="0" max="1000">` +
      `<input type="number" class="kf-age"      value="${kf.age}"      min="0" max="1000">` +
      `<button class="kf-del" title="삭제">×</button>`;

    // 각 입력 변경 시 kf 데이터 즉시 반영
    ['time', 'crack', 'collapse', 'sink', 'age'].forEach(field => {
      row.querySelector(`.kf-${field}`).addEventListener('input', e => {
        const min = field === 'time' ? 0.1 : 0;
        kf[field] = Math.max(min, parseFloat(e.target.value) || 0);
        this._updateUI(); // 총 시간 표시 갱신
      });
    });

    // 삭제 버튼
    row.querySelector('.kf-del').addEventListener('click', () => {
      this.keyframes = this.keyframes.filter(k => k.id !== kf.id);
      this._renderKeyframes();
      this._updateUI();
    });

    return row;
  }

  // ── 재생 로직 ──────────────────────────────────────────────────

  /**
   * 전체 재생 시간 = 사용자 키프레임 중 가장 큰 time 값.
   * @returns {number}
   */
  _getDuration() {
    if (this.keyframes.length === 0) return 0;
    return Math.max(...this.keyframes.map(k => k.time));
  }

  /**
   * 암묵적 원점(t=0)을 포함한 키프레임 배열을 시간 순으로 반환한다.
   * @returns {Array<{time,crack,collapse,sink,age}>}
   */
  _getSortedFrames() {
    return [
      { time: 0, crack: 0, collapse: 0, sink: 0, age: 0 },
      ...this.keyframes,
    ].sort((a, b) => a.time - b.time);
  }

  /**
   * 특정 경과 시간에서의 변형값을 계산하여 셰이더 유니폼에 반영한다.
   * 인접 두 키프레임 사이를 Ease In-Out Cubic으로 보간한다.
   * @param {number} elapsed - 경과 시간 (초)
   */
  _applyAtTime(elapsed) {
    const frames = this._getSortedFrames();

    // 키프레임이 원점만 있는 경우
    if (frames.length === 1) { this._setValues(frames[0]); return; }

    // 범위 밖 클램프
    if (elapsed <= frames[0].time)              { this._setValues(frames[0]);               return; }
    if (elapsed >= frames[frames.length - 1].time) { this._setValues(frames[frames.length - 1]); return; }

    // 해당 구간의 두 키프레임 탐색
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i], b = frames[i + 1];
      if (elapsed >= a.time && elapsed < b.time) {
        const t = (elapsed - a.time) / (b.time - a.time); // 구간 내 진행률 (0~1)
        // Ease In-Out Cubic
        const e = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
        this._setValues({
          crack:    a.crack    + (b.crack    - a.crack)    * e,
          collapse: a.collapse + (b.collapse - a.collapse) * e,
          sink:     a.sink     + (b.sink     - a.sink)     * e,
          age:      a.age      + (b.age      - a.age)      * e,
        });
        return;
      }
    }
  }

  /**
   * 계산된 변형값을 셰이더 유니폼과 수동 탭 UI에 반영한다.
   * @param {{crack, collapse, sink, age}} v - 적용할 변형값
   */
  _setValues({ crack, collapse, sink, age }) {
    this.dm.uCrack.value    = crack;
    this.dm.uCollapse.value = collapse;
    this.dm.uSink.value     = sink;
    this.dm.applyAge(age);
    // 지진이 활성화된 경우 흔들림 적용
    this.dm.uShake.value = this.weatherTypes.has('quake') ? this.intensity : 0;

    // 수동 탭 수치 동기화
    document.getElementById('crack-val').value    = Math.round(crack);
    document.getElementById('collapse-val').value = Math.round(collapse);
    document.getElementById('sink-val').value     = Math.round(sink);
    document.getElementById('age-val').value      = Math.round(this.dm.age);
  }

  // ── UI 바인딩 ──────────────────────────────────────────────────

  /**
   * 재생·리셋·배속·키프레임 추가 버튼에 이벤트를 등록한다.
   */
  _bindUI() {
    // 재생/일시정지 버튼
    this._playBtn.addEventListener('click', () => {
      if (this.completed) { this.reset(); return; }
      if (this.elapsed >= this._getDuration()) this.elapsed = 0;
      this.playing = !this.playing;
      this._playBtn.textContent = this.playing ? '⏸ 일시정지' : '▶ 재생';
      this._playBtn.classList.toggle('playing', this.playing);
    });

    // 리셋 버튼
    this._resetBtn.addEventListener('click', () => this.reset());

    // 배속 버튼
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.speed = parseFloat(btn.dataset.speed);
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // 키프레임 추가 버튼
    document.getElementById('kf-add-btn').addEventListener('click', () => {
      this._addKeyframe(this.getNextKeyframeTime(), 0, 0, 0, 0);
    });
  }

  /**
   * 진행 바와 시간 표시를 현재 상태에 맞게 갱신한다.
   */
  _updateUI() {
    const dur = this._getDuration();
    const p   = dur > 0 ? Math.min(this.elapsed / dur, 1) : 0;
    this._progressBar.style.width  = (p * 100).toFixed(1) + '%';
    this._timeCur.textContent   = Math.floor(this.elapsed);
    this._timeTotal.textContent = dur;
  }

  // ── 공개 제어 메서드 ───────────────────────────────────────────

  /**
   * 시뮬레이션을 초기 상태(t=0)로 리셋한다.
   */
  reset() {
    this.elapsed = 0; this.playing = false; this.completed = false;
    this._playBtn.textContent = '▶ 재생';
    this._playBtn.classList.remove('playing');
    this._setValues({ crack: 0, collapse: 0, sink: 0, age: 0 });
    this._updateUI();
  }

  /**
   * 재생 중인 시뮬레이션을 일시정지한다.
   */
  pause() {
    if (this.playing) {
      this.playing = false;
      this._playBtn.textContent = '▶ 재생';
      this._playBtn.classList.remove('playing');
    }
  }

  /**
   * 매 프레임 호출. 경과 시간을 진행하고 해당 시점의 변형값을 반영한다.
   * @param {number} dt - 이전 프레임과의 시간 차이 (초)
   */
  tick(dt) {
    if (!this.playing) return;
    const dur = this._getDuration();
    if (dur === 0) return; // 키프레임 없으면 재생 불가

    this.elapsed = Math.min(this.elapsed + dt * this.speed, dur);
    this._applyAtTime(this.elapsed);
    this._updateUI();

    if (this.elapsed >= dur) {
      this.playing   = false;
      this.completed = true;
      this._playBtn.textContent = '✓ 완료';
      this._playBtn.classList.remove('playing');
    }
  }
}
