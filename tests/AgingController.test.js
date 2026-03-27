import { describe, it, expect, beforeEach, vi } from 'vitest';
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
