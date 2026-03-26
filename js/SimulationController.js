export class SimulationController {
  constructor(deformManager) {
    this.dm          = deformManager;
    this.elapsed     = 0;
    this.duration    = 30;
    this.playing     = false;
    this.completed   = false;
    this.weatherType = 'none';
    this.intensity   = 0.5;

    this._playBtn     = document.getElementById('sim-play-btn');
    this._resetBtn    = document.getElementById('sim-reset-btn');
    this._durInput    = document.getElementById('sim-duration');
    this._progressBar = document.getElementById('sim-progress-bar');
    this._timeCur     = document.getElementById('sim-time-cur');
    this._timeTotal   = document.getElementById('sim-time-total');

    this._bindUI();
  }

  _bindUI() {
    this._playBtn.addEventListener('click', () => {
      if (this.completed) { this.reset(); return; }
      if (this.elapsed >= this.duration) this.elapsed = 0;
      this.playing = !this.playing;
      this._playBtn.textContent = this.playing ? '⏸ 일시정지' : '▶ 재생';
      this._playBtn.classList.toggle('playing', this.playing);
    });

    this._resetBtn.addEventListener('click', () => this.reset());

    this._durInput.addEventListener('change', () => {
      this.duration = Math.max(1, parseInt(this._durInput.value) || 30);
      this._durInput.value = this.duration;
      this._updateUI();
    });
  }

  getTargets() {
    return {
      crack:    Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-crack-target').value)    || 0)),
      collapse: Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-collapse-target').value) || 0)),
      sink:     Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-sink-target').value)     || 0)),
      age:      Math.min(1000, Math.max(0, parseFloat(document.getElementById('sim-age-target').value)      || 0)),
    };
  }

  setProgress(p) {
    const e   = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
    const tgt = this.getTargets();
    this.dm.uCrack.value    = tgt.crack    * e;
    this.dm.uCollapse.value = tgt.collapse * e;
    this.dm.uSink.value     = tgt.sink     * e;
    this.dm.applyAge(tgt.age * e);
    this.dm.uShake.value = this.weatherType === 'quake' ? this.intensity * e : 0;

    document.getElementById('crack-val').value    = Math.round(this.dm.uCrack.value);
    document.getElementById('collapse-val').value = Math.round(this.dm.uCollapse.value);
    document.getElementById('sink-val').value     = Math.round(this.dm.uSink.value);
    document.getElementById('age-val').value      = Math.round(this.dm.age);
  }

  _updateUI() {
    const p = this.duration > 0 ? Math.min(this.elapsed / this.duration, 1) : 0;
    this._progressBar.style.width  = (p * 100).toFixed(1) + '%';
    this._timeCur.textContent   = Math.floor(this.elapsed);
    this._timeTotal.textContent = this.duration;
  }

  reset() {
    this.elapsed = 0; this.playing = false; this.completed = false;
    this._playBtn.textContent = '▶ 재생';
    this._playBtn.classList.remove('playing');
    this.setProgress(0);
    this._updateUI();
  }

  pause() {
    if (this.playing) {
      this.playing = false;
      this._playBtn.textContent = '▶ 재생';
      this._playBtn.classList.remove('playing');
    }
  }

  tick(dt) {
    if (!this.playing) return;
    this.elapsed = Math.min(this.elapsed + dt, this.duration);
    this.setProgress(this.elapsed / this.duration);
    this._updateUI();
    if (this.elapsed >= this.duration) {
      this.playing   = false;
      this.completed = true;
      this._playBtn.textContent = '✓ 완료';
      this._playBtn.classList.remove('playing');
    }
  }
}
