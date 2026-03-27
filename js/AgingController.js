// AgingController.js - 노화 시뮬레이션 제어 모듈
export class AgingController {
  static computeYear(elapsed, durationSeconds, totalYears) {
    if (durationSeconds <= 0) return 0;
    return Math.min(elapsed / durationSeconds, 1) * totalYears;
  }
}
