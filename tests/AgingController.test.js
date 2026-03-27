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
