# 자동 노쇠화 애니메이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시간의 흐름에 따라 건물이 자동으로 노쇠화되는 독립 애니메이션 모드를 추가한다. 총 연도와 재생 시간을 설정하면, 균열·붕괴·침하·노화 효과가 선형으로 자동 증가하며 경과 연도가 실시간 표시된다.

**Architecture:** 새로운 `AgingController` 클래스를 독립 파일로 분리. `DeformManager`에만 의존하며 매 프레임 `tick(dt)`으로 경과 시간을 누적하고 `t = elapsed/duration`(0~1)을 각 효과에 ×1000 매핑. 기존 `SimulationController`가 재생 중이면 `AgingController.tick`을 건너뛴다.

**Tech Stack:** Three.js 0.169, Vanilla JS (ES Modules), Vitest + jsdom (테스트)

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `js/AgingController.js` | **신규** — 자동 노쇠화 로직 + DOM 바인딩 |
| `tests/AgingController.test.js` | **신규** — AgingController 단위 테스트 |
| `vitest.config.js` | **신규** — vitest + jsdom 환경 설정 |
| `package.json` | 수정 — type module, vitest 추가 |
| `index.html` | 수정 — 탭 버튼 + 노쇠화 패널 HTML |
| `js/UIController.js` | 수정 — 3번째 탭 전환 로직 + 리셋 연동 |
| `js/main.js` | 수정 — import, 인스턴스, tick 호출 |
| `css/style.css` | 수정 — 연도 표시·패널 스타일 |

---

## Task 1: 테스트 환경 설정

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: vitest + jsdom 설치**

```bash
cd D:/IdeaProjects/git/3dModelTest
npm install --save-dev vitest jsdom
```

Expected: `node_modules/vitest`, `node_modules/jsdom` 생성됨

- [ ] **Step 2: package.json 수정 — type + scripts 추가**

`package.json`의 `"type"` 값을 `"commonjs"` → `"module"`로 변경하고 test 스크립트를 추가한다.

```json
{
  "name": "3dmodeltest",
  "version": "1.0.0",
  "description": "3d 모델 테스트입니다.",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/gwangminjun/3dModelTest.git"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/gwangminjun/3dModelTest/issues"
  },
  "homepage": "https://github.com/gwangminjun/3dModelTest#readme",
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "jsdom": "^26.1.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: vitest.config.js 생성**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 4: 환경 확인**

```bash
npx vitest run --reporter=verbose
```

Expected: "No test files found" 또는 "0 tests passed" (오류 없이 종료)

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.js package-lock.json
git commit -m "chore: vitest + jsdom 테스트 환경 추가"
```

---

## Task 2: AgingController — computeYear 순수 함수 (TDD)

**Files:**
- Create: `js/AgingController.js` (스텁)
- Create: `tests/AgingController.test.js`

- [ ] **Step 1: 빈 AgingController 스텁 생성**

```js
// js/AgingController.js
export class AgingController {
  static computeYear(elapsed, durationSeconds, totalYears) {
    // TODO
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

```js
// tests/AgingController.test.js
import { describe, it, expect } from 'vitest';
import { AgingController } from '../js/AgingController.js';

