import * as THREE from 'three';

export class UIController {
  constructor({ deformManager, simController, weatherController, modelLoader }) {
    this.dm  = deformManager;
    this.sim = simController;
    this.wc  = weatherController;
    this.ml  = modelLoader;

    this._crackChk    = document.getElementById('crack-chk');
    this._collapseChk = document.getElementById('collapse-chk');
    this._sinkChk     = document.getElementById('sink-chk');
    this._ageChk      = document.getElementById('age-chk');
    this._crackInput   = document.getElementById('crack-val');
    this._collapseInput = document.getElementById('collapse-val');
    this._sinkInput    = document.getElementById('sink-val');
    this._ageInput     = document.getElementById('age-val');
    this._crackAuto    = document.getElementById('crack-auto');
    this._collapseAuto = document.getElementById('collapse-auto');
    this._sinkAuto     = document.getElementById('sink-auto');
    this._ageAuto      = document.getElementById('age-auto');
    this._intensitySlider = document.getElementById('intensity');

    this._AGE_RATE = { none: 0, rain: 3, wind: 4, quake: 7 };

    this._bindWeather();
    this._bindManual();
    this._bindTabs();
    this._bindReset();
  }

  _bindWeather() {
    document.querySelectorAll('input[name="weather"]').forEach(r =>
      r.addEventListener('change', e => {
        this.wc.weatherType  = e.target.value;
        this.sim.weatherType = e.target.value;
      })
    );
    this._intensitySlider.addEventListener('input', e => {
      const v = e.target.value / 100;
      this.wc.intensity  = v;
      this.sim.intensity = v;
      document.getElementById('intensity-val').textContent = e.target.value;
    });
  }

  _bindManual() {
    this._setupManualInput(
      this._crackChk, this._crackInput, this._crackAuto,
      () => this.dm.uCrack.value / 100,
      v  => { this.dm.uCrack.value = v * 100; }
    );
    this._setupManualInput(
      this._collapseChk, this._collapseInput, this._collapseAuto,
      () => this.dm.uCollapse.value / 100,
      v  => { this.dm.uCollapse.value = v * 100; }
    );
    this._setupManualInput(
      this._sinkChk, this._sinkInput, this._sinkAuto,
      () => this.dm.uSink.value / 100,
      v  => { this.dm.uSink.value = v * 100; }
    );

    this._ageChk.addEventListener('change', () => {
      const manual = this._ageChk.checked;
      this._ageInput.disabled = !manual;
      this._ageAuto.style.display = manual ? 'none' : 'inline';
      if (manual) this._ageInput.value = Math.round(this.dm.age);
    });
    this._ageInput.addEventListener('input', () => {
      if (this._ageChk.checked) {
        this.dm.applyAge(Math.max(0, Math.min(1000, parseFloat(this._ageInput.value) || 0)));
      }
    });
  }

  _setupManualInput(chk, input, autoBadge, getVal, setVal) {
    chk.addEventListener('change', () => {
      const manual = chk.checked;
      input.disabled = !manual;
      autoBadge.style.display = manual ? 'none' : 'inline';
      if (manual) input.value = Math.round(getVal() * 100);
    });
    input.addEventListener('input', () => {
      if (chk.checked) setVal((parseFloat(input.value) || 0) / 100);
    });
  }

  _bindTabs() {
    document.getElementById('tab-manual').addEventListener('click', () => {
      document.getElementById('tab-manual').classList.add('active');
      document.getElementById('tab-sim').classList.remove('active');
      document.getElementById('panel-manual').style.display = '';
      document.getElementById('panel-sim').style.display    = 'none';
      this.sim.pause();
    });
    document.getElementById('tab-sim').addEventListener('click', () => {
      document.getElementById('tab-sim').classList.add('active');
      document.getElementById('tab-manual').classList.remove('active');
      document.getElementById('panel-sim').style.display    = '';
      document.getElementById('panel-manual').style.display = 'none';
    });
  }

  _bindReset() {
    document.getElementById('reset-btn').addEventListener('click', () => {
      document.querySelector('input[name="weather"][value="none"]').checked = true;
      this.wc.weatherType  = 'none';
      this.sim.weatherType = 'none';
      this._intensitySlider.value = 50;
      this.wc.intensity  = 0.5;
      this.sim.intensity = 0.5;
      document.getElementById('intensity-val').textContent = '50';

      [
        [this._crackChk,    this._crackInput,    this._crackAuto],
        [this._collapseChk, this._collapseInput, this._collapseAuto],
        [this._sinkChk,     this._sinkInput,     this._sinkAuto],
        [this._ageChk,      this._ageInput,      this._ageAuto],
      ].forEach(([chk, inp, aut]) => {
        chk.checked = false; inp.disabled = true; inp.value = 0; aut.style.display = 'none';
      });

      this.dm.reset();
      this.sim.reset();
      this.ml.resetCamera();
    });
  }

  // animate 루프에서 매 프레임 호출 — 자동 lerp 및 노화 누적
  tickAutoDeform(dt) {
    const { weatherType, intensity } = this.wc;
    const tgt = this.wc.calcAutoTargets();

    this._autoLerp(this._crackChk,    this._crackInput,    this._crackAuto,    this.dm.uCrack,    tgt.crack,    0.020, weatherType);
    this._autoLerp(this._collapseChk, this._collapseInput, this._collapseAuto, this.dm.uCollapse, tgt.collapse, 0.015, weatherType);
    this._autoLerp(this._sinkChk,     this._sinkInput,     this._sinkAuto,     this.dm.uSink,     tgt.sink,     0.015, weatherType);

    this.dm.uShake.value = THREE.MathUtils.lerp(
      this.dm.uShake.value,
      weatherType === 'quake' ? intensity : 0,
      0.05
    );

    if (!this._ageChk.checked) {
      const rate   = (this._AGE_RATE[weatherType] || 0) * intensity;
      const newAge = Math.min(1000, this.dm.age + rate * dt);
      this.dm.applyAge(newAge);
      this._ageInput.value = Math.round(this.dm.age);
      this._ageAuto.style.display = weatherType !== 'none' ? 'inline' : 'none';
    }
  }

  _autoLerp(chk, inp, aut, uVal, target, speed, weatherType) {
    if (chk.checked) {
      uVal.value = Math.max(0, Math.min(1000, uVal.value));
    } else {
      uVal.value = THREE.MathUtils.lerp(uVal.value, target, speed);
      inp.value  = Math.round(uVal.value);
      aut.style.display = weatherType !== 'none' ? 'inline' : 'none';
    }
  }
}
