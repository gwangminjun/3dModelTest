/**
 * DeformManager.js
 *
 * 3D 모델의 물리적 변형(균열, 붕괴, 침하, 흔들림)과
 * 시각적 노화(어두워짐, 디졸브) 효과를 관리하는 클래스.
 *
 * GLSL 셰이더를 런타임에 주입(onBeforeCompile)하여
 * 버텍스 변위와 프래그먼트 색상 변조를 수행한다.
 * - 버텍스 셰이더: 균열, 붕괴, 침하, 흔들림 변위 계산
 * - 프래그먼트 셰이더: 노화(rust/mold), 스크래치, 디졸브 효과
 */

export class DeformManager {
  constructor() {
    // ── 유니폼 값 초기화 (셰이더에 전달되는 파라미터) ──────────────
    this.uCrack     = { value: 0.0 }; // 균열 강도 (0 ~ 100)
    this.uCollapse  = { value: 0.0 }; // 붕괴 강도 (0 ~ 100)
    this.uSink      = { value: 0.0 }; // 침하 강도 (0 ~ 100)
    this.uShake     = { value: 0.0 }; // 흔들림 강도 (지진 효과)
    this.uTime      = { value: 0.0 }; // 경과 시간 (흔들림 애니메이션용)
    this.uModelH    = { value: 2.0 }; // 모델 높이 (정규화 기준)
    this.uModelMinY = { value: 0.0 }; // 모델 최소 Y값 (높이 비율 계산용)
    this.uDissolve  = { value: 0.0 }; // 디졸브(소멸) 강도 (0.0 ~ 1.0)
    this.uDarken    = { value: 0.0 }; // 노화 어두워짐 강도 (0.0 ~ 1.0)
    this.age           = 0;           // 현재 노화 수치 (0 ~ 1000)
    this.meshMaterials = [];          // 노화 처리를 위한 메시 머티리얼 목록
  }

