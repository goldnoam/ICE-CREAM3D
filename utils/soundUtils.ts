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

// Note Frequencies
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  C6: 1046.50,
  D6: 1174.66
};

// Extended Melody (Upbeat Loop)
// Each entry: { f: frequency, d: duration in 16th notes }
const melody = [
  // Bar 1: C Major Arpeggio
  { f: NOTES.C4, d: 2 }, { f: NOTES.E4, d: 2 }, { f: NOTES.G4, d: 2 }, { f: NOTES.C5, d: 2 },
  { f: NOTES.E5, d: 4 }, { f: NOTES.G5, d: 4 },
  
  // Bar 2: Descent
  { f: NOTES.F5, d: 2 }, { f: NOTES.D5, d: 2 }, { f: NOTES.B4, d: 2 }, { f: NOTES.G4, d: 2 },
  { f: NOTES.E4, d: 4 }, { f: NOTES.C4, d: 4 },

  // Bar 3: F Major Lilt
  { f: NOTES.F4, d: 2 }, { f: NOTES.A4, d: 2 }, { f: NOTES.C5, d: 2 }, { f: NOTES.F5, d: 2 },
  { f: NOTES.A5, d: 4 }, { f: NOTES.F5, d: 4 },

  // Bar 4: G Major Turnaround
  { f: NOTES.G4, d: 2 }, { f: NOTES.B4, d: 2 }, { f: NOTES.D5, d: 2 }, { f: NOTES.G5, d: 2 },
  { f: NOTES.B4, d: 8 }
];

// Bassline to accompany melody
const bassLine = [
  // C
  { f: NOTES.C3, d: 4 }, { f: NOTES.G3, d: 4 }, { f: NOTES.C3, d: 4 }, { f: NOTES.E3, d: 4 },
  // G / B (ish)
  { f: NOTES.G3, d: 4 }, { f: NOTES.D3, d: 4 }, { f: NOTES.G3, d: 4 }, { f: NOTES.B3, d: 4 },
  // F
  { f: NOTES.F3, d: 4 }, { f: NOTES.C4, d: 4 }, { f: NOTES.F3, d: 4 }, { f: NOTES.A3, d: 4 },
  // G
  { f: NOTES.G3, d: 4 }, { f: NOTES.D4, d: 4 }, { f: NOTES.G3, d: 8 }
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
  
  if (note) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(musicGainNode);
    
    osc.type = 'triangle'; // Smooth catchy lead
    osc.frequency.value = note.f;
    
    // Envelope: Attack, Sustain, Decay
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, time + (note.d * sixteenthNoteTime) - 0.05);
    
    osc.start(time);
    osc.stop(time + (note.d * sixteenthNoteTime));
  }

  // Bass
  const bassLoopLength = 16; // 16 sixteenths per bar roughly
  // Logic to find which bass note corresponds to current time
  // Simplified: Bass array aligns 1:1 with melody ticks? No, Bass duration is different.
  // We'll track bass separately or just map it simpler.
  // Let's use a simple mapping based on currentNote index
  // Melody is 16 + 16 + 16 + 16 = 64 ticks?
  // Our melody array has variable durations, so `currentNote` index doesn't map linearly to time.
  // This is a simple sequencer. To keep bass synced properly in this simple implementation,
  // we would need a proper tick counter. 
  // For simplicity/robustness in this environment, we will play bass only on the downbeat of the melody note if it aligns?
  // No, let's just use a simple modulo for bass based on the melody index to keep some rhythm, 
  // even if not perfectly musically theoretical, it keeps the "game loop" feel.
  
  const bassIndex = currentNote % bassLine.length;
  const bassNote = bassLine[bassIndex];

  if (bassNote) {
      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      
      bassOsc.connect(bassGain);
      bassGain.connect(musicGainNode);
      
      bassOsc.type = 'sine';
      bassOsc.frequency.value = bassNote.f;
      
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
        freq = NOTES.A4; 
        type = 'sine';
        break;
      case Flavor.CHOCOLATE:
        freq = NOTES.A3;
        type = 'square';
        break;
      case Flavor.STRAWBERRY:
        freq = NOTES.E5;
        type = 'sine';
        break;
      case Flavor.MINT:
        freq = NOTES.A5;
        type = 'triangle';
        break;
      case Flavor.BLUEBERRY:
        freq = NOTES.E4;
        type = 'sine';
        break;
      case Flavor.LEMON:
        freq = NOTES.D6; // Very high
        type = 'sawtooth';
        duration = 0.1;
        break;
      case Flavor.COFFEE:
        freq = NOTES.A3 / 2;
        type = 'sawtooth';
        break;
      case Flavor.PISTACHIO:
        freq = NOTES.C5; // C#5 approx
        type = 'triangle';
        break;
      case Flavor.MANGO:
        freq = NOTES.C5;
        type = 'sine';
        break;
      case Flavor.COOKIE_DOUGH:
        freq = NOTES.E3;
        type = 'square';
        break;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
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
    [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((freq, i) => {
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