/**
 * Procedural Audio Synthesizer for GrooveDeck DJ
 * Generates studio-grade multi-track loops and DJ FX samples using Web Audio buffers.
 * Zero external latency, works completely offline, 100% royalty-free.
 */

export function createProceduralDemoTrack(
  ctx: AudioContext,
  style: 'electro' | 'synthwave',
  bpm: number
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const beats = 32; // 8 bars of 4/4
  const secondsPerBeat = 60 / bpm;
  const totalDuration = beats * secondsPerBeat;
  const numSamples = Math.floor(sampleRate * totalDuration);

  const buffer = ctx.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Helper for white noise
  const noise = () => Math.random() * 2 - 1;

  // Track generator based on style
  if (style === 'electro') {
    // 128 BPM Electro House / Club Groove in D minor (D, F, G, A)
    const rootFreq = 73.42; // D2
    const scale = [rootFreq, rootFreq * 1.189, rootFreq * 1.335, rootFreq * 1.498]; // D, F, G, A

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / secondsPerBeat) % beats;
      const beatFraction = beat % 1;
      const bar = Math.floor(beat / 4);

      let sampleL = 0;
      let sampleR = 0;

      // 1. Four-on-the-floor Kick Drum
      const kickT = beatFraction * secondsPerBeat;
      if (kickT < 0.35) {
        const kickPitch = Math.max(45, 160 * Math.exp(-kickT * 32));
        const kickBody = Math.sin(2 * Math.PI * kickPitch * kickT);
        const kickEnv = Math.exp(-kickT * 12);
        const kickClick = kickT < 0.005 ? Math.random() * 0.4 : 0;
        const kick = (kickBody + kickClick) * kickEnv * 0.9;
        sampleL += kick;
        sampleR += kick;
      }

      // 2. Offbeat Open Hi-Hat (hits at beatFraction = 0.5)
      const hatBeat = (beat + 0.5) % 1;
      const hatT = hatBeat * secondsPerBeat;
      if (hatT < 0.18) {
        const hatEnv = Math.exp(-hatT * 22);
        const hat = noise() * hatEnv * 0.28;
        // Panned slightly right
        sampleL += hat * 0.8;
        sampleR += hat * 1.1;
      }

      // 3. 16th-note Shaker / Closed Hat
      const sixteenth = (beat * 4) % 1;
      const shakerT = sixteenth * (secondsPerBeat / 4);
      if (shakerT < 0.05) {
        const shaker = noise() * Math.exp(-shakerT * 60) * 0.12;
        sampleL += shaker;
        sampleR += shaker * 0.7;
      }

      // 4. Snare / Clap on beats 2 and 4 (beat % 2 == 1)
      const isSnareBeat = Math.floor(beat) % 2 === 1;
      if (isSnareBeat && beatFraction * secondsPerBeat < 0.25) {
        const sT = beatFraction * secondsPerBeat;
        const snareTone = Math.sin(2 * Math.PI * 185 * sT) * Math.exp(-sT * 18);
        const snareNoise = noise() * Math.exp(-sT * 14);
        const snare = (snareTone * 0.4 + snareNoise * 0.6) * 0.6;
        sampleL += snare * 0.95;
        sampleR += snare * 0.95;
      }

      // 5. Funky Acid / Electro Bassline (8th notes syncopated)
      const eighth = Math.floor(beat * 2) % 8;
      const eighthT = (beat * 2 % 1) * (secondsPerBeat / 2);
      const noteIndex = [0, 0, 2, 0, 1, 3, 2, 1][eighth];
      const noteFreq = scale[noteIndex];
      if (eighthT < 0.22) {
        const bassEnv = Math.exp(-eighthT * 10);
        // Sawtooth-like wave with cutoff filter modulation
        const bassCutoff = 800 + 1200 * Math.exp(-eighthT * 16);
        const osc1 = Math.sin(2 * Math.PI * noteFreq * t);
        const osc2 = Math.sin(2 * Math.PI * (noteFreq * 2.01) * t) * 0.5;
        const sub = Math.sin(2 * Math.PI * (noteFreq * 0.5) * t) * 0.7;
        const dist = Math.tanh((osc1 + osc2 + sub) * 1.4);
        const bass = dist * bassEnv * 0.5;
        sampleL += bass;
        sampleR += bass;
      }

      // 6. Melodic Lead Arp (16th notes with chorus)
      const step16 = Math.floor(beat * 4) % 16;
      const arpFreqs = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 587.33, 523.25]; // D4, F4, A4, C5...
      const currentArpFreq = arpFreqs[step16 % arpFreqs.length];
      const stepT = (beat * 4 % 1) * (secondsPerBeat / 4);
      if (stepT < 0.12 && bar >= 2) {
        const leadEnv = Math.exp(-stepT * 14);
        const leadL = Math.sin(2 * Math.PI * currentArpFreq * t) * leadEnv * 0.25;
        const leadR = Math.sin(2 * Math.PI * (currentArpFreq * 1.006) * t) * leadEnv * 0.25;
        sampleL += leadL;
        sampleR += leadR;
      }

      // 7. Riser Effect on 8th bar
      if (bar === 7) {
        const barProgress = (beat % 4) / 4;
        const riserFreq = 120 + 2000 * Math.pow(barProgress, 2);
        const riserNoise = noise() * barProgress * 0.15;
        const riserTone = Math.sin(2 * Math.PI * riserFreq * t) * barProgress * 0.2;
        sampleL += (riserTone + riserNoise);
        sampleR += (riserTone + riserNoise);
      }

      // Soft limiting
      left[i] = Math.tanh(sampleL * 0.85);
      right[i] = Math.tanh(sampleR * 0.85);
    }
  } else {
    // 124 BPM Synthwave / Retrowave in A minor (A, C, D, E, G)
    const rootFreq = 55.0; // A1
    const chordNotes = [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [196.0, 246.94, 293.66], // G
      [164.81, 207.65, 246.94], // E
    ];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / secondsPerBeat) % beats;
      const beatFraction = beat % 1;
      const bar = Math.floor(beat / 4);
      const chordIndex = Math.floor(bar / 2) % 4;
      const currentChord = chordNotes[chordIndex];

      let sampleL = 0;
      let sampleR = 0;

      // 1. Heavy Gated 80s Kick on beats 1 and 3
      const isKickBeat = Math.floor(beat) % 2 === 0;
      if (isKickBeat && beatFraction * secondsPerBeat < 0.4) {
        const kT = beatFraction * secondsPerBeat;
        const kPitch = Math.max(48, 140 * Math.exp(-kT * 24));
        const kick = Math.sin(2 * Math.PI * kPitch * kT) * Math.exp(-kT * 10) * 0.95;
        sampleL += kick;
        sampleR += kick;
      }

      // 2. Huge Gated Reverb Snare on beats 2 and 4
      const isSnareBeat = Math.floor(beat) % 2 === 1;
      if (isSnareBeat && beatFraction * secondsPerBeat < 0.38) {
        const sT = beatFraction * secondsPerBeat;
        const sTone = Math.sin(2 * Math.PI * 196 * sT) * Math.exp(-sT * 15);
        const sNoise = noise() * Math.exp(-sT * 9);
        const snare = (sTone * 0.35 + sNoise * 0.65) * 0.7;
        sampleL += snare * 0.9;
        sampleR += snare * 1.1;
      }

      // 3. Running 16th-note Hi-hats with accent
      const step16 = Math.floor(beat * 4) % 16;
      const stepT = (beat * 4 % 1) * (secondsPerBeat / 4);
      if (stepT < 0.08) {
        const accent = (step16 % 4 === 2) ? 1.5 : 0.8;
        const hat = noise() * Math.exp(-stepT * 40) * 0.18 * accent;
        sampleL += hat * 0.85;
        sampleR += hat;
      }

      // 4. Rolling 16th-note Synthwave Bass (A minor)
      const bass16 = (beat * 4 % 1) * (secondsPerBeat / 4);
      if (bass16 < 0.16) {
        const bassEnv = Math.exp(-bass16 * 14);
        const bassFreq = rootFreq * (chordIndex === 1 ? 1.334 : chordIndex === 2 ? 1.498 : 1);
        const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.6 +
                     Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.3 +
                     Math.sin(2 * Math.PI * bassFreq * 3 * t) * 0.15;
        const warmBass = Math.tanh(bass * 1.5) * bassEnv * 0.45;
        sampleL += warmBass;
        sampleR += warmBass;
      }

      // 5. Lush Analog Poly-Synth Chords (warm stereo detuned pads)
      const chordEnv = 0.5 + 0.3 * Math.sin(2 * Math.PI * (t / (secondsPerBeat * 4)));
      let chordSumL = 0;
      let chordSumR = 0;
      for (let note of currentChord) {
        chordSumL += Math.sin(2 * Math.PI * note * t) * 0.08;
        chordSumR += Math.sin(2 * Math.PI * (note * 1.004) * t) * 0.08;
      }
      sampleL += chordSumL * chordEnv;
      sampleR += chordSumR * chordEnv;

      // 6. Cyber Pluck Melody (on odd bars)
      if (bar % 2 === 1) {
        const pluckNotes = [440, 523.25, 659.25, 783.99]; // A4, C5, E5, G5
        const pluckStep = Math.floor(beat * 2) % 4;
        const pT = (beat * 2 % 1) * (secondsPerBeat / 2);
        if (pT < 0.18) {
          const pluck = Math.sin(2 * Math.PI * pluckNotes[pluckStep] * t) * Math.exp(-pT * 12) * 0.22;
          sampleL += pluck * 1.1;
          sampleR += pluck * 0.8;
        }
      }

      left[i] = Math.tanh(sampleL * 0.82);
      right[i] = Math.tanh(sampleR * 0.82);
    }
  }

  return buffer;
}

