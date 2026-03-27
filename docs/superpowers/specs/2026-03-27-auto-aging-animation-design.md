# 자동 노쇠화 애니메이션 기능 설계

**날짜:** 2026-03-27
**상태:** 승인됨

---

## 개요

시간의 흐름에 따라 건물이 자동으로 노쇠화되는 독립적인 애니메이션 모드를 추가한다. 기존 키프레임 기반 시뮬레이션과 별개로, "총 몇 년 / 몇 초에 재생"이라는 단순 설정만으로 건물의 균열·붕괴·침하·노화 효과가 시간에 비례해 자동 증가한다.

---

## 아키텍처

### 새 클래스: `AgingController`

`js/AgingController.js`로 분리된 독립 모듈. `DeformManager`에만 의존하며 다른 모듈과 결합도가 낮다.

**속성:**

| 속성 | 기본값 | 설명 |
|------|--------|------|
| `totalYears` | 100 | 전체 노쇠화 기간 (년) |
| `durationSeconds` | 30 | 실제 재생 시간 (초) |
| `enabledEffects` | `{crack, collapse, sink, age: true}` | 자동 진행할 효과 선택 |
| `elapsed` | 0 | 경과 재생 시간 (초) |
| `speed` | 1.0 | 재생 배속 (0.5 / 1 / 2 / 4x) |
| `playing` | false | 재생 중 여부 |
| `completed` | false | 재생 완료 여부 |

**핵심 메서드:**

- `tick(dt)`: 매 프레임 호출. `elapsed += dt × speed` → `currentYear = (elapsed / durationSeconds) × totalYears` → `t = currentYear / totalYears` (0~1) → 활성화된 효과에 `t × 1000` 값 주입
- `reset()`: elapsed = 0, 모든 효과 초기화
- `pause()`: playing = false

**효과 매핑:**
모든 활성 효과는 `t × 1000`으로 선형 증가 (0년 = 0, totalYears = 1000). `DeformManager.applyAge()`와 `uCrack`, `uCollapse`, `uSink` 유니폼에 직접 주입.

---

## UI 설계

### 탭 추가

기존 `수동 변형` / `시뮬레이션` 탭에 세 번째 `자동 노쇠화` 탭 추가.

### 패널 구성 (위→아래)

1. **설정 섹션**
   - 총 연도 입력 (숫자, 기본 100년)
   - 재생 시간 입력 (숫자, 기본 30초)

2. **효과 선택 섹션**
   균열 / 붕괴 / 침하 / 노화 — 2×2 체크박스 그리드, 기본 전체 선택

3. **배속 버튼**
   0.5x / 1x / 2x / 4x (기존 시뮬레이션 탭과 동일한 UI 패턴)

4. **경과 연도 표시**
   큰 숫자로 `37 / 100년` 형태 표시, 녹색 강조

5. **진행 바**
   그라디언트 (녹색 → 주황) 바

6. **재생 컨트롤**
   재생/일시정지 버튼 + 리셋 버튼

---

## 변경 파일

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `js/AgingController.js` | 신규 | AgingController 클래스 전체 |
| `index.html` | 수정 | 탭 버튼 1개 + 패널 HTML 추가 |
| `js/main.js` | 수정 | import, 인스턴스 생성, tick 호출 |
| `js/UIController.js` | 수정 | 탭 전환 로직에 자동 노쇠화 탭 추가 |
| `css/style.css` | 수정 | 경과 연도 표시 스타일, 패널 스타일 |

---

## 렌더 루프 연동

`main.js`의 애니메이션 루프에서:

```js
agingCtrl.tick(dt);
```

기존 `simController.tick(dt)` 이후 호출. `simController`가 재생 중이면 `AgingController`는 tick하지 않는다 (두 모드가 동시에 실행되지 않도록).

조건:
```js
if (!simController.playing && !simController.completed) {
  agingCtrl.tick(dt);
}
```

---

## 테스트 시나리오

1. 총 연도 100 / 재생 30초 설정 → 재생 → 30초 후 모든 효과가 1000에 도달해야 함
2. 효과 체크박스 일부만 선택 → 선택한 효과만 증가, 나머지는 0 유지
3. 배속 2x → 15초 만에 완료
4. 시뮬레이션 탭 재생 중 → 자동 노쇠화 tick 호출되지 않음
5. 리셋 → 모든 효과 0, 경과 연도 0으로 복귀
6. 재생 완료 후 재생 버튼 클릭 → 처음부터 다시 재생