describe('AgingController.computeYear', () => {
  it('elapsed 0에서 0년을 반환한다', () => {
    expect(AgingController.computeYear(0, 30, 100)).toBe(0);
  });

  it('full duration에서 totalYears를 반환한다', () => {
    expect(AgingController.computeYear(30, 30, 100)).toBe(100);
  });

  it('절반 경과 시 총 연도의 절반을 반환한다', () => {
    expect(AgingController.computeYear(15, 30, 100)).toBe(50);
  });

  it('duration 초과 시 totalYears로 클램프한다', () => {
    expect(AgingController.computeYear(60, 30, 100)).toBe(100);
  });

  it('durationSeconds가 0이면 0을 반환한다', () => {
    expect(AgingController.computeYear(5, 0, 100)).toBe(0);
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
npx vitest run tests/AgingController.test.js --reporter=verbose
```

Expected: 5개 테스트 모두 FAIL (`computeYear` 미구현)

- [ ] **Step 4: 최소 구현**

```js
// js/AgingController.js
export class AgingController {
  static computeYear(elapsed, durationSeconds, totalYears) {
    if (durationSeconds <= 0) return 0;
    return Math.min(elapsed / durationSeconds, 1) * totalYears;
  }
}
```

- [ ] **Step 5: 통과 확인**

```bash
npx vitest run tests/AgingController.test.js --reporter=verbose
```

Expected: 5개 테스트 모두 PASS

- [ ] **Step 6: Commit**

```bash
git add js/AgingController.js tests/AgingController.test.js
git commit -m "feat: AgingController computeYear 순수 함수 구현 (TDD)"
```

---

## Task 3: AgingController — tick + 효과 적용 (TDD)

**Files:**
- Modify: `js/AgingController.js`
- Modify: `tests/AgingController.test.js`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/AgingController.test.js` 파일 하단에 추가:

```js
// DOM 환경 헬퍼 함수
function setupDOM() {
  document.body.innerHTML = `
    <button id="aging-play-btn"></button>
    <button id="aging-reset-btn"></button>
    <div id="aging-progress-bar" style=""></div>
    <span id="aging-year-cur"></span>
    <span id="aging-year-total"></span>
    <input id="aging-total-years" value="100" />
    <input id="aging-duration" value="30" />
    <input type="checkbox" id="aging-fx-crack" checked />
    <input type="checkbox" id="aging-fx-collapse" checked />
    <input type="checkbox" id="aging-fx-sink" checked />
    <input type="checkbox" id="aging-fx-age" checked />
  `;
}

function makeDM() {
  return {
    uCrack:    { value: 0 },
    uCollapse: { value: 0 },
    uSink:     { value: 0 },
    age:       0,
    applyAge:  vi.fn(v => { /* no-op mock */ }),
  };
}

describe('AgingController tick', () => {
  let dm;

  beforeEach(() => {
    setupDOM();
    dm = makeDM();
  });

  it('playing이 false이면 elapsed가 변하지 않는다', () => {
    const ctrl = new AgingController(dm);
    ctrl.playing = false;
    ctrl.tick(1);
    expect(ctrl.elapsed).toBe(0);
  });

  it('playing 중 tick(dt)는 elapsed를 dt만큼 증가시킨다', () => {
    const ctrl = new AgingController(dm);
    ctrl.playing = true;
    ctrl.tick(1);
    expect(ctrl.elapsed).toBeCloseTo(1);
  });

  it('elapsed가 durationSeconds를 초과하지 않는다', () => {
    const ctrl = new AgingController(dm);
    ctrl.playing = true;
    ctrl.durationSeconds = 5;
    ctrl.tick(100);
    expect(ctrl.elapsed).toBe(5);
  });

  it('모든 효과 활성화 시 tick 후 uCrack에 값이 주입된다', () => {
    const ctrl = new AgingController(dm);
    ctrl.playing = true;
    ctrl.durationSeconds = 10;
    ctrl.totalYears = 100;
    ctrl.tick(5); // 절반 경과 → t = 0.5 → 500
    expect(dm.uCrack.value).toBeCloseTo(500);
    expect(dm.uCollapse.value).toBeCloseTo(500);
    expect(dm.uSink.value).toBeCloseTo(500);
    expect(dm.applyAge).toHaveBeenCalledWith(expect.closeTo(500, 0));
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run tests/AgingController.test.js --reporter=verbose
```

Expected: `tick` 관련 4개 테스트 FAIL (`tick` 메서드 없음)

- [ ] **Step 3: tick + _applyEffects 구현**

`js/AgingController.js`를 아래로 교체:

```js
export class AgingController {
  constructor(deformManager) {
    this.dm              = deformManager;
    this.totalYears      = 100;
    this.durationSeconds = 30;
    this.enabledEffects  = { crack: true, collapse: true, sink: true, age: true };
    this.elapsed         = 0;
    this.speed           = 1.0;
    this.playing         = false;
    this.completed       = false;

    this._playBtn     = document.getElementById('aging-play-btn');
    this._resetBtn    = document.getElementById('aging-reset-btn');
    this._progressBar = document.getElementById('aging-progress-bar');
    this._yearCur     = document.getElementById('aging-year-cur');
    this._yearTotal   = document.getElementById('aging-year-total');
    this._totalYearsInput = document.getElementById('aging-total-years');
    this._durationInput   = document.getElementById('aging-duration');
    this._effectChks  = {
      crack:    document.getElementById('aging-fx-crack'),
      collapse: document.getElementById('aging-fx-collapse'),
      sink:     document.getElementById('aging-fx-sink'),
      age:      document.getElementById('aging-fx-age'),
    };

    this._bindUI();
  }

  static computeYear(elapsed, durationSeconds, totalYears) {
    if (durationSeconds <= 0) return 0;
    return Math.min(elapsed / durationSeconds, 1) * totalYears;
  }

  tick(dt) {
    if (!this.playing) return;
    this.elapsed = Math.min(this.elapsed + dt * this.speed, this.durationSeconds);
    const t = this.durationSeconds > 0 ? this.elapsed / this.durationSeconds : 0;
    this._applyEffects(t);
    this._updateUI(t * this.totalYears);

    if (this.elapsed >= this.durationSeconds) {
      this.playing   = false;
      this.completed = true;
      this._playBtn.textContent = '✓ 완료';
      this._playBtn.classList.remove('playing');
    }
  }

  _applyEffects(t) {
    const val = t * 1000;
    if (this.enabledEffects.crack)    this.dm.uCrack.value    = val;
    if (this.enabledEffects.collapse) this.dm.uCollapse.value  = val;
    if (this.enabledEffects.sink)     this.dm.uSink.value      = val;
    if (this.enabledEffects.age)      this.dm.applyAge(val);
  }

  _updateUI(currentYear) {
    const p = this.durationSeconds > 0 ? this.elapsed / this.durationSeconds : 0;
    this._progressBar.style.width   = (p * 100).toFixed(1) + '%';
    this._yearCur.textContent       = Math.floor(currentYear);
    this._yearTotal.textContent     = this.totalYears;
  }

  reset() {
    this.elapsed   = 0;
    this.playing   = false;
    this.completed = false;
    this._playBtn.textContent = '▶ 재생';
    this._playBtn.classList.remove('playing');
    this._applyEffects(0);
    this._updateUI(0);
  }

  pause() {
    if (this.playing) {
      this.playing = false;
      this._playBtn.textContent = '▶ 재생';
      this._playBtn.classList.remove('playing');
    }
  }

  _bindUI() {
    this._playBtn.addEventListener('click', () => {
      if (this.completed) { this.reset(); return; }
      if (this.elapsed >= this.durationSeconds) this.elapsed = 0;
      this.playing = !this.playing;
      this._playBtn.textContent = this.playing ? '⏸ 일시정지' : '▶ 재생';
      this._playBtn.classList.toggle('playing', this.playing);
    });

    this._resetBtn.addEventListener('click', () => this.reset());

    this._totalYearsInput.addEventListener('input', e => {
      this.totalYears = Math.max(1, parseInt(e.target.value) || 1);
      this._updateUI(AgingController.computeYear(this.elapsed, this.durationSeconds, this.totalYears));
    });

    this._durationInput.addEventListener('input', e => {
      this.durationSeconds = Math.max(1, parseFloat(e.target.value) || 1);
    });

    document.querySelectorAll('.aging-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.speed = parseFloat(btn.dataset.speed);
        document.querySelectorAll('.aging-speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    Object.entries(this._effectChks).forEach(([key, chk]) => {
      chk.addEventListener('change', () => {
        this.enabledEffects[key] = chk.checked;
      });
    });
  }
}
```

- [ ] **Step 4: 통과 확인**

```bash
npx vitest run tests/AgingController.test.js --reporter=verbose
```

Expected: 9개 테스트 모두 PASS

- [ ] **Step 5: Commit**

```bash
git add js/AgingController.js tests/AgingController.test.js
git commit -m "feat: AgingController tick + 효과 적용 구현 (TDD)"
```

---

## Task 4: AgingController — enabledEffects, speed, reset, complete (TDD)

**Files:**
- Modify: `tests/AgingController.test.js`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/AgingController.test.js` 하단에 추가:

```js
import { beforeEach, vi } from 'vitest';

describe('AgingController enabledEffects', () => {
  let dm;

  beforeEach(() => {
    setupDOM();
    dm = makeDM();
  });

  it('crack 비활성화 시 uCrack.value가 변경되지 않는다', () => {
    const ctrl = new AgingController(dm);
    ctrl.playing = true;
    ctrl.enabledEffects.crack = false;
    ctrl.tick(5);
    expect(dm.uCrack.value).toBe(0);
  });

  it('age 비활성화 시 applyAge가 호출되지 않는다', () => {
    const ctrl = new AgingController(dm);
    ctrl.playing = true;
    ctrl.enabledEffects.age = false;
    ctrl.tick(5);
    expect(dm.applyAge).not.toHaveBeenCalled();
  });
});

describe('AgingController speed', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('speed=2 이면 동일 dt에서 elapsed가 2배 증가한다', () => {
    const ctrl = new AgingController(makeDM());
    ctrl.playing = true;
    ctrl.speed   = 2;
    ctrl.tick(1);
    expect(ctrl.elapsed).toBeCloseTo(2);
  });
});

describe('AgingController reset', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('reset 후 elapsed가 0이 된다', () => {
    const ctrl = new AgingController(makeDM());
    ctrl.playing = true;
    ctrl.tick(5);
    ctrl.reset();
    expect(ctrl.elapsed).toBe(0);
  });

  it('reset 후 playing이 false가 된다', () => {
    const ctrl = new AgingController(makeDM());
    ctrl.playing = true;
    ctrl.reset();
    expect(ctrl.playing).toBe(false);
  });

  it('reset 후 모든 효과가 0으로 초기화된다', () => {
    const dm2 = makeDM();
    const ctrl = new AgingController(dm2);
    ctrl.playing = true;
    ctrl.tick(5);
    ctrl.reset();
    expect(dm2.uCrack.value).toBe(0);
    expect(dm2.uCollapse.value).toBe(0);
    expect(dm2.uSink.value).toBe(0);
    expect(dm2.applyAge).toHaveBeenLastCalledWith(0);
  });
});

describe('AgingController complete', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('durationSeconds 도달 시 completed가 true가 된다', () => {
    const ctrl = new AgingController(makeDM());
    ctrl.playing = true;
    ctrl.durationSeconds = 5;
    ctrl.tick(10);
    expect(ctrl.completed).toBe(true);
    expect(ctrl.playing).toBe(false);
  });

  it('완료 후 elapsed는 durationSeconds를 초과하지 않는다', () => {
    const ctrl = new AgingController(makeDM());
    ctrl.playing = true;
    ctrl.durationSeconds = 5;
    ctrl.tick(100);
    expect(ctrl.elapsed).toBe(5);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run tests/AgingController.test.js --reporter=verbose
```

Expected: 새로 추가된 9개 테스트 FAIL (enabledEffects 로직 미구현 또는 import 문제)

> 모든 테스트가 이미 구현된 코드로 PASS된다면 Task 3에서 구현이 완료된 것이므로 다음 단계로 넘어간다.

- [ ] **Step 3: 전체 통과 확인**

```bash
npx vitest run tests/AgingController.test.js --reporter=verbose
```

Expected: 전체 테스트 PASS (이미 Task 3 구현이 모두 커버)

- [ ] **Step 4: Commit**

```bash
git add tests/AgingController.test.js
git commit -m "test: AgingController enabledEffects·speed·reset·complete 테스트 추가"
```

---

## Task 5: index.html — 자동 노쇠화 탭 + 패널 추가

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 모드 토글에 세 번째 탭 버튼 추가**

`index.html`의 아래 코드를:
```html
    <div class="mode-toggle">
      <button id="tab-manual" class="tab active">수동 변형</button>
      <button id="tab-sim"    class="tab">시뮬레이션</button>
    </div>
```

다음으로 교체:
```html
    <div class="mode-toggle">
      <button id="tab-manual" class="tab active">수동 변형</button>
      <button id="tab-sim"    class="tab">시뮬레이션</button>
      <button id="tab-aging"  class="tab">자동 노쇠화</button>
    </div>
```

- [ ] **Step 2: 자동 노쇠화 패널 HTML 추가**

`index.html`에서 `<!-- 시뮬레이션 패널 (키프레임) -->` 블록 바로 뒤(`</div>` 이후)에 추가:

```html
    <!-- 자동 노쇠화 패널 -->
    <div id="panel-aging" class="sec mode-panel" style="display:none;">
      <div class="deform-hint">설정한 기간에 걸쳐 건물이 자동으로 노쇠화됩니다</div>

      <!-- 설정 -->
      <div class="aging-setting-row">
        <span class="aging-setting-label">총 연도</span>
        <input type="number" id="aging-total-years" value="100" min="1" max="9999" />
        <span class="aging-setting-unit">년</span>
      </div>
      <div class="aging-setting-row">
        <span class="aging-setting-label">재생 시간</span>
        <input type="number" id="aging-duration" value="30" min="1" max="3600" />
        <span class="aging-setting-unit">초</span>
      </div>

      <!-- 효과 선택 -->
      <div class="aging-fx-title">자동 진행 효과</div>
      <div class="aging-fx-grid">
        <label><input type="checkbox" id="aging-fx-crack"    checked /> 균열</label>
        <label><input type="checkbox" id="aging-fx-collapse" checked /> 붕괴</label>
        <label><input type="checkbox" id="aging-fx-sink"     checked /> 침하</label>
        <label><input type="checkbox" id="aging-fx-age"      checked /> 노화</label>
      </div>

      <!-- 배속 -->
      <div class="sim-row" style="margin-top:10px;">
        <span class="sim-label">배속</span>
        <div class="speed-btns">
          <button class="aging-speed-btn" data-speed="0.5">0.5x</button>
          <button class="aging-speed-btn active" data-speed="1">1x</button>
          <button class="aging-speed-btn" data-speed="2">2x</button>
          <button class="aging-speed-btn" data-speed="4">4x</button>
        </div>
      </div>

      <!-- 경과 연도 표시 -->
      <div class="aging-year-display">
        <div class="aging-year-label">경과 연도</div>
        <div class="aging-year-value">
          <span id="aging-year-cur">0</span>
          <span class="aging-year-sep"> / </span>
          <span id="aging-year-total">100</span>
          <span class="aging-year-unit">년</span>
        </div>
      </div>

      <!-- 진행 바 -->
      <div class="sim-progress-wrap">
        <div id="aging-progress-bar"></div>
      </div>

      <!-- 재생 컨트롤 -->
      <div class="sim-controls">
        <button id="aging-play-btn">▶ 재생</button>
        <button id="aging-reset-btn">↺ 리셋</button>
      </div>
    </div>
```

- [ ] **Step 3: 수동 확인 (브라우저 실행)**

로컬 서버 또는 브라우저에서 `index.html` 열기. 콘솔 오류 없이 로드되고, 탭 버튼에 "자동 노쇠화"가 표시되어야 한다. (아직 클릭해도 패널이 전환되지 않음 — Task 7에서 처리)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: 자동 노쇠화 탭 버튼 + 패널 HTML 추가"
```

---

## Task 6: UIController.js — 3번째 탭 전환 + 리셋 연동

**Files:**
- Modify: `js/UIController.js`

- [ ] **Step 1: constructor 서명에 agingController 추가**

`UIController.js`의 constructor 첫 줄을 교체:

```js
  constructor({ deformManager, simController, agingController, weatherController, modelLoader, renderer, camera, controls }) {
    this.dm       = deformManager;
    this.sim      = simController;
    this.aging    = agingController;
    this.wc       = weatherController;
    this.ml       = modelLoader;
    this.renderer = renderer;
    this.camera   = camera;
    this.controls = controls;
```

- [ ] **Step 2: _bindTabs()에 aging 탭 전환 추가**

`_bindTabs()` 메서드 전체를 아래로 교체:

```js
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
```

- [ ] **Step 3: _bindReset()에 aging 리셋 추가**

`_bindReset()` 내부 `this.sim.reset();` 바로 뒤에 추가:

```js
      this.aging.reset();      // 자동 노쇠화 상태 초기화
```

- [ ] **Step 4: Commit**

```bash
git add js/UIController.js
git commit -m "feat: UIController 자동 노쇠화 탭 전환 + 리셋 연동"
```

---

## Task 7: main.js — AgingController 연동

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: import 추가**

`main.js` 상단의 import 블록에 추가:

```js
import { AgingController }      from './AgingController.js';
```

기존 import 블록:
```js
import { UIController }         from './UIController.js';
```
→ 이 줄 바로 위에 삽입.

- [ ] **Step 2: 인스턴스 생성 추가**

`main.js`에서 `const simController = ...` 줄 바로 뒤에 추가:

```js
const agingCtrl    = new AgingController(deformManager);                                // 자동 노쇠화 제어
```

- [ ] **Step 3: UIController 생성자에 agingController 전달**

기존:
```js
const uiController     = new UIController({ deformManager, simController, weatherController, modelLoader, renderer, camera, controls });
```
→ 교체:
```js
const uiController     = new UIController({ deformManager, simController, agingController: agingCtrl, weatherController, modelLoader, renderer, camera, controls });
```

- [ ] **Step 4: 렌더 루프에 tick 추가**

`main.js` 애니메이션 루프의 `simController.tick(dt);` 바로 뒤에 추가:

```js
  // 시뮬레이션 비활성 시 자동 노쇠화 진행
  if (!simController.playing && !simController.completed) {
    agingCtrl.tick(dt);
  }
```

기존 조건:
```js
  if (!simController.playing && !simController.completed) {
    // 시뮬레이션이 비활성 상태일 때만 날씨 기반 자동 변형 실행
    uiController.tickAutoDeform(dt);
  }
```

→ 교체:
```js
  if (!simController.playing && !simController.completed) {
    agingCtrl.tick(dt);
    uiController.tickAutoDeform(dt);
  }
```

- [ ] **Step 5: 브라우저에서 동작 확인**

브라우저에서 GLB 모델 로드 후:
1. "자동 노쇠화" 탭 클릭 → 패널이 표시됨
2. ▶ 재생 → 경과 연도 숫자가 증가하고 건물이 점점 낡아짐
3. ↺ 리셋 → 0년으로 복귀, 건물 원상태
4. 전체 초기화 버튼 → 노쇠화 리셋

- [ ] **Step 6: Commit**

```bash
git add js/main.js
git commit -m "feat: main.js AgingController 연동 및 렌더 루프 tick 추가"
```

---

## Task 8: CSS — 자동 노쇠화 패널 스타일

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: 노쇠화 패널 스타일 추가**

`css/style.css` 파일 맨 끝에 추가:

```css
/* ── 자동 노쇠화 패널 ── */
.aging-setting-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
}
.aging-setting-label {
  width: 65px; font-size: 12px; color: #aaa;
}
.aging-setting-row input[type=number] {
  width: 60px; background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.13); border-radius: 6px;
  color: #fff; padding: 3px 7px; font-size: 12px; outline: none; text-align: right;
}
.aging-setting-row input[type=number]:focus { border-color: #6366f1; }
.aging-setting-unit { font-size: 10px; color: #444; }

.aging-fx-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.1em; color: #555; margin: 10px 0 6px;
}
.aging-fx-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px;
}
.aging-fx-grid label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #999; cursor: pointer;
}
.aging-fx-grid label:has(input:checked) { color: #a5b4fc; }

/* 배속 버튼 (aging 전용, sim-btn과 동일 패턴) */
.aging-speed-btn {
  flex: 1; padding: 4px 0; font-size: 11px; cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 5px; color: #555;
  transition: background 0.15s, color 0.15s;
}
.aging-speed-btn.active {
  background: rgba(99,102,241,0.3);
  border-color: rgba(99,102,241,0.5);
  color: #e0e7ff; font-weight: 600;
}

/* 경과 연도 표시 */
.aging-year-display {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px; padding: 10px;
  text-align: center; margin: 10px 0 8px;
}
.aging-year-label {
  font-size: 10px; color: #555; text-transform: uppercase;
  letter-spacing: 0.08em; margin-bottom: 4px;
}
.aging-year-value {
  font-size: 22px; font-weight: 700; color: #7ee8a2; letter-spacing: 0.5px;
}
.aging-year-sep { font-size: 14px; color: #555; }
.aging-year-unit { font-size: 13px; color: #666; }

/* 재생 중 버튼 상태 (aging 탭) */
#aging-play-btn {
  flex: 2; padding: 7px;
  background: rgba(99,102,241,0.2);
  border: 1px solid rgba(99,102,241,0.4);
  border-radius: 7px; color: #a5b4fc; font-size: 12px; cursor: pointer;
  transition: background 0.15s;
}
#aging-play-btn:hover { background: rgba(99,102,241,0.35); }
#aging-play-btn.playing {
  background: rgba(74,222,128,0.2);
  border-color: rgba(74,222,128,0.4);
  color: #7ee8a2;
}
#aging-reset-btn {
  flex: 1; padding: 7px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px; color: #666; font-size: 12px; cursor: pointer;
  transition: background 0.15s;
}
#aging-reset-btn:hover { background: rgba(255,255,255,0.1); color: #999; }

/* 진행 바 (aging 전용 — sim-progress-wrap 재사용) */
#aging-progress-bar {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, #7ee8a2, #f0a04b);
  border-radius: 3px; transition: width 0.1s linear;
}
```

- [ ] **Step 2: 브라우저에서 스타일 확인**

브라우저 새로고침 후 "자동 노쇠화" 탭 클릭:
- 설정 입력 필드가 깔끔하게 정렬됨
- 경과 연도가 초록색 큰 숫자로 표시됨
- 재생 버튼 클릭 시 `playing` 클래스가 토글되며 색상 변경됨
- 진행 바가 그라디언트로 채워짐

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: 자동 노쇠화 패널 CSS 스타일 추가"
```

---

## Task 9: 전체 테스트 실행 및 최종 검증

- [ ] **Step 1: 전체 단위 테스트 실행**

```bash
npx vitest run --reporter=verbose
```

Expected output:
```
✓ tests/AgingController.test.js (18)
  ✓ AgingController.computeYear (5)
  ✓ AgingController tick (4)
  ✓ AgingController enabledEffects (2)
  ✓ AgingController speed (1)
  ✓ AgingController reset (3)
  ✓ AgingController complete (2)

Test Files  1 passed (1)
Tests       18 passed (18)
```

- [ ] **Step 2: 브라우저 E2E 시나리오 검증**

브라우저에서 GLB 모델 로드 후 순서대로 확인:

1. **기본 동작**: "자동 노쇠화" 탭 클릭 → 패널 표시, 다른 패널 숨겨짐
2. **재생**: 총 연도 100 / 재생 시간 30초 설정 → ▶ 재생 → 경과 연도 증가, 건물 노쇠화 진행
3. **효과 선택**: 균열 체크 해제 후 재생 → 균열 없이 나머지만 진행
4. **배속**: 2x 선택 후 재생 → 15초 만에 완료
5. **완료 상태**: "✓ 완료" 표시, 재클릭 시 처음부터 재생
6. **리셋**: ↺ 리셋 → 경과 연도 0, 건물 원상태
7. **탭 전환**: 시뮬레이션 탭으로 이동 시 노쇠화 일시정지
8. **전체 초기화**: 전체 초기화 버튼 → 노쇠화 포함 모두 리셋

- [ ] **Step 3: 최종 커밋**

```bash
git add .
git commit -m "feat: 자동 노쇠화 애니메이션 기능 완성"
```
