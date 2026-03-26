export class DeformManager {
  constructor() {
    this.uCrack     = { value: 0.0 };
    this.uCollapse  = { value: 0.0 };
    this.uSink      = { value: 0.0 };
    this.uShake     = { value: 0.0 };
    this.uTime      = { value: 0.0 };
    this.uModelH    = { value: 2.0 };
    this.uModelMinY = { value: 0.0 };
    this.uDissolve  = { value: 0.0 };
    this.uDarken    = { value: 0.0 };
    this.age           = 0;
    this.meshMaterials = [];
  }

  injectDeform(mat) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCrack     = this.uCrack;
      shader.uniforms.uCollapse  = this.uCollapse;
      shader.uniforms.uSink      = this.uSink;
      shader.uniforms.uShake     = this.uShake;
      shader.uniforms.uTime      = this.uTime;
      shader.uniforms.uModelH    = this.uModelH;
      shader.uniforms.uModelMinY = this.uModelMinY;
      shader.uniforms.uDissolve  = this.uDissolve;
      shader.uniforms.uDarken    = this.uDarken;

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
            float ht = clamp((transformed.y - uModelMinY) / max(uModelH, 0.001), 0.0, 1.0);
            float crackAmt = uCrack * 0.0018 * uModelH;
            vec3 qp = floor(transformed * (6.0 / max(uModelH, 0.001)));
            float hx = fract(sin(dot(qp, vec3(127.1, 311.7,  74.7))) * 43758.5);
            float hy = fract(sin(dot(qp, vec3(269.5, 183.3, 246.1))) * 43758.5);
            float hz = fract(sin(dot(qp, vec3( 42.1, 526.4, 190.3))) * 43758.5);
            transformed += (vec3(hx, hy, hz) * 2.0 - 1.0) * crackAmt * (0.3 + ht * 0.7);
            float failHt    = 0.25;
            float aboveFail = max(0.0, ht - failHt) / max(1.0 - failHt, 0.001);
            float cn = uCollapse / 100.0;
            transformed.x += cn * 0.55 * aboveFail * aboveFail * uModelH;
            transformed.y -= cn * 0.22 * ht * ht * uModelH;
            transformed.z += cn * 0.07 * sin(ht * 6.28318) * uModelH;
            float sn = uSink / 100.0;
            transformed.y -= sn * 0.18 * uModelH * (1.0 - ht * 0.5);
            float shakeAmp = uShake * cn * 0.045 * uModelH;
            transformed.x += sin(uTime * 15.0 + ht * 4.0) * shakeAmp;
            transformed.z += cos(uTime * 13.0 + ht * 3.5) * shakeAmp * 0.6;`
        );

      shader.fragmentShader =
        `varying vec3 vWorldPos;
uniform float uDissolve;
uniform float uDarken;

float _h(vec3 p) {
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float _sn(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(_h(i),             _h(i+vec3(1,0,0)), u.x),
                 mix(_h(i+vec3(0,1,0)), _h(i+vec3(1,1,0)), u.x), u.y),
             mix(mix(_h(i+vec3(0,0,1)), _h(i+vec3(1,0,1)), u.x),
                 mix(_h(i+vec3(0,1,1)), _h(i+vec3(1,1,1)), u.x), u.y), u.z);
}
float _fbm(vec3 p) {
  return _sn(p)*0.500 + _sn(p*2.03)*0.250 + _sn(p*4.11)*0.125 + _sn(p*8.17)*0.0625;
}\n` +
        shader.fragmentShader
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
              float _ap = _fbm(vWorldPos * 2.2 + vec3(3.7, 1.2, 5.3));
              diffuseColor.rgb *= (1.0 - uDarken * 0.55);
              vec3 _agRust = vec3(0.38, 0.14, 0.02);
              vec3 _agMold = vec3(0.04, 0.18, 0.03);
              vec3 _agCol  = mix(_agRust, _agMold, _ap);
              float _agMix = clamp(uDarken * (_ap * 0.7 + 0.3) * 0.70, 0.0, 1.0);
              diffuseColor.rgb = mix(diffuseColor.rgb, _agCol, _agMix);
              float _scrN = _fbm(vWorldPos * 5.5 + vec3(5.1, 3.3, 1.7));
              float _scrM = smoothstep(0.60, 0.42, _scrN) * clamp(uDarken * 3.5, 0.0, 1.0);
              _scrM *= smoothstep(0.65, 0.0, uDissolve);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.46, 0.35), _scrM * 0.65);`
          )
          .replace(
            '#include <clipping_planes_fragment>',
            `#include <clipping_planes_fragment>
              float _dn  = _fbm(vWorldPos * 1.5);
              float _thr = uDissolve;
              float _eb  = smoothstep(_thr, _thr + 0.08, _dn);
              if (_dn < _thr) discard;`
          )
          .replace(
            '#include <tonemapping_fragment>',
            `#include <tonemapping_fragment>
              gl_FragColor.rgb = mix(vec3(0.04, 0.02, 0.01), gl_FragColor.rgb, _eb);`
          );
    };
    mat.needsUpdate = true;
  }

  applyAge(a) {
    this.age = a;
    const n = a / 1000;
    this.uDarken.value  = Math.min(1.0, n * 1.2);
    this.uDissolve.value = Math.max(0, (n - 0.4) / 0.6) * 0.9;
  }

  updateAgeMaterials() {
    const d = this.uDarken.value;
    this.meshMaterials.forEach(({ mat, origRoughness }) => {
      mat.roughness = Math.min(1.0, origRoughness + d * 0.45);
    });
  }

  reset() {
    this.uCrack.value = 0; this.uCollapse.value = 0; this.uSink.value = 0;
    this.uShake.value = 0; this.uDissolve.value = 0; this.uDarken.value = 0;
    this.age = 0;
    this.meshMaterials = [];
  }
}
