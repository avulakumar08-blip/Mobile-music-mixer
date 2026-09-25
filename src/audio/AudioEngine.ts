import { createProceduralDemoTrack, createSamplerOneShot } from './soundGenerator';

export interface DeckState {
  id: 'A' | 'B';
  name: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  originalBpm: number;
  playbackRate: number; // 0.84 - 1.16
  volume: number; // 0 - 1
  eqLow: number; // -40 to +6 dB
  eqMid: number; // -40 to +6 dB
  eqHigh: number; // -40 to +6 dB
  filter: number; // -100 to +100
  loopActive: boolean;
  loopBeats: number;
  hotCues: (number | null)[];
  vuLevel: number;
}

export type CrossfaderCurve = 'smooth' | 'linear' | 'cut';

export class DJDeck {
  readonly id: 'A' | 'B';
  readonly ctx: AudioContext;
  buffer: AudioBuffer | null = null;
  name: string;
  
  // Audio Nodes
  private sourceNode: AudioBufferSourceNode | null = null;
  readonly gainNode: GainNode;
  readonly crossfaderGain: GainNode;
  readonly lowFilter: BiquadFilterNode;
  readonly midFilter: BiquadFilterNode;
  readonly highFilter: BiquadFilterNode;
  readonly dualFilterLP: BiquadFilterNode;
  readonly dualFilterHP: BiquadFilterNode;
  readonly analyserNode: AnalyserNode;

  // Playback state
  isPlaying = false;
  playbackRate = 1.0;
  bpm = 128;
  originalBpm = 128;
  volume = 0.85;
  eqLow = 0;
  eqMid = 0;
  eqHigh = 0;
  filterVal = 0; // -100 to +100

  // Track position tracking
  private playStartTime = 0;
  private pausedAt = 0;

  // Looping & Hot Cues
  loopActive = false;
  loopBeats = 4;
  private loopStart = 0;
  private loopEnd = 0;
  hotCues: (number | null)[] = [null, null, null, null];

  // Scratch state
  isScratching = false;
  private scratchOsc: OscillatorNode | null = null;
  private scratchGain: GainNode | null = null;

  constructor(id: 'A' | 'B', ctx: AudioContext, masterDeckBus: GainNode) {
    this.id = id;
    this.ctx = ctx;
    this.name = id === 'A' ? 'Cyber Electro 128' : 'Neon Synthwave 124';

    // Create Deck Processing Chain:
    // Source -> Low EQ -> Mid EQ -> High EQ -> Dual Filter LP -> Dual Filter HP -> Deck Gain -> Crossfader Gain -> Master Bus
    this.lowFilter = ctx.createBiquadFilter();
    this.lowFilter.type = 'lowshelf';
    this.lowFilter.frequency.value = 250;
    this.lowFilter.gain.value = 0;

    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1.0;
    this.midFilter.gain.value = 0;

    this.highFilter = ctx.createBiquadFilter();
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = 3500;
    this.highFilter.gain.value = 0;

    this.dualFilterLP = ctx.createBiquadFilter();
    this.dualFilterLP.type = 'lowpass';
    this.dualFilterLP.frequency.value = 20000;
    this.dualFilterLP.Q.value = 1.5;

    this.dualFilterHP = ctx.createBiquadFilter();
    this.dualFilterHP.type = 'highpass';
    this.dualFilterHP.frequency.value = 20;
    this.dualFilterHP.Q.value = 1.5;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this.volume;

    this.crossfaderGain = ctx.createGain();
    this.crossfaderGain.gain.value = 1.0;

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect node chain
    this.lowFilter.connect(this.midFilter);
    this.midFilter.connect(this.highFilter);
    this.highFilter.connect(this.dualFilterLP);
    this.dualFilterLP.connect(this.dualFilterHP);
    this.dualFilterHP.connect(this.gainNode);
    this.gainNode.connect(this.crossfaderGain);
    this.crossfaderGain.connect(masterDeckBus);

    // Tap analyser from gainNode
    this.gainNode.connect(this.analyserNode);
  }

