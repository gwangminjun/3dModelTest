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
