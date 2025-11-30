import { Flavor } from '../types';

// Simple synth for sound effects using Web Audio API
// This avoids needing external assets and keeps the app self-contained

let audioCtx: AudioContext | null = null;
let sfxVolume = 0.5;
let musicVolume = 0.3;
let musicPlaying = false;
let nextNoteTime = 0.0;
let timerID: number | null = null;
let currentNote = 0;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

// Simple upbeat melody (Frequency, Duration in 16th notes)
const melody = [
  { f: 523.25, d: 2 }, { f: 659.25, d: 2 }, { f: 783.99, d: 2 }, { f: 880.00, d: 2 }, // C E G A
  { f: 1046.50, d: 4 }, { f: 783.99, d: 4 }, // C5 G
  { f: 698.46, d: 2 }, { f: 659.25, d: 2 }, { f: 587.33, d: 2 }, { f: 523.25, d: 2 }, // F E D C
  { f: 392.00, d: 8 } // G3
];

const bassLine = [
  { f: 261.63, d: 4 }, { f: 392.00, d: 4 }, // C4 G4
  { f: 349.23, d: 4 }, { f: 392.00, d: 4 }, // F4 G4
];

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const setVolumes = (sfx: number, music: number) => {
  sfxVolume = sfx;
  musicVolume = music;
  if (musicGainNode && audioCtx) {
    musicGainNode.gain.linearRampToValueAtTime(musicVolume, audioCtx.currentTime + 0.1);
  }
};

export const setBPM = (bpm: number) => {
  currentBPM = bpm;
};

const scheduleNote = (time: number) => {
  if (!audioCtx) return;

  // Create music gain node if it doesn't exist
  if (!musicGainNode) {
    musicGainNode = audioCtx.createGain();
    musicGainNode.connect(audioCtx.destination);
    musicGainNode.gain.value = musicVolume;
  }

  const secondsPerBeat = 60.0 / currentBPM;
  const sixteenthNoteTime = secondsPerBeat / 4;

  // Melody
  const noteIndex = currentNote % melody.length;
  const note = melody[noteIndex];
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(musicGainNode);
  
  osc.type = 'triangle';
  osc.frequency.value = note.f;
  
  gain.gain.setValueAtTime(0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + (note.d * sixteenthNoteTime) - 0.05);
  
  osc.start(time);
  osc.stop(time + (note.d * sixteenthNoteTime));

  // Bass (simpler rhythm)
  if (currentNote % 4 === 0) {
      const bassIndex = (Math.floor(currentNote / 4)) % bassLine.length;
      const bassNote = bassLine[bassIndex];
      
      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      
      bassOsc.connect(bassGain);
      bassGain.connect(musicGainNode);
      
      bassOsc.type = 'sine';
      bassOsc.frequency.value = bassNote.f / 2; // Octave down
      
      bassGain.gain.setValueAtTime(0.15, time);
      bassGain.gain.exponentialRampToValueAtTime(0.01, time + (bassNote.d * sixteenthNoteTime));
      
      bassOsc.start(time);
      bassOsc.stop(time + (bassNote.d * sixteenthNoteTime));
  }

  // Advance time
  nextNoteTime += note.d * sixteenthNoteTime;
  currentNote++;
};

const scheduler = () => {
  if (!musicPlaying) return;
  
  // Schedule ahead
  while (nextNoteTime < (audioCtx?.currentTime || 0) + 0.1) {
      scheduleNote(nextNoteTime);
  }
  timerID = window.setTimeout(scheduler, 25);
};

export const startMusic = () => {
  const ctx = getContext();
  if (musicPlaying) return;
  
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  musicPlaying = true;
  currentNote = 0;
  nextNoteTime = ctx.currentTime + 0.1;
  scheduler();
};

export const stopMusic = () => {
  musicPlaying = false;
  if (timerID) clearTimeout(timerID);
};

export const playPopSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3 * sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio play failed", e);
  }
};

export const playFlavorSound = (flavor: Flavor) => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Default values
    let freq = 440;
    let type: OscillatorType = 'sine';
    let duration = 0.15;

    // Unique sound profile for each flavor
    switch (flavor) {
      case Flavor.VANILLA:
        freq = 440; // A4 - Classic, smooth
        type = 'sine';
        break;
      case Flavor.CHOCOLATE:
        freq = 220; // A3 - Deep, rich
        type = 'square';
        break;
      case Flavor.STRAWBERRY:
        freq = 659.25; // E5 - Sweet, high
        type = 'sine';
        break;
      case Flavor.MINT:
        freq = 880; // A5 - Sharp, fresh
        type = 'triangle';
        break;
      case Flavor.BLUEBERRY:
        freq = 329.63; // E4 - Mellow
        type = 'sine';
        break;
      case Flavor.LEMON:
        freq = 1174.66; // D6 - Zesty, very high
        type = 'sawtooth';
        duration = 0.1; // Snappy
        break;
      case Flavor.COFFEE:
        freq = 110; // A2 - Dark, buzzy
        type = 'sawtooth';
        break;
      case Flavor.PISTACHIO:
        freq = 554.37; // C#5 - Nutty
        type = 'triangle';
        break;
      case Flavor.MANGO:
        freq = 523.25; // C5 - Tropical, bright
        type = 'sine';
        break;
      case Flavor.COOKIE_DOUGH:
        freq = 164.81; // E3 - Chunky, low
        type = 'square';
        break;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    // Add a slight pitch slide for "plop" effect
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.2 * sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Flavor audio play failed", e);
  }
};

export const playSuccessSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    
    // Arpeggio C - E - G - C
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const startTime = now + (i * 0.08);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2 * sfxVolume, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
    });
  } catch (e) {}
};

export const playErrorSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3 * sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

export const playGameOverSound = () => {
  try {
     const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.2);
    osc.frequency.setValueAtTime(100, now + 0.4);
    
    gain.gain.setValueAtTime(0.2 * sfxVolume, now);
    gain.gain.setValueAtTime(0.2 * sfxVolume, now + 0.2);
    gain.gain.setValueAtTime(0.2 * sfxVolume, now + 0.4);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);
    
    osc.start(now);
    osc.stop(now + 1.0);
  } catch (e) {}
}