  loadBuffer(buf: AudioBuffer, trackName: string, trackBpm?: number) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.buffer = buf;
    this.name = trackName;
    this.pausedAt = 0;
    if (trackBpm) {
      this.originalBpm = trackBpm;
      this.bpm = trackBpm;
    } else {
      // Estimate BPM based on length or standard 128
      this.originalBpm = 128;
      this.bpm = 128;
    }
    this.hotCues = [0, null, null, null];
    if (wasPlaying) {
      this.play();
    }
  }

  getCurrentTime(): number {
    if (!this.buffer) return 0;
    if (!this.isPlaying) return this.pausedAt;

    const elapsed = (this.ctx.currentTime - this.playStartTime) * this.playbackRate;
    let pos = this.pausedAt + elapsed;

    if (this.loopActive && this.loopEnd > this.loopStart) {
      const loopLen = this.loopEnd - this.loopStart;
      if (pos >= this.loopEnd) {
        pos = this.loopStart + ((pos - this.loopStart) % loopLen);
      }
    } else {
      if (pos >= this.buffer.duration) {
        pos = pos % this.buffer.duration;
      }
    }
    return Math.max(0, Math.min(pos, this.buffer.duration));
  }

  play(startOffset?: number) {
    if (!this.buffer || this.ctx.state === 'suspended') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (!this.buffer) return;
    }

    if (this.isPlaying) {
      this.stopSource();
    }

    const offset = startOffset !== undefined ? startOffset : this.pausedAt;
    const dur = this.buffer.duration;
    const cleanOffset = Math.max(0, Math.min(offset, dur - 0.05));

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.playbackRate.value = this.playbackRate;

    if (this.loopActive && this.loopEnd > this.loopStart) {
      this.sourceNode.loop = true;
      this.sourceNode.loopStart = this.loopStart;
      this.sourceNode.loopEnd = this.loopEnd;
    } else {
      this.sourceNode.loop = true; // Auto loop full track for continuous mix
      this.sourceNode.loopStart = 0;
      this.sourceNode.loopEnd = dur;
    }

    this.sourceNode.connect(this.lowFilter);
    this.sourceNode.start(0, cleanOffset);

    this.playStartTime = this.ctx.currentTime;
    this.pausedAt = cleanOffset;
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying) return;
    this.pausedAt = this.getCurrentTime();
    this.stopSource();
    this.isPlaying = false;
  }

  stop() {
    this.stopSource();
    this.isPlaying = false;
    this.pausedAt = 0;
  }

  private stopSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // ignore already stopped
      }
      this.sourceNode = null;
    }
  }

  setPlaybackRate(rate: number) {
    const clamped = Math.max(0.5, Math.min(rate, 2.0));
    this.playbackRate = clamped;
    this.bpm = Math.round(this.originalBpm * clamped);
    if (this.sourceNode) {
      this.sourceNode.playbackRate.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(vol, 1));
    this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  setEq(band: 'low' | 'mid' | 'high', val: number) {
    // val in dB: -40dB to +6dB
    const clamped = Math.max(-40, Math.min(val, 6));
    if (band === 'low') {
      this.eqLow = clamped;
      this.lowFilter.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    } else if (band === 'mid') {
      this.eqMid = clamped;
      this.midFilter.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    } else {
      this.eqHigh = clamped;
      this.highFilter.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    }
  }

  setFilter(val: number) {
    // val: -100 (LP 100Hz) to 0 (neutral bypass) to +100 (HP 10000Hz)
    this.filterVal = Math.max(-100, Math.min(val, 100));
    if (val < 0) {
      // Lowpass active: 20000 down to 100Hz
      const t = (val + 100) / 100; // 0 to 1
      const lpFreq = 100 * Math.pow(20000 / 100, t);
      this.dualFilterLP.frequency.setTargetAtTime(lpFreq, this.ctx.currentTime, 0.03);
      this.dualFilterHP.frequency.setTargetAtTime(20, this.ctx.currentTime, 0.03);
    } else if (val > 0) {
      // Highpass active: 20 up to 10000Hz
      const t = val / 100; // 0 to 1
      const hpFreq = 20 * Math.pow(10000 / 20, t);
      this.dualFilterHP.frequency.setTargetAtTime(hpFreq, this.ctx.currentTime, 0.03);
      this.dualFilterLP.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.03);
    } else {
      // Neutral
      this.dualFilterLP.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.03);
      this.dualFilterHP.frequency.setTargetAtTime(20, this.ctx.currentTime, 0.03);
    }
  }

  toggleLoop(beats = 4) {
    this.loopBeats = beats;
    if (this.loopActive) {
      this.loopActive = false;
      if (this.sourceNode && this.buffer) {
        this.sourceNode.loop = true;
        this.sourceNode.loopStart = 0;
        this.sourceNode.loopEnd = this.buffer.duration;
      }
    } else {
      if (!this.buffer) return;
      const current = this.getCurrentTime();
      const secPerBeat = 60 / this.bpm;
      const loopDuration = beats * secPerBeat;
      this.loopStart = current;
      this.loopEnd = Math.min(this.buffer.duration, current + loopDuration);
      this.loopActive = true;
      if (this.isPlaying) {
        this.play(this.loopStart);
      }
    }
  }

  setHotCue(index: number) {
    if (index < 0 || index >= 4) return;
    this.hotCues[index] = this.getCurrentTime();
  }

  jumpToHotCue(index: number) {
    if (index < 0 || index >= 4) return;
    const pos = this.hotCues[index];
    if (pos !== null && pos !== undefined) {
      this.pausedAt = pos;
      this.play(pos);
    } else {
      // Set hot cue if empty
      this.setHotCue(index);
    }
  }

  clearHotCue(index: number) {
    if (index < 0 || index >= 4) return;
    this.hotCues[index] = null;
  }

  // Authentic Vinyl Scratch Simulation
  startScratch() {
    this.isScratching = true;
    if (this.isPlaying) {
      this.pausedAt = this.getCurrentTime();
      this.stopSource();
    }
    // Create instant scratch feedback tone
    if (!this.scratchOsc) {
      this.scratchOsc = this.ctx.createOscillator();
      this.scratchGain = this.ctx.createGain();
      this.scratchGain.gain.value = 0.0;
      this.scratchOsc.type = 'sawtooth';
      this.scratchOsc.frequency.value = 400;
      this.scratchOsc.connect(this.scratchGain);
      this.scratchGain.connect(this.lowFilter);
      this.scratchOsc.start();
    }
  }

  scratchMove(deltaAngle: number, speed: number) {
    if (!this.buffer) return;
    // Scrub playback position based on vinyl rotation
    const secPerRotation = 1.8; // ~33 1/3 RPM
    const deltaSeconds = (deltaAngle / 360) * secPerRotation;
    this.pausedAt = Math.max(0, Math.min(this.buffer.duration - 0.1, this.pausedAt + deltaSeconds));

    // Audio pitch feedback based on scratch speed
    if (this.scratchOsc && this.scratchGain) {
      const absSpeed = Math.min(speed, 5);
      const targetFreq = Math.max(120, Math.min(2200, 300 + absSpeed * 450));
      this.scratchOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.015);
      this.scratchGain.gain.setTargetAtTime(Math.min(0.35, absSpeed * 0.15), this.ctx.currentTime, 0.015);
    }
  }

  endScratch(resumePlay: boolean) {
    this.isScratching = false;
    if (this.scratchGain) {
      this.scratchGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
    if (resumePlay) {
      this.play(this.pausedAt);
    }
  }

  getVuLevel(): number {
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;
    return Math.min(100, Math.round((avg / 128) * 100));
  }

  getWaveformData(): Uint8Array {
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);
    return data;
  }
}