/**
 * Generate DJ Sampler One-Shot sound buffers
 */
export function createSamplerOneShot(ctx: AudioContext, type: string): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  let duration = 0.5;
  if (type === 'airhorn') duration = 1.2;
  if (type === 'scratch') duration = 0.6;
  if (type === 'laser') duration = 0.5;
  if (type === '808') duration = 1.0;

  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const noise = () => Math.random() * 2 - 1;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sL = 0;
    let sR = 0;

    switch (type) {
      case 'kick': {
        const pitch = Math.max(40, 180 * Math.exp(-t * 28));
        const body = Math.sin(2 * Math.PI * pitch * t);
        const click = t < 0.005 ? (Math.random() * 0.5) : 0;
        sL = sR = (body + click) * Math.exp(-t * 10);
        break;
      }
      case 'snare': {
        const tone = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 18);
        const snNoise = noise() * Math.exp(-t * 12);
        sL = sR = (tone * 0.4 + snNoise * 0.6);
        break;
      }
      case 'clap': {
        let clapBurst = 0;
        if (t < 0.015) clapBurst = noise() * 0.8;
        else if (t < 0.03) clapBurst = noise() * 0.7;
        else if (t < 0.045) clapBurst = noise() * 0.6;
        else clapBurst = noise() * Math.exp(-(t - 0.045) * 16);
        sL = sR = clapBurst * 0.9;
        break;
      }
      case 'hihat': {
        sL = sR = noise() * Math.exp(-t * 45) * 0.6;
        break;
      }
      case '808': {
        const pitch = 50 * Math.exp(-t * 1.5);
        const sub = Math.sin(2 * Math.PI * pitch * t);
        const sat = Math.tanh(sub * 2.2) * Math.exp(-t * 3.5);
        sL = sR = sat * 0.9;
        break;
      }
      case 'airhorn': {
        // Reggae triple pulse airhorn
        const pulse = t % 0.35;
        if (pulse < 0.28) {
          const horn1 = Math.sin(2 * Math.PI * 466.16 * t); // Bb4
          const horn2 = Math.sin(2 * Math.PI * 587.33 * t); // D5
          const horn3 = Math.sin(2 * Math.PI * 700.0 * t);
          const raw = (horn1 + horn2 * 0.8 + horn3 * 0.6) / 2.4;
          const dist = Math.tanh(raw * 3.5) * 0.85;
          sL = dist;
          sR = dist * 0.95;
        }
        break;
      }
      case 'laser': {
        const laserFreq = 2400 * Math.exp(-t * 12);
        const tone = Math.sin(2 * Math.PI * laserFreq * t);
        sL = sR = tone * Math.exp(-t * 8) * 0.75;
        break;
      }
      case 'scratch': {
        // Authentic vinyl backspin / baby scratch waveform
        const speed = Math.sin(t * 18 * Math.PI) * Math.exp(-t * 4);
        const carrier = Math.sin(2 * Math.PI * 800 * speed * t);
        const grain = noise() * Math.abs(speed) * 0.4;
        sL = sR = (carrier * 0.7 + grain) * Math.exp(-t * 5) * 0.8;
        break;
      }
      default:
        sL = sR = 0;
    }

    left[i] = Math.tanh(sL);
    right[i] = Math.tanh(sR);
  }

  return buffer;
}
