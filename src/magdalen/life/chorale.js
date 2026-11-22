// Original wordless four-part miniature. Each entry has its own duration in
// beats followed by soprano, alto, tenor and bass pitches (MIDI). Zero = rest.
const score = [
  [2, 69, 64, 57, 50],
  [1, 71, 62, 55, 50],
  [1.5, 72, 64, 57, 53],
  [1.5, 74, 65, 57, 53],
  [2, 71, 67, 59, 52],
  [1, 69, 64, 55, 52],
  [2.75, 67, 62, 57, 50],
  [0.5, 0, 0, 0, 0],
  [1.5, 65, 60, 57, 53],
  [1, 69, 62, 57, 53],
  [2, 72, 64, 55, 48],
  [1.5, 71, 65, 59, 55],
  [1, 69, 65, 60, 53],
  [1.5, 67, 64, 57, 52],
  [2.5, 69, 62, 57, 50],
  [0.5, 0, 0, 0, 0],
  [1.5, 74, 66, 57, 50],
  [1, 76, 67, 59, 52],
  [1.5, 74, 65, 60, 53],
  [2, 72, 64, 57, 53],
  [1, 71, 62, 55, 55],
  [1, 69, 65, 57, 53],
  [2.5, 67, 64, 55, 52],
  [0.45, 0, 0, 0, 0],
  [2, 69, 62, 54, 50],
  [1, 67, 62, 55, 47],
  [1.5, 65, 60, 57, 53],
  [1.5, 64, 59, 55, 52],
  [1, 65, 60, 57, 50],
  [1, 67, 61, 55, 45],
  [3.5, 69, 62, 57, 50],
  [2.2, 0, 0, 0, 0],
];
const vowels = [
  [710, 1140, 2570],
  [520, 1430, 2450],
  [435, 920, 2500],
  [590, 1340, 2410],
];
const beat = 0.89;
const frequency = (note) => 440 * Math.pow(2, (note - 69) / 12);

function singer(context, destination, wave, part, double) {
  const osc = context.createOscillator();
  osc.setPeriodicWave(wave);
  osc.detune.value = (double ? 3.6 : -3.35) + Math.sin(part * 2.7) * 1.8;
  const lfo = context.createOscillator(),
    vibrato = context.createGain();
  lfo.frequency.value = 4.47 + part * 0.184 + double * 0.27;
  vibrato.gain.value = 5.1 + double * 1.3;
  lfo.connect(vibrato).connect(osc.detune);
  const envelope = context.createGain();
  envelope.gain.value = 0;
  const pan = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
  if (pan.pan) pan.pan.value = (part - 1.5) * 0.074 + (double - 0.5) * 0.052;
  envelope.connect(pan).connect(destination);
  const filters = [];
  const gains = [1, 0.54, 0.26];
  for (let i = 0; i < 3; i++) {
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = vowels[0][i];
    band.Q.value = [2.0, 3.05, 4.35][i];
    const blend = context.createGain();
    blend.gain.value = gains[i];
    osc.connect(band).connect(blend).connect(envelope);
    filters.push(band);
  }
  // A little unfiltered fundamental supports the lower parts at outdoor scale.
  const fundamental = context.createGain();
  fundamental.gain.value = part > 1 ? 0.19 : 0.125;
  osc.connect(fundamental).connect(envelope);
  osc.start();
  lfo.start();
  return { osc, lfo, envelope, filters, part, double };
}