export class AudioEngine {
  readonly ctx: AudioContext;
  readonly deckA: DJDeck;
  readonly deckB: DJDeck;

  // Master Nodes
  readonly masterBus: GainNode;
  readonly masterVolumeNode: GainNode;
  readonly masterAnalyser: AnalyserNode;

  // Master FX
  readonly delayNode: DelayNode;
  readonly delayFeedback: GainNode;
  readonly delayDryWet: GainNode;

  readonly filterFXNode: BiquadFilterNode;
  readonly reverbConvolver: ConvolverNode;
  readonly reverbDryWet: GainNode;

  // Sampler
  private samplerBuffers: Map<string, AudioBuffer> = new Map();

  // Master State
  crossfader = 0.5; // 0 = Deck A, 0.5 = Both, 1 = Deck B
  crossfaderCurve: CrossfaderCurve = 'smooth';
  masterVolume = 0.85;

  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  isRecording = false;
  recordingDuration = 0;
  private recordingInterval: any = null;
  onRecordDurationChange?: (sec: number) => void;

  constructor() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Bus
    this.masterBus = this.ctx.createGain();
    this.masterVolumeNode = this.ctx.createGain();
    this.masterVolumeNode.gain.value = this.masterVolume;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 512;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    // Master FX - Echo / Delay
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.25; // 1/4 note at 120bpm
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayDryWet = this.ctx.createGain();
    this.delayDryWet.gain.value = 0; // Off initially

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayDryWet);
    this.delayDryWet.connect(this.masterVolumeNode);

    // Master Reverb
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.buildReverbImpulse(1.8, 2.0);
    this.reverbDryWet = this.ctx.createGain();
    this.reverbDryWet.gain.value = 0; // Off initially
    this.reverbConvolver.connect(this.reverbDryWet);
    this.reverbDryWet.connect(this.masterVolumeNode);

    // Master Filter FX
    this.filterFXNode = this.ctx.createBiquadFilter();
    this.filterFXNode.type = 'allpass';

    // Route Master Bus through FX and Volume to Destination & Analyser
    this.masterBus.connect(this.masterVolumeNode);
    this.masterBus.connect(this.delayNode);
    this.masterBus.connect(this.reverbConvolver);

    this.masterVolumeNode.connect(this.ctx.destination);
    this.masterVolumeNode.connect(this.masterAnalyser);

    // Initialize Decks
    this.deckA = new DJDeck('A', this.ctx, this.masterBus);
    this.deckB = new DJDeck('B', this.ctx, this.masterBus);

    // Initialize default crossfader positions
    this.updateCrossfader(0.5);

    // Synthesize demo tracks & sampler one-shots
    this.initDefaultTracks();
    this.initSampler();
  }

  private buildReverbImpulse(duration: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      left[i] = n;
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return impulse;
  }

  private initDefaultTracks() {
    try {
      const trackA = createProceduralDemoTrack(this.ctx, 'electro', 128);
      this.deckA.loadBuffer(trackA, 'Cyber Electro (128 BPM)', 128);

      const trackB = createProceduralDemoTrack(this.ctx, 'synthwave', 124);
      this.deckB.loadBuffer(trackB, 'Neon Synthwave (124 BPM)', 124);
    } catch (e) {
      console.error('Failed to init procedural tracks:', e);
    }
  }

  private initSampler() {
    const pads = ['kick', 'snare', 'clap', 'hihat', '808', 'airhorn', 'laser', 'scratch'];
    for (const pad of pads) {
      try {
        const buf = createSamplerOneShot(this.ctx, pad);
        this.samplerBuffers.set(pad, buf);
      } catch (e) {
        console.error(`Failed to create sampler buffer for ${pad}`, e);
      }
    }
  }

  triggerSampler(pad: string) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const buf = this.samplerBuffers.get(pad);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    gain.connect(this.masterVolumeNode);
    src.start();
  }

  updateCrossfader(val: number) {
    // val: 0.0 (Deck A only) to 1.0 (Deck B only)
    this.crossfader = Math.max(0, Math.min(val, 1));
    const x = this.crossfader;

    let gainA = 1;
    let gainB = 1;

    if (this.crossfaderCurve === 'linear') {
      gainA = 1 - x;
      gainB = x;
    } else if (this.crossfaderCurve === 'smooth') {
      // Equal-power crossfade (trigonometric)
      gainA = Math.cos(x * 0.5 * Math.PI);
      gainB = Math.sin(x * 0.5 * Math.PI);
    } else if (this.crossfaderCurve === 'cut') {
      // Scratch DJ cut curve
      gainA = x > 0.95 ? 0 : 1;
      gainB = x < 0.05 ? 0 : 1;
    }

    this.deckA.crossfaderGain.gain.setTargetAtTime(gainA, this.ctx.currentTime, 0.015);
    this.deckB.crossfaderGain.gain.setTargetAtTime(gainB, this.ctx.currentTime, 0.015);
  }

  setCrossfaderCurve(curve: CrossfaderCurve) {
    this.crossfaderCurve = curve;
    this.updateCrossfader(this.crossfader);
  }

  setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(val, 1));
    this.masterVolumeNode.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
  }

  setFxReverb(active: boolean, wetAmount = 0.45) {
    const val = active ? wetAmount : 0;
    this.reverbDryWet.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  setFxDelay(active: boolean, wetAmount = 0.5, division = 0.25) {
    this.delayNode.delayTime.setTargetAtTime(division, this.ctx.currentTime, 0.05);
    const val = active ? wetAmount : 0;
    this.delayDryWet.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  syncBpm(source: 'A' | 'B') {
    if (source === 'A') {
      // Sync B to A
      const targetRate = (this.deckA.bpm / this.deckB.originalBpm);
      this.deckB.setPlaybackRate(targetRate);
    } else {
      // Sync A to B
      const targetRate = (this.deckB.bpm / this.deckA.originalBpm);
      this.deckA.setPlaybackRate(targetRate);
    }
  }

  getMasterVu(): number {
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;
    return Math.min(100, Math.round((avg / 128) * 100));
  }

  // Master Audio Recording Feature
  startRecording(): boolean {
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const streamDest = this.ctx.createMediaStreamDestination();
      this.masterVolumeNode.connect(streamDest);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(streamDest.stream, { mimeType });
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(200);
      this.isRecording = true;
      this.recordingDuration = 0;

      this.recordingInterval = setInterval(() => {
        this.recordingDuration++;
        this.onRecordDurationChange?.(this.recordingDuration);
      }, 1000);

      return true;
    } catch (err) {
      console.error('Recording not supported or failed to start:', err);
      return false;
    }
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      clearInterval(this.recordingInterval);
      this.isRecording = false;

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.recordedChunks = [];
        this.mediaRecorder = null;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  // Load custom audio file from user device into a deck
  async loadTrackFromFile(file: File, deckId: 'A' | 'B'): Promise<{ name: string; duration: number }> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    const targetDeck = deckId === 'A' ? this.deckA : this.deckB;
    targetDeck.loadBuffer(audioBuffer, file.name.replace(/\.[^/.]+$/, ''));
    return { name: file.name, duration: audioBuffer.duration };
  }
}
