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
