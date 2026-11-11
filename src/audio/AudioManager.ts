/**
 * Son de Bistro Donjon, 100 % synthétisé (Web Audio) : aucun fichier audio à charger.
 * Style « puce 16-bits » : ondes carrées/triangle + bruit, pour coller au pixel art.
 *  - sfx(nom)   : bruitages courts
 *  - music(nom) : boucles chiptune (menu, une musique de chasse par monde, cuisine, boss)
 */

export type Sfx =
  | 'clic' | 'coup_poele' | 'coup_rouleau' | 'coup_hachoir' | 'touche' | 'pop' | 'ramasse' | 'tranche'
  | 'marmite' | 'pret' | 'plat' | 'piece' | 'pouvoir' | 'aie' | 'stand' | 'ultime' | 'feu' | 'explosion'
  | 'hache' | 'parti' | 'laser' | 'rugissement' | 'choc' | 'vague' | 'cloche' | 'cartes' | 'carte' | 'soin' | 'victoire' | 'defaite';

export type Tune = 'menu' | 'chasse' | 'chasse_marche' | 'chasse_taverne' | 'chasse_cantine' | 'cuisine' | 'boss';

interface TuneDef {
  bpm: number;
  /** Mélodie en croches (notes MIDI, 0 = silence), 4 mesures de 8. */
  lead: number[];
  /** Basse en croches. */
  bass: number[];
  leadWave: OscillatorType;
  drums: boolean;
}

/** Basse « fondamentale / quinte » sur 4 accords. */
const bounce = (roots: number[]): number[] => roots.flatMap((r) => [r, r + 7, r, r + 7, r, r + 7, r, r + 7]);
const pedal = (roots: number[]): number[] => roots.flatMap((r) => [r, r, r + 12, r, r, r + 12, r, r]);

const TUNES: Record<Tune, TuneDef> = {
  // Fa majeur, tranquille : l'accueil du bistro
  menu: {
    bpm: 96, leadWave: 'triangle', drums: false,
    lead: [69, 72, 77, 0, 72, 69, 72, 0, 69, 74, 77, 0, 74, 69, 74, 0, 70, 74, 77, 0, 74, 70, 74, 77, 79, 76, 72, 0, 76, 79, 76, 0],
    bass: [41, 0, 48, 0, 41, 0, 48, 0, 38, 0, 45, 0, 38, 0, 45, 0, 46, 0, 53, 0, 46, 0, 53, 0, 48, 0, 55, 0, 48, 0, 55, 0],
  },
  // Clairière : do majeur, sautillant : la chasse aux ingrédients
  chasse: {
    bpm: 138, leadWave: 'square', drums: true,
    lead: [76, 79, 84, 79, 76, 79, 84, 0, 76, 81, 84, 81, 76, 81, 83, 0, 77, 81, 84, 81, 77, 81, 86, 84, 83, 86, 79, 83, 86, 0, 83, 79],
    bass: bounce([48, 45, 41, 43]),
  },
  // Marché de nuit : gamme japonaise (mi fa la si do), posé et mystérieux
  chasse_marche: {
    bpm: 124, leadWave: 'triangle', drums: true,
    lead: [76, 77, 81, 0, 83, 81, 77, 76, 81, 83, 84, 0, 83, 81, 77, 0, 76, 77, 81, 83, 84, 83, 81, 77, 76, 0, 77, 76, 72, 0, 71, 0],
    bass: pedal([45, 45, 41, 40]),
  },
  // Taverne : gigue médiévale en ré dorien, qui tape du pied
  chasse_taverne: {
    bpm: 150, leadWave: 'square', drums: true,
    lead: [74, 77, 81, 77, 74, 77, 81, 0, 72, 76, 79, 76, 72, 76, 79, 0, 74, 77, 81, 84, 83, 81, 79, 77, 76, 74, 72, 76, 74, 0, 74, 0],
    bass: bounce([38, 36, 38, 33]),
  },
  // Cantine cyber : arpèges de synthé rapides en mi mineur
  chasse_cantine: {
    bpm: 162, leadWave: 'sawtooth', drums: true,
    lead: [76, 83, 88, 83, 76, 83, 88, 91, 74, 81, 86, 81, 74, 81, 86, 90, 72, 79, 84, 79, 72, 79, 84, 88, 71, 78, 83, 78, 87, 83, 78, 75],
    bass: pedal([40, 38, 36, 35]),
  },
  // Sol majeur, pressé : le coup de feu en cuisine
  cuisine: {
    bpm: 172, leadWave: 'square', drums: true,
    lead: [74, 79, 83, 79, 74, 79, 83, 86, 76, 79, 83, 79, 76, 79, 83, 88, 76, 79, 84, 79, 76, 79, 84, 88, 78, 81, 86, 81, 90, 86, 81, 78],
    bass: bounce([43, 40, 48, 50]),
  },
  // La mineur, menaçant : le Roi Tomate
  boss: {
    bpm: 156, leadWave: 'sawtooth', drums: true,
    lead: [69, 0, 69, 72, 76, 0, 74, 72, 69, 0, 69, 72, 76, 79, 76, 0, 65, 0, 65, 69, 72, 0, 71, 69, 64, 68, 71, 76, 80, 0, 76, 0],
    bass: pedal([33, 33, 29, 28]),
  },
};

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
const MUTE_KEY = 'bistro-donjon-muet';