  /**
   * 주어진 머티리얼에 변형/노화 셰이더를 주입한다.
   * Three.js의 onBeforeCompile 훅을 이용해 내장 셰이더를 확장한다.
   * @param {THREE.Material} mat - 변형 효과를 적용할 머티리얼
   */
  injectDeform(mat) {
    mat.onBeforeCompile = (shader) => {
      // ── 유니폼을 셰이더에 연결 ──────────────────────────────────
      shader.uniforms.uCrack     = this.uCrack;
      shader.uniforms.uCollapse  = this.uCollapse;
      shader.uniforms.uSink      = this.uSink;
      shader.uniforms.uShake     = this.uShake;
      shader.uniforms.uTime      = this.uTime;
      shader.uniforms.uModelH    = this.uModelH;
      shader.uniforms.uModelMinY = this.uModelMinY;
      shader.uniforms.uDissolve  = this.uDissolve;
      shader.uniforms.uDarken    = this.uDarken;

      // ── 버텍스 셰이더 확장 ────────────────────────────────────────
      // 유니폼 선언 및 월드 위치 varying 추가 후,
      // begin_vertex 훅에서 변위(displacement) 로직을 삽입한다.
      shader.vertexShader =
        `varying vec3 vWorldPos;
uniform float uCrack;
uniform float uCollapse;
uniform float uSink;
uniform float uShake;
uniform float uTime;
uniform float uModelH;
uniform float uModelMinY;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            // 높이 비율 계산 (0 = 바닥, 1 = 꼭대기)
            float ht = clamp((transformed.y - uModelMinY) / max(uModelH, 0.001), 0.0, 1.0);
            // 균열: 의사 난수 오프셋으로 버텍스를 미세하게 분산
            float crackAmt = uCrack * 0.0018 * uModelH;
            vec3 qp = floor(transformed * (6.0 / max(uModelH, 0.001)));
            float hx = fract(sin(dot(qp, vec3(127.1, 311.7,  74.7))) * 43758.5);
            float hy = fract(sin(dot(qp, vec3(269.5, 183.3, 246.1))) * 43758.5);
            float hz = fract(sin(dot(qp, vec3( 42.1, 526.4, 190.3))) * 43758.5);
            transformed += (vec3(hx, hy, hz) * 2.0 - 1.0) * crackAmt * (0.3 + ht * 0.7);
            // 붕괴: 상부가 한쪽으로 기울고 아래로 무너지는 효과
            float failHt    = 0.25;
            float aboveFail = max(0.0, ht - failHt) / max(1.0 - failHt, 0.001);
            float cn = uCollapse / 100.0;
            transformed.x += cn * 0.55 * aboveFail * aboveFail * uModelH;
            transformed.y -= cn * 0.22 * ht * ht * uModelH;
            transformed.z += cn * 0.07 * sin(ht * 6.28318) * uModelH;
            // 침하: 모델 전체가 아래로 가라앉는 효과
            float sn = uSink / 100.0;
            transformed.y -= sn * 0.18 * uModelH * (1.0 - ht * 0.5);
            // 흔들림: 지진 시 시간에 따른 진동 효과
            float shakeAmp = uShake * cn * 0.045 * uModelH;
            transformed.x += sin(uTime * 15.0 + ht * 4.0) * shakeAmp;
            transformed.z += cos(uTime * 13.0 + ht * 3.5) * shakeAmp * 0.6;`
        );

      // ── 프래그먼트 셰이더 확장 ────────────────────────────────────
      // FBM(Fractal Brownian Motion) 노이즈 함수를 선두에 삽입하고,
      // map_fragment: 노화(rust/mold 색), 스크래치 효과
      // clipping_planes_fragment: 디졸브 클리핑
      // tonemapping_fragment: 디졸브 경계 발광 효과
      shader.fragmentShader =
        `varying vec3 vWorldPos;
uniform float uDissolve;
uniform float uDarken;

// 해시 함수 (의사 난수 생성)
float _h(vec3 p) {
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
// 스무스 노이즈 함수
float _sn(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(_h(i),             _h(i+vec3(1,0,0)), u.x),
                 mix(_h(i+vec3(0,1,0)), _h(i+vec3(1,1,0)), u.x), u.y),
             mix(mix(_h(i+vec3(0,0,1)), _h(i+vec3(1,0,1)), u.x),
                 mix(_h(i+vec3(0,1,1)), _h(i+vec3(1,1,1)), u.x), u.y), u.z);
}
// FBM: 4 옥타브 합산으로 자연스러운 노이즈 생성
float _fbm(vec3 p) {
  return _sn(p)*0.500 + _sn(p*2.03)*0.250 + _sn(p*4.11)*0.125 + _sn(p*8.17)*0.0625;
}\n` +
        shader.fragmentShader
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
              // 노화 패턴 노이즈 샘플링
              float _ap = _fbm(vWorldPos * 2.2 + vec3(3.7, 1.2, 5.3));
              // 노화에 따라 기본 색상 어두워짐
              diffuseColor.rgb *= (1.0 - uDarken * 0.55);
              // rust(녹)와 mold(곰팡이) 색상을 FBM으로 혼합
              vec3 _agRust = vec3(0.38, 0.14, 0.02);
              vec3 _agMold = vec3(0.04, 0.18, 0.03);
              vec3 _agCol  = mix(_agRust, _agMold, _ap);
              float _agMix = clamp(uDarken * (_ap * 0.7 + 0.3) * 0.70, 0.0, 1.0);
              diffuseColor.rgb = mix(diffuseColor.rgb, _agCol, _agMix);
              // 스크래치/먼지 오버레이 (노화가 낮을 때 디졸브와 함께 약해짐)
              float _scrN = _fbm(vWorldPos * 5.5 + vec3(5.1, 3.3, 1.7));
              float _scrM = smoothstep(0.60, 0.42, _scrN) * clamp(uDarken * 3.5, 0.0, 1.0);
              _scrM *= smoothstep(0.65, 0.0, uDissolve);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.46, 0.35), _scrM * 0.65);`
          )
          .replace(
            '#include <clipping_planes_fragment>',
            `#include <clipping_planes_fragment>
              // 디졸브: FBM 노이즈 임계값 이하 픽셀 제거
              float _dn  = _fbm(vWorldPos * 1.5);
              float _thr = uDissolve;
              float _eb  = smoothstep(_thr, _thr + 0.08, _dn); // 경계 에지 부드러움
              if (_dn < _thr) discard;` // 임계값 미만 픽셀 폐기
          )
          .replace(
            '#include <tonemapping_fragment>',
            `#include <tonemapping_fragment>
              // 디졸브 경계선에 어두운 발광 효과 추가
              gl_FragColor.rgb = mix(vec3(0.04, 0.02, 0.01), gl_FragColor.rgb, _eb);`
          );
    };
    mat.needsUpdate = true; // 머티리얼 변경 사항 즉시 반영
  }

  /**
   * 노화 수치를 적용하여 어두워짐/디졸브 유니폼을 계산한다.
   * @param {number} a - 노화 수치 (0 ~ 1000)
   */
  applyAge(a) {
    this.age = a;
    const n = a / 1000; // 0 ~ 1로 정규화
    this.uDarken.value  = Math.min(1.0, n * 1.2);              // 어두워짐: 노화 수치에 비례
    this.uDissolve.value = Math.max(0, (n - 0.4) / 0.6) * 0.9; // 디졸브: 40% 이상부터 시작
  }

  /**
   * 노화 수치에 따라 메시 머티리얼의 거칠기(roughness)를 업데이트한다.
   * 노화될수록 표면이 더 거칠어진다.
   */
  updateAgeMaterials() {
    const d = this.uDarken.value;
    this.meshMaterials.forEach(({ mat, origRoughness }) => {
      mat.roughness = Math.min(1.0, origRoughness + d * 0.45); // 원래 거칠기 + 노화 보정
    });
  }

  /**
   * 모든 변형 유니폼과 노화 상태를 초기값으로 리셋한다.
   */
  reset() {
    this.uCrack.value = 0; this.uCollapse.value = 0; this.uSink.value = 0;
    this.uShake.value = 0; this.uDissolve.value = 0; this.uDarken.value = 0;
    this.age = 0;
    this.meshMaterials = []; // 머티리얼 목록 초기화
  }
}