export function createChoir(T, towerPosition) {
  let live = null,
    lastEvent = 0,
    request = 0;
  const tower = new T.Vector3(...towerPosition),
    onScreen = new T.Vector3(),
    direction = new T.Vector3();
  function queue(run) {
    const now = run.context.currentTime;
    if (run.cursor < now - 0.36) run.cursor = now + 0.06;
    for (let scheduled = 0; run.cursor < now + 0.53 && scheduled < 4; scheduled++) {
      const index = run.note,
        entry = score[index],
        duration = entry[0] * beat,
        t = run.cursor;
      const vowel = vowels[Math.floor(index / 3) % vowels.length];
      for (const voice of run.voices) {
        const delay = voice.part * 0.01 + voice.double * 0.019,
          at = t + delay,
          pitch = entry[voice.part + 1];
        const gain = voice.envelope.gain;
        if (!pitch) {
          gain.setTargetAtTime(0, at, 0.052);
          continue;
        }
        const f = frequency(pitch) * (1 + 0.0006 * Math.sin(index * 1.37 + voice.part));
        voice.osc.frequency.setTargetAtTime(f, at, 0.023);
        const factor = (1.07 - voice.part * 0.043) * (voice.double ? 0.995 : 1.016);
        for (let k = 0; k < 3; k++)
          voice.filters[k].frequency.setTargetAtTime(vowel[k] * factor, at, 0.091);
        const level = (0.136 + 0.025 * Math.sin(index * 0.63 + voice.part)) * (voice.double ? 0.81 : 1);
        const attack = Math.min(0.22, duration * 0.21),
          release = Math.min(0.22, duration * 0.2);
        gain.setValueAtTime(0.0011, at);
        gain.linearRampToValueAtTime(level, at + attack);
        gain.linearRampToValueAtTime(level * 0.79, at + duration - release);
        gain.exponentialRampToValueAtTime(0.0011, at + duration - 0.011);
      }
      run.cursor += duration;
      run.note = (index + 1) % score.length;
    }
  }
  async function start() {
    if (live) return live.context.state === 'running';
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return false;
    const generation = ++request;
    let context;
    try {
      context = new Audio({ latencyHint: 'interactive' });
      if (context.state === 'suspended') await context.resume();
      if (generation !== request) {
        void context.close();
        return false;
      }
      const source = context.createGain(),
        dry = context.createGain();
      dry.gain.value = 0.94;
      const spatial = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
      const master = context.createGain();
      master.gain.value = 0.0001;
      source.connect(dry).connect(spatial);
      for (const [seconds, amount] of [
        [0.073, 0.118],
        [0.151, 0.054],
      ]) {
        const delay = context.createDelay(0.4),
          shade = context.createBiquadFilter(),
          send = context.createGain();
        delay.delayTime.value = seconds;
        shade.type = 'lowpass';
        shade.frequency.value = 1700;
        send.gain.value = amount;
        source.connect(delay).connect(shade).connect(send).connect(spatial);
      }
      spatial.connect(master).connect(context.destination);
      const real = new Float32Array(43),
        imag = new Float32Array(43);
      for (let h = 1; h < imag.length; h++)
        imag[h] = ((Math.sin(h * 1.01) * 0.12 + 0.88) / Math.pow(h, 1.1)) * Math.exp(-h / 49);
      const wave = context.createPeriodicWave(real, imag),
        voices = [];
      for (let part = 0; part < 4; part++)
        for (let double = 0; double < 2; double++) voices.push(singer(context, source, wave, part, double));
      const run = {
        context,
        master,
        spatial,
        voices,
        note: 0,
        cursor: context.currentTime + 0.075,
        timer: 0,
      };
      // Muting/unmuting the sound leaves the festival clock in charge of the score.
      const length = score.reduce((sum, row) => sum + row[0] * beat, 0);
      let elapsed = lastEvent % length;
      while (run.note < score.length - 1 && elapsed > score[run.note][0] * beat) {
        elapsed -= score[run.note][0] * beat;
        run.note++;
      }
      live = run;
      queue(run);
      run.timer = setInterval(() => {
        if (live === run) queue(run);
      }, 125);
      master.gain.linearRampToValueAtTime(0.61, context.currentTime + 0.48);
      return true;
    } catch {
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      return false;
    }
  }
  function stop() {
    request++;
    const run = live;
    live = null;
    if (!run) return;
    clearInterval(run.timer);
    const now = run.context.currentTime;
    run.master.gain.cancelScheduledValues(now);
    run.master.gain.setTargetAtTime(0.00001, now, 0.033);
    for (const v of run.voices) {
      v.osc.stop(now + 0.17);
      v.lfo.stop(now + 0.17);
    }
    setTimeout(() => {
      if (run.context.state !== 'closed') void run.context.close().catch(() => {});
    }, 230);
  }
  function update(sim) {
    lastEvent = sim.eventTime || 0;
    if (!live || !sim.camera) return;
    const cam = sim.camera,
      now = live.context.currentTime;
    onScreen.copy(tower).project(cam);
    if (live.spatial.pan && Number.isFinite(onScreen.x))
      live.spatial.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, onScreen.x * 0.69)), now, 0.13);
    cam.getWorldDirection(direction);
    const along = Math.abs(direction.y) > 0.001 ? (tower.y - cam.position.y) / direction.y : 0;
    const dist = Math.hypot(
      tower.x - cam.position.x - direction.x * along,
      tower.z - cam.position.z - direction.z * along,
    );
    const volume = (0.35 + 0.43 / (1 + dist / 90)) * Math.max(0.12, Math.min(1, sim.event || 0));
    live.master.gain.setTargetAtTime(volume, now, 0.28);
  }
  return { start, stop, update, status: () => live?.context.state || 'muted' };
}