class AudioManager {
  muted = false;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last: Partial<Record<Sfx, number>> = {};

  private tune: Tune | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      /* pas de stockage : son activé */
    }
    // Les navigateurs exigent un geste de l'utilisateur avant de produire du son.
    const unlock = () => void this.context()?.resume();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.2; // musique en retrait : les bruitages (coups, monstres) restent au premier plan
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* ignoré */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  // ------------------------------------------------------------------ briques sonores
  private tone(bus: GainNode, freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slideTo = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(bus: GainNode, dur: number, vol: number, filter: BiquadFilterType, freq: number, at = 0, sweepTo = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Suite de notes (jingle). */
  private arp(notes: number[], stepDur: number, type: OscillatorType, vol: number, hold = 1.6): void {
    notes.forEach((n, i) => n && this.tone(this.sfxBus, hz(n), stepDur * hold, type, vol, i * stepDur));
  }

  // ------------------------------------------------------------------ bruitages
  sfx(name: Sfx): void {
    const ctx = this.context();
    if (!ctx || this.muted || ctx.state !== 'running') return;
    // anti-mitraillage : un même son au plus toutes les 45 ms
    const now = ctx.currentTime;
    if (now - (this.last[name] ?? -1) < 0.045) return;
    this.last[name] = now;
    const b = this.sfxBus;

    switch (name) {
      case 'clic':
        this.tone(b, 660, 0.06, 'square', 0.12);
        break;
      case 'coup_poele': // « woush » enflammé + tintement de poêle
        this.noise(b, 0.14, 0.5, 'bandpass', 900, 0, 2600);
        this.tone(b, 520, 0.07, 'triangle', 0.18, 0.03, 380);
        break;
      case 'coup_rouleau': // coup lourd
        this.tone(b, 150, 0.16, 'triangle', 0.4, 0, 55);
        this.noise(b, 0.1, 0.22, 'lowpass', 500);
        break;
      case 'coup_hachoir': // lame rapide
        this.noise(b, 0.05, 0.16, 'highpass', 3500);
        this.tone(b, 1900, 0.04, 'square', 0.04, 0, 1300);
        break;
      case 'touche':
        this.tone(b, 300, 0.05, 'square', 0.08, 0, 180);
        break;
      case 'pop': // monstre vaincu
        this.tone(b, 520, 0.11, 'square', 0.13, 0, 110);
        this.noise(b, 0.07, 0.12, 'lowpass', 1400);
        break;
      case 'ramasse':
        this.tone(b, 880, 0.05, 'square', 0.14);
        this.tone(b, 1320, 0.07, 'square', 0.14, 0.045);
        break;
      case 'tranche': // lame + petit éclat
        this.noise(b, 0.09, 0.22, 'highpass', 2500, 0, 7000);
        this.tone(b, 1568, 0.09, 'triangle', 0.14, 0.03);
        this.tone(b, 2093, 0.12, 'triangle', 0.12, 0.07);
        break;
      case 'marmite': // plouf + bouillon
        this.tone(b, 300, 0.12, 'sine', 0.3, 0, 90);
        [0.1, 0.17, 0.25].forEach((t, i) => this.tone(b, 240 + i * 70, 0.06, 'sine', 0.16, t, 420 + i * 70));
        break;
      case 'pret': // « ding ! »
        this.tone(b, 1319, 0.25, 'triangle', 0.22);
        this.tone(b, 1976, 0.4, 'triangle', 0.2, 0.09);
        break;
      case 'plat':
        this.tone(b, 587, 0.06, 'square', 0.1);
        this.tone(b, 784, 0.09, 'square', 0.1, 0.05);
        break;
      case 'piece': // encaissement
        this.arp([88, 91, 95, 100], 0.055, 'square', 0.17);
        this.noise(b, 0.05, 0.08, 'highpass', 6000, 0.2);
        break;
      case 'pouvoir':
        this.arp([72, 76, 79, 84, 88], 0.045, 'triangle', 0.14);
        break;
      case 'aie':
        this.tone(b, 330, 0.22, 'sawtooth', 0.2, 0, 90);
        this.noise(b, 0.1, 0.14, 'lowpass', 900);
        break;
      case 'stand': // bois qui craque
        this.tone(b, 110, 0.18, 'square', 0.22, 0, 50);
        this.noise(b, 0.16, 0.25, 'lowpass', 700);
        break;
      case 'ultime':
        this.tone(b, 180, 0.5, 'sawtooth', 0.2, 0, 1400);
        this.noise(b, 0.6, 0.25, 'bandpass', 400, 0, 5000);
        this.arp([72, 79, 84, 91], 0.07, 'square', 0.12, 2);
        break;
      case 'feu': // boule de feu du piment
        this.noise(b, 0.2, 0.32, 'bandpass', 1800, 0, 500);
        this.tone(b, 700, 0.14, 'square', 0.05, 0, 260);
        break;
      case 'explosion':
        this.noise(b, 0.55, 0.5, 'lowpass', 1800, 0, 120);
        this.tone(b, 120, 0.4, 'triangle', 0.4, 0, 35);
        break;
      case 'hache': // couteau sur la planche
        this.noise(b, 0.04, 0.3, 'highpass', 3000);
        this.tone(b, 220, 0.05, 'triangle', 0.25, 0.01, 140);
        break;
      case 'parti': // client mécontent
        this.tone(b, 392, 0.14, 'square', 0.12);
        this.tone(b, 294, 0.24, 'square', 0.12, 0.13);
        break;
      case 'laser':
        this.tone(b, 1500, 0.09, 'square', 0.07, 0, 500);
        break;
      case 'rugissement': // le Roi Tomate
        this.tone(b, 95, 0.7, 'sawtooth', 0.32, 0, 48);
        this.tone(b, 143, 0.7, 'sawtooth', 0.2, 0, 70);
        this.noise(b, 0.6, 0.2, 'lowpass', 600);
        break;
      case 'choc':
        this.tone(b, 90, 0.3, 'triangle', 0.45, 0, 32);
        this.noise(b, 0.25, 0.3, 'lowpass', 400);
        break;
      case 'vague': // petite fanfare de départ
        this.arp([72, 72, 76, 79, 0, 84], 0.08, 'square', 0.13);
        break;
      case 'cloche': // cloche de service : « en cuisine ! »
        [0, 0.16, 0.32].forEach((t) => {
          this.tone(b, 1568, 0.3, 'triangle', 0.2, t);
          this.tone(b, 3136, 0.2, 'sine', 0.08, t);
        });
        break;
      case 'cartes':
        this.arp([67, 72, 76, 79, 84], 0.06, 'triangle', 0.15);
        break;
      case 'carte':
        this.arp([76, 84, 88], 0.06, 'square', 0.13, 2);
        break;
      case 'soin':
        this.tone(b, 880, 0.12, 'sine', 0.14, 0, 1320);
        break;
      case 'victoire':
        this.arp([72, 76, 79, 84, 0, 79, 84, 88, 91, 96], 0.11, 'square', 0.15, 2.2);
        this.arp([48, 0, 0, 0, 0, 55, 0, 0, 60, 60], 0.11, 'triangle', 0.22, 3);
        break;
      case 'defaite':
        this.arp([72, 71, 69, 67, 65, 64, 60], 0.16, 'triangle', 0.18, 1.8);
        this.arp([0, 0, 0, 0, 0, 0, 36], 0.16, 'sawtooth', 0.14, 5);
        break;
    }
  }

  // ------------------------------------------------------------------ musique
  music(name: Tune | null): void {
    if (name === this.tune) return;
    this.tune = name;
    this.step = 0;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const ctx = this.context();
    if (!ctx || !name) return;
    this.nextTime = ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 40);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.tune || ctx.state !== 'running') return;
    const def = TUNES[this.tune];
    const stepDur = 60 / def.bpm / 2; // une croche
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.02;
    while (this.nextTime < ctx.currentTime + 0.18) {
      const at = this.nextTime - ctx.currentTime;
      const i = this.step % def.lead.length;
      const lead = def.lead[i];
      const bass = def.bass[i % def.bass.length];
      if (lead) this.tone(this.musicBus, hz(lead), stepDur * 0.95, def.leadWave, def.leadWave === 'triangle' ? 0.2 : 0.075, at);
      if (bass) this.tone(this.musicBus, hz(bass), stepDur * 0.9, 'triangle', 0.26, at);
      if (def.drums) {
        const beat = i % 8;
        if (beat === 0 || beat === 4) this.tone(this.musicBus, 130, 0.11, 'sine', 0.4, at, 45); // grosse caisse
        if (beat === 2 || beat === 6) this.noise(this.musicBus, 0.09, 0.16, 'highpass', 1800, at); // caisse claire
        if (beat % 2 === 1) this.noise(this.musicBus, 0.03, 0.06, 'highpass', 7000, at); // charleston
      }
      this.step++;
      this.nextTime += stepDur;
    }
  }
}

export const audio = new AudioManager();
