/**
 * Son de Bistro Donjon, synthétisé (Web Audio) : presque aucun fichier audio à charger.
 * Style 3D : orchestre (cuivres, cordes, flûte, timbales) et bruitages d'armes fabriqués un par un ;
 * l'ancien style « puce 16-bits » reste pour le mode pixel.
 *  - sfx(nom)   : bruitages courts
 *  - music(nom) : boucles chiptune (menu, boutique, duel, une musique de chasse par monde, cuisine, boss)
 */

export type Sfx =
  | 'clic' | 'coup_poele' | 'coup_rouleau' | 'coup_hachoir' | 'touche' | 'pop' | 'ramasse' | 'tranche'
  | 'marmite' | 'pret' | 'plat' | 'piece' | 'pouvoir' | 'aie' | 'stand' | 'ultime' | 'feu' | 'explosion'
  | 'coup_hache' | 'coup_elec' | 'coup_wok' | 'coup_glace' | 'splat' | 'fantome'
  | 'hache' | 'parti' | 'laser' | 'rugissement' | 'choc' | 'vague' | 'cloche' | 'cartes' | 'carte' | 'soin' | 'victoire' | 'defaite'
  | 'legendaire' | 'cadeau' | 'niveau' | 'pas';

export type Tune =
  | 'menu' | 'chasse' | 'chasse_marche' | 'chasse_taverne' | 'chasse_cantine'
  | 'chasse_glaciere' | 'chasse_volcan' | 'chasse_bateau' | 'chasse_bonbons' | 'cuisine' | 'boss' | 'boutique' | 'duel';

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
/**
 * Mélodie en arpèges : pour chaque accord [fondamentale, majeur/mineur], suit un motif de 8 croches
 * (indices dans l'accord : 0 fondamentale, 1 tierce, 2 quinte, 3 octave, 4 et + : octave du dessus ; -1 = silence).
 */
const CHORD = { M: [0, 4, 7, 12], m: [0, 3, 7, 12] };
const arp = (chords: [number, 'M' | 'm'][], pattern: number[], up = 24): number[] =>
  chords.flatMap(([r, q]) => pattern.map((i) => (i < 0 ? 0 : r + up + CHORD[q][i % 4] + 12 * Math.floor(i / 4))));

const TUNES: Record<Tune, TuneDef> = {
  // Écran titre : aventure épique en ré mineur (choix de Rudy, 12/11)
  menu: {
    bpm: 118, leadWave: 'square', drums: true,
    lead: arp([[50, 'm'], [46, 'M'], [48, 'M'], [45, 'm']], [4, 2, 0, 2, 4, 5, 4, 2]),
    bass: pedal([38, 34, 36, 33]),
  },
  // Clairière : do majeur, sautillant : la chasse aux ingrédients
  chasse: {
    bpm: 138, leadWave: 'square', drums: true,
    lead: [76, 79, 84, 79, 76, 79, 84, 0, 76, 81, 84, 81, 76, 81, 83, 0, 77, 81, 84, 81, 77, 81, 86, 84, 83, 86, 79, 83, 86, 0, 83, 79],
    bass: bounce([48, 45, 41, 43]),
  },
  // Marché de nuit : « Lanternes », la mineur (choix de Rudy, 12/11)
  chasse_marche: {
    bpm: 112, leadWave: 'square', drums: true,
    lead: arp([[57, 'm'], [53, 'M'], [52, 'm'], [57, 'm']], [0, -1, 2, 4, 5, 4, -1, 2]),
    bass: pedal([45, 41, 40, 45]),
  },
  // Taverne : gigue médiévale en ré dorien, qui tape du pied
  chasse_taverne: {
    bpm: 150, leadWave: 'square', drums: true,
    lead: [74, 77, 81, 77, 74, 77, 81, 0, 72, 76, 79, 76, 72, 76, 79, 0, 74, 77, 81, 84, 83, 81, 79, 77, 76, 74, 72, 76, 74, 0, 74, 0],
    bass: bounce([38, 36, 38, 33]),
  },
  // Cantine cyber : « Néon », mi mineur (choix de Rudy, 12/11)
  chasse_cantine: {
    bpm: 150, leadWave: 'square', drums: true,
    lead: arp([[52, 'm'], [48, 'M'], [55, 'M'], [50, 'M']], [0, 4, 2, 4, 5, 4, 2, 0]),
    bass: bounce([40, 36, 43, 38]),
  },
  // Glacière : notes cristallines et espacées, froid et calme
  chasse_glaciere: {
    bpm: 118, leadWave: 'triangle', drums: true,
    lead: [80, 0, 85, 88, 0, 85, 80, 0, 78, 0, 83, 87, 0, 83, 78, 0, 76, 0, 80, 85, 0, 80, 76, 0, 75, 78, 82, 87, 85, 82, 78, 0],
    bass: pedal([49, 47, 45, 44]),
  },
  // Volcan barbecue : ré mineur martelé, nerveux
  chasse_volcan: {
    bpm: 168, leadWave: 'sawtooth', drums: true,
    lead: [74, 74, 77, 74, 81, 74, 77, 74, 72, 72, 76, 72, 79, 72, 76, 72, 70, 70, 74, 70, 77, 70, 74, 77, 69, 73, 76, 81, 79, 76, 73, 69],
    bass: pedal([38, 36, 34, 33]),
  },
  // Galion pirate : « À l'abordage », ré mineur (choix de Rudy, 12/11)
  chasse_bateau: {
    bpm: 156, leadWave: 'sawtooth', drums: true,
    lead: arp([[50, 'm'], [46, 'M'], [48, 'M'], [45, 'M']], [0, 2, 4, 5, 4, 2, 0, -1]),
    bass: bounce([38, 34, 36, 33]),
  },
  // Usine hantée : intervalles inquiétants, comme une boîte à musique détraquée
  chasse_bonbons: {
    bpm: 132, leadWave: 'square', drums: true,
    lead: [72, 0, 78, 0, 75, 0, 81, 0, 72, 75, 78, 81, 84, 81, 78, 75, 71, 0, 77, 0, 74, 0, 80, 0, 71, 74, 77, 80, 83, 80, 77, 0],
    bass: pedal([36, 39, 35, 38]),
  },
  // Coup de feu en cuisine : « Casseroles qui tapent » (choix de Rudy, 12/11)
  cuisine: {
    bpm: 164, leadWave: 'sawtooth', drums: true,
    lead: arp([[50, 'm'], [53, 'M'], [48, 'M'], [52, 'M']], [0, 0, 4, 0, 2, 0, 5, 4]),
    bass: pedal([38, 41, 36, 40]),
  },
  // La mineur, menaçant : le Roi Tomate
  boss: {
    bpm: 156, leadWave: 'sawtooth', drums: true,
    lead: [69, 0, 69, 72, 76, 0, 74, 72, 69, 0, 69, 72, 76, 79, 76, 0, 65, 0, 65, 69, 72, 0, 71, 69, 64, 68, 71, 76, 80, 0, 76, 0],
    bass: pedal([33, 33, 29, 28]),
  },
  // Boutique : « Marchand funky », la mineur (choix de Rudy, 12/11)
  boutique: {
    bpm: 116, leadWave: 'square', drums: true,
    lead: arp([[45, 'm'], [50, 'm'], [52, 'M'], [45, 'm']], [0, 0, 2, -1, 4, -1, 2, 5]),
    bass: bounce([33, 38, 40, 33]),
  },
  // Duel : « Rivalité », mi mineur (choix de Rudy, 12/11)
  duel: {
    bpm: 160, leadWave: 'sawtooth', drums: true,
    lead: arp([[52, 'm'], [48, 'M'], [50, 'M'], [47, 'M']], [0, 2, 4, 2, 5, 4, 2, 4]),
    bass: pedal([40, 36, 38, 35]),
  },
};

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
const MUTE_KEY = 'bistro-donjon-muet';

/**
 * Style 3D (15/11, demande de Rudy) : les gros bruitages sont de vrais sons, découpés dans sa vidéo de pub
 * (tools/extract_sons.sh -> public/assets/sons/). Les autres bruitages restent synthétisés.
 */
const SAMPLE_OF: Partial<Record<Sfx, string>> = {
  // 15/11 (2e passe) : les coups d'armes ne prennent plus les sons de la vidéo (on y entendait la musique) :
  // chaque arme a son propre bruitage fabriqué (voir weapon() plus bas). On garde les grands moments.
  ultime: 'flamme', rugissement: 'boss', victoire: 'final', marmite: 'marmite',
};
const SAMPLE_VOL: Record<string, number> = { poele: 0.55, wok: 0.5, lourd: 0.6, ecrase: 0.45, flamme: 0.7, boss: 0.8, final: 0.8, marmite: 0.4 };

class AudioManager {
  private samples = new Map<string, AudioBuffer>();
  private realSounds = false;

  /** Charge les vrais bruitages (style 3D). Appelé une fois au démarrage. */
  useRealSounds(base = 'assets/sons/'): void {
    this.realSounds = true;
    const ctx = this.context();
    if (!ctx) return;
    for (const name of new Set(Object.values(SAMPLE_OF))) {
      void fetch(`${base}${name}.mp3`)
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => this.samples.set(name!, buf))
        .catch(() => undefined); // son absent : le bruitage synthétisé prend le relais
    }
  }

  /** Joue un vrai son s'il est chargé ; renvoie faux sinon. Légère variation de hauteur pour ne pas lasser. */
  private playSample(name: string): boolean {
    const buf = this.samples.get(name);
    if (!buf || !this.ctx) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.94 + Math.random() * 0.12;
    const g = this.ctx.createGain();
    g.gain.value = SAMPLE_VOL[name] ?? 0.6;
    src.connect(g).connect(this.sfxBus);
    src.start();
    return true;
  }
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
    if (this.realSounds) {
      // style 3D : on adoucit les ondes carrées (filtre) et on ajoute un écho de grande salle
      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 5000;
      const rev = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 1.8);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      rev.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      this.musicBus.connect(soft).connect(this.master);
      soft.connect(rev).connect(wet).connect(this.master);
      this.musicBus.gain.value = 0.26;
    } else this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    if (this.realSounds) {
      // style 3D : un peu d'écho de pièce sur les bruitages, pour qu'ils sonnent « dans le donjon » et non plats
      const room = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 0.7);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      }
      room.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0.16;
      this.sfxBus.connect(room).connect(wet).connect(this.master);
      // compresseur : les gros coups restent forts sans saturer quand tout tape en même temps
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.disconnect();
      this.master.connect(comp).connect(ctx.destination);
    }
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

  /**
   * Voix « orchestre » du style 3D (au lieu des ondes carrées 8-bit) :
   * cuivre = deux dents de scie légèrement désaccordées dont le filtre s'ouvre puis se referme ;
   * cordes = nappe douce qui monte lentement.
   */
  private voice(kind: 'cuivre' | 'cordes', freq: number, dur: number, vol: number, at = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = kind === 'cuivre' ? 2 : 0.7;
    const g = ctx.createGain();
    const atk = kind === 'cuivre' ? 0.02 : Math.min(0.35, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + Math.max(atk, dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (kind === 'cuivre') {
      f.frequency.setValueAtTime(freq * 1.5, t);
      f.frequency.linearRampToValueAtTime(freq * 6, t + 0.05);
      f.frequency.exponentialRampToValueAtTime(freq * 2, t + dur);
    } else f.frequency.value = 1400;
    for (const det of kind === 'cuivre' ? [-7, 7] : [-10, 0, 10]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    f.connect(g).connect(this.musicBus);
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

  /** Métal frappé (poêle, wok, hachoir) : partiels inharmoniques qui s'éteignent à des vitesses différentes. */
  private metal(base: number, dur: number, vol: number, at = 0): void {
    [[1, 1], [2.32, 0.6], [4.25, 0.4], [6.63, 0.25], [9.38, 0.12]].forEach(([r, v], i) =>
      this.tone(this.sfxBus, base * r * (0.995 + Math.random() * 0.01), dur / (1 + i * 0.6), 'sine', vol * v, at));
  }

  /** Souffle de l'arme qui fend l'air. */
  private whoosh(vol: number, low = 500, high = 2600, dur = 0.16): void {
    this.noise(this.sfxBus, dur, vol, 'bandpass', low, 0, high);
  }

  /** Crépitement (feu, éclairs, glace) : petits claquements au hasard. */
  private crackle(n: number, dur: number, vol: number, freq: number, at = 0): void {
    for (let i = 0; i < n; i++) this.noise(this.sfxBus, 0.02 + Math.random() * 0.03, vol * (0.5 + Math.random() * 0.5), 'bandpass', freq * (0.7 + Math.random() * 0.6), at + Math.random() * dur);
  }

  /**
   * Coups d'armes du style 3D (15/11, demande de Rudy : « les effets sonores des armes et des personnages ») :
   * chaque arme a son geste sonore = souffle + impact + matière (métal, bois, glace, éclair, feu).
   */
  private weapon(name: Sfx): boolean {
    const b = this.sfxBus;
    switch (name) {
      case 'coup_poele': // poêle de Chef Moustachu : grand « BONG » de fonte
        this.whoosh(0.12);
        this.tone(b, 150, 0.16, 'sine', 0.45, 0.03, 60);
        this.metal(330, 0.9, 0.16, 0.03);
        this.noise(b, 0.05, 0.25, 'highpass', 2500, 0.03);
        return true;
      case 'coup_rouleau': // rouleau de Maître Shiba : bois plein qui claque
        this.whoosh(0.12, 400, 1800);
        this.tone(b, 240, 0.12, 'triangle', 0.4, 0.03, 110);
        this.tone(b, 680, 0.04, 'sine', 0.25, 0.03, 420);
        this.noise(b, 0.08, 0.28, 'bandpass', 1100, 0.03, 500);
        return true;
      case 'coup_hachoir': // hachoirs de Mlle Noisette : deux lames qui sifflent puis tranchent
        this.noise(b, 0.12, 0.16, 'highpass', 3000, 0, 8000);
        this.metal(1500, 0.3, 0.07, 0.04);
        this.tone(b, 180, 0.1, 'sine', 0.35, 0.05, 70);
        this.noise(b, 0.1, 0.12, 'highpass', 4000, 0.09, 9000);
        this.metal(1750, 0.25, 0.05, 0.12);
        return true;
      case 'coup_hache': // hachoir géant enflammé du Taureau : souffle lourd, choc qui fait trembler, feu qui crépite
        this.whoosh(0.2, 250, 1400, 0.25);
        this.tone(b, 95, 0.55, 'sine', 0.6, 0.08, 32);
        this.metal(220, 0.6, 0.1, 0.08);
        this.noise(b, 0.4, 0.18, 'lowpass', 1500, 0.08, 200);
        this.crackle(7, 0.45, 0.14, 2600, 0.1);
        return true;
      case 'coup_elec': // poêles-gants du Gorille : coup de poing métallique + arc électrique
        this.tone(b, 130, 0.14, 'sine', 0.45, 0, 55);
        this.metal(420, 0.5, 0.1);
        this.tone(b, 1400, 0.18, 'sawtooth', 0.06, 0.01, 180);
        this.tone(b, 60, 0.25, 'square', 0.05, 0.01);
        this.crackle(8, 0.25, 0.12, 5000, 0.01);
        return true;
      case 'coup_wok': // woks du Tigre : métal grave + flamme bleue qui souffle
        this.whoosh(0.14, 300, 2200, 0.2);
        this.metal(260, 0.75, 0.13, 0.05);
        this.tone(b, 120, 0.15, 'sine', 0.35, 0.05, 55);
        this.noise(b, 0.35, 0.16, 'bandpass', 500, 0.05, 2600);
        this.crackle(4, 0.3, 0.08, 3000, 0.1);
        return true;
      case 'coup_glace': // marteau de l'Ours : choc sourd puis la glace qui éclate en cristaux
        this.whoosh(0.16, 300, 1500, 0.22);
        this.tone(b, 110, 0.35, 'sine', 0.55, 0.06, 40);
        this.noise(b, 0.12, 0.25, 'highpass', 3500, 0.06);
        [2100, 3150, 4420, 5600].forEach((f, i) => this.tone(b, f, 0.35 - i * 0.05, 'sine', 0.05, 0.08 + i * 0.03));
        this.crackle(6, 0.2, 0.1, 6000, 0.08);
        return true;
      case 'choc': // gros choc au sol
        this.tone(b, 85, 0.5, 'sine', 0.6, 0, 30);
        this.noise(b, 0.35, 0.22, 'lowpass', 900, 0, 120);
        return true;
      case 'splat': // monstre mou écrasé : « sploutch » humide
        this.noise(b, 0.22, 0.3, 'lowpass', 1600, 0, 180);
        this.tone(b, 320, 0.16, 'sine', 0.3, 0, 70);
        this.crackle(3, 0.12, 0.08, 900, 0.03);
        return true;
      case 'pop': // monstre vaincu : « pouf » rond et un petit éclat
        this.tone(b, 260, 0.12, 'sine', 0.35, 0, 90);
        this.noise(b, 0.18, 0.18, 'bandpass', 1400, 0, 400);
        this.tone(b, 1300, 0.12, 'sine', 0.06, 0.05, 2000);
        return true;
      case 'pas': // pas du chef : petit bruit feutré
        this.noise(b, 0.05, 0.05, 'lowpass', 420);
        this.tone(b, 95, 0.05, 'sine', 0.05, 0, 70);
        return true;
      default:
        return false;
    }
  }

  /**
   * Bruitages fréquents refaits « 3D » (bruits sourds et ronds au lieu des bips 8-bit) quand aucun vrai son n'existe.
   * Renvoie faux pour garder le bruitage d'origine.
   */
  private sfx3d(name: Sfx): boolean {
    const b = this.sfxBus;
    switch (name) {
      case 'touche': // coup qui porte : choc sourd + petit claquement
        this.tone(b, 160, 0.12, 'sine', 0.35, 0, 60);
        this.noise(b, 0.08, 0.25, 'lowpass', 2200, 0, 400);
        return true;
      case 'aie': // le chef est touché : gros choc grave + souffle
        this.tone(b, 120, 0.22, 'sine', 0.45, 0, 45);
        this.noise(b, 0.18, 0.2, 'bandpass', 900, 0, 300);
        return true;
      case 'ramasse': // ingrédient ramassé : petit « plop » rond
        this.tone(b, 420, 0.09, 'sine', 0.22, 0, 900);
        this.noise(b, 0.05, 0.06, 'highpass', 4000);
        return true;
      case 'tranche': // couteau : souffle de lame
        this.noise(b, 0.14, 0.22, 'bandpass', 3000, 0, 7000);
        this.tone(b, 2400, 0.05, 'triangle', 0.06, 0.06);
        return true;
      case 'feu': // tir des monstres : souffle
        this.noise(b, 0.16, 0.16, 'bandpass', 1200, 0, 3000);
        return true;
      case 'stand': // le stand prend un coup : bois qui craque
        this.tone(b, 90, 0.2, 'sine', 0.4, 0, 50);
        this.noise(b, 0.12, 0.22, 'bandpass', 600, 0.01, 200);
        return true;
      case 'clic': // bouton : clic doux
        this.tone(b, 700, 0.05, 'sine', 0.15, 0, 500);
        return true;
      default:
        return false;
    }
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
    const real = this.realSounds ? SAMPLE_OF[name] : undefined;
    if (real && this.playSample(real)) return;
    if (this.realSounds && (this.weapon(name) || this.sfx3d(name))) return;
    if (name === 'pas') return; // les pas n'existent qu'en 3D

    switch (name) {
      case 'clic': // bouton appuyé : « Bouton rétro » (choix de Rudy, 12/11)
        this.tone(b, 880, 0.04, 'square', 0.08);
        this.tone(b, 1320, 0.05, 'square', 0.08, 0.035);
        break;
      case 'coup_poele': // poêle de Chef Moustachu : « Gong de poêle » (choix de Rudy, 12/11)
        this.tone(b, 180, 0.16, 'sine', 0.335, 0, 60);
        this.tone(b, 740, 0.35, 'triangle', 0.147, 0.01);
        this.tone(b, 1110, 0.25, 'triangle', 0.067, 0.01);
        this.noise(b, 0.06, 0.201, 'highpass', 3000);
        break;
      case 'coup_rouleau': // rouleau de Maître Shiba : « Bois qui craque » (choix de Rudy, 12/11)
        this.noise(b, 0.03, 0.335, 'highpass', 2000);
        this.tone(b, 380, 0.05, 'square', 0.101, 0, 190);
        this.tone(b, 140, 0.16, 'sine', 0.369, 0.01, 45);
        this.noise(b, 0.12, 0.134, 'bandpass', 600, 0.03);
        break;
      case 'coup_hachoir': // hachoirs de Mlle Noisette : « Laser cuisine » (choix de Rudy, 12/11)
        this.tone(b, 2400, 0.09, 'sawtooth', 0.054, 0, 600);
        this.noise(b, 0.05, 0.168, 'highpass', 6000);
        this.tone(b, 1200, 0.05, 'square', 0.04, 0.03, 300);
        break;
      case 'touche': // monstre touché : « Couinement » (choix de Rudy, 12/11)
        this.tone(b, 900, 0.07, 'square', 0.07, 0, 1400);
        this.tone(b, 200, 0.06, 'sine', 0.25, 0, 90);
        break;
      case 'pop': // monstre vaincu : « Pouf étoilé » (choix de Rudy, 12/11)
        this.noise(b, 0.15, 0.25, 'lowpass', 1500, 0, 300);
        this.tone(b, 1046.5, 0.075, 'square', 0.06, 0.05);
        this.tone(b, 1318.51, 0.075, 'square', 0.06, 0.1);
        this.tone(b, 1567.98, 0.075, 'square', 0.06, 0.15);
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
      case 'plat': // plat servi : « Cloche du comptoir » (choix de Rudy, 12/11)
        this.tone(b, 2093, 0.4, 'triangle', 0.16);
        this.tone(b, 4186, 0.2, 'sine', 0.05);
        break;
      case 'piece': // encaissement
        this.arp([88, 91, 95, 100], 0.055, 'square', 0.17);
        this.noise(b, 0.05, 0.08, 'highpass', 6000, 0.2);
        break;
      case 'pouvoir':
        this.arp([72, 76, 79, 84, 88], 0.045, 'triangle', 0.14);
        break;
      case 'aie': // chef touché : « Ouille ! » (choix de Rudy, 12/11)
        this.tone(b, 700, 0.08, 'square', 0.1, 0, 900);
        this.tone(b, 500, 0.2, 'square', 0.1, 0.08, 250);
        this.tone(b, 150, 0.16, 'sine', 0.4, 0, 45);
        break;
      case 'stand': // stand attaqué : « Cloche d'alerte » (choix de Rudy, 12/11)
        this.tone(b, 1047, 0.3, 'triangle', 0.15);
        this.tone(b, 1047, 0.3, 'triangle', 0.12, 0.18);
        this.tone(b, 120, 0.16, 'sine', 0.35, 0, 40);
        break;
      case 'ultime':
        this.tone(b, 180, 0.5, 'sawtooth', 0.2, 0, 1400);
        this.noise(b, 0.6, 0.25, 'bandpass', 400, 0, 5000);
        this.arp([72, 79, 84, 91], 0.07, 'square', 0.12, 2);
        break;
      case 'feu': // tir des monstres : « Sarbacane » (choix de Rudy, 12/11)
        this.noise(b, 0.03, 0.3, 'highpass', 4000);
        this.tone(b, 1200, 0.12, 'triangle', 0.1, 0.02, 600);
        break;
      case 'explosion': // boss vaincu : « Victoire royale » (choix de Rudy, 12/11)
        this.noise(b, 0.4, 0.5, 'lowpass', 2500, 0, 100);
        this.tone(b, 100, 0.16, 'sine', 0.7, 0, 28);
        this.tone(b, 523.25, 0.18, 'square', 0.1, 0.35);
        this.tone(b, 659.26, 0.18, 'square', 0.1, 0.44);
        this.tone(b, 783.99, 0.18, 'square', 0.1, 0.53);
        this.tone(b, 1046.5, 0.18, 'square', 0.1, 0.62);
        this.tone(b, 1318.51, 0.18, 'square', 0.1, 0.71);
        break;
      case 'hache': // couteau sur la planche
        this.noise(b, 0.04, 0.3, 'highpass', 3000);
        this.tone(b, 220, 0.05, 'triangle', 0.25, 0.01, 140);
        break;
      case 'parti': // pas assez de pièces / client parti : « Buzzer » (choix de Rudy, 12/11)
        this.tone(b, 140, 0.35, 'sawtooth', 0.12);
        this.tone(b, 147, 0.35, 'square', 0.06);
        break;
      case 'laser':
        this.tone(b, 1500, 0.09, 'square', 0.07, 0, 500);
        break;
      case 'rugissement': // le boss arrive : « Trompettes sombres » (choix de Rudy, 12/11)
        this.tone(b, 110.0, 0.324, 'sawtooth', 0.15);
        this.tone(b, 110.0, 0.324, 'sawtooth', 0.15, 0.18);
        this.tone(b, 130.81, 0.324, 'sawtooth', 0.15, 0.36);
        this.tone(b, 103.83, 0.324, 'sawtooth', 0.15, 0.54);
        this.tone(b, 70, 0.3, 'sine', 0.6, 0, 30);
        this.tone(b, 70, 0.4, 'sine', 0.6, 0.54, 30);
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
      case 'victoire': // victoire : « Triomphe épique » (choix de Rudy, 12/11)
        this.tone(b, 261.63, 0.16, 'sawtooth', 0.09);
        this.tone(b, 329.63, 0.16, 'sawtooth', 0.09, 0.08);
        this.tone(b, 392.0, 0.16, 'sawtooth', 0.09, 0.16);
        this.tone(b, 523.25, 0.16, 'sawtooth', 0.09, 0.24);
        this.tone(b, 659.26, 0.16, 'sawtooth', 0.09, 0.32);
        this.tone(b, 783.99, 0.16, 'sawtooth', 0.09, 0.4);
        this.tone(b, 1046.5, 0.16, 'sawtooth', 0.09, 0.48);
        this.tone(b, 523, 0.8, 'sawtooth', 0.1, 0.56);
        this.tone(b, 659, 0.8, 'square', 0.06, 0.56);
        this.tone(b, 100, 0.16, 'sine', 0.6, 0.56, 35);
        break;
      case 'coup_hache': // hachoir géant du Taureau Boucher : « Séisme » (choix de Rudy, 12/11)
        this.tone(b, 80, 0.16, 'sine', 0.536, 0, 28);
        this.tone(b, 45, 0.6, 'triangle', 0.302, 0, 28);
        this.noise(b, 0.5, 0.234, 'lowpass', 300, 0.02, 60);
        this.noise(b, 0.04, 0.201, 'highpass', 5000);
        break;
      case 'coup_elec': // poêles électriques : claquement + grésillement
        this.tone(b, 1600, 0.09, 'sawtooth', 0.12, 0, 220);
        this.noise(b, 0.08, 0.25, 'highpass', 5000);
        this.tone(b, 2400, 0.05, 'square', 0.06, 0.05, 900);
        break;
      case 'coup_wok': // woks du Tigre des Woks : « Flamme bleue » (choix de Rudy, 12/11)
        this.tone(b, 400, 0.18, 'sine', 0.121, 0, 1800);
        this.noise(b, 0.2, 0.234, 'bandpass', 2500, 0, 7000);
        this.tone(b, 180, 0.16, 'sine', 0.302, 0.05, 50);
        break;
      case 'coup_glace': // marteau de l'Ours Glacier : « Bloc de glace » (choix de Rudy, 12/11)
        this.tone(b, 100, 0.16, 'sine', 0.536, 0, 30);
        this.noise(b, 0.3, 0.234, 'highpass', 3500, 0.02);
        this.tone(b, 2637, 0.1, 'triangle', 0.08, 0.04);
        this.tone(b, 3136, 0.1, 'triangle', 0.067, 0.08);
        this.tone(b, 3951, 0.1, 'triangle', 0.054, 0.12);
        break;
      case 'splat': // monstre mou écrasé : « Explose en jus » (choix de Rudy, 12/11)
        this.noise(b, 0.04, 0.4, 'highpass', 3000);
        this.tone(b, 170, 0.16, 'sine', 0.45, 0, 50);
        this.noise(b, 0.3, 0.3, 'bandpass', 900, 0.03, 200);
        break;
      case 'fantome': // oignon fantôme : « Sanglot » (choix de Rudy, 12/11)
        this.tone(b, 600, 0.15, 'sine', 0.14, 0, 450);
        this.tone(b, 560, 0.15, 'sine', 0.14, 0.17, 420);
        this.tone(b, 520, 0.3, 'sine', 0.14, 0.34, 260);
        break;
      case 'defaite': // défaite : « Game over » (choix de Rudy, 12/11)
        this.tone(b, 493.88, 0.4, 'square', 0.12);
        this.tone(b, 466.16, 0.4, 'square', 0.12, 0.25);
        this.tone(b, 440.0, 0.4, 'square', 0.12, 0.5);
        this.tone(b, 415.3, 0.4, 'square', 0.12, 0.75);
        this.tone(b, 110, 0.8, 'sawtooth', 0.12, 1, 55);
        break;
      case 'legendaire': // article légendaire ou pack débloqué : « Légende » (choix de Rudy, 12/11)
        this.tone(b, 261.63, 0.22, 'sawtooth', 0.08);
        this.tone(b, 392.0, 0.22, 'sawtooth', 0.08, 0.1);
        this.tone(b, 523.25, 0.22, 'sawtooth', 0.08, 0.2);
        this.tone(b, 659.26, 0.22, 'sawtooth', 0.08, 0.3);
        this.tone(b, 783.99, 0.22, 'sawtooth', 0.08, 0.4);
        this.tone(b, 1046.5, 0.22, 'sawtooth', 0.08, 0.5);
        this.tone(b, 130.81, 0.6, 'triangle', 0.25);
        this.tone(b, 196.0, 0.6, 'triangle', 0.25, 0.3);
        this.tone(b, 2093, 0.6, 'triangle', 0.1, 0.6);
        break;
      case 'cadeau': // cadeau du jour : « Bonjour chef » (choix de Rudy, 12/11)
        this.tone(b, 523.25, 0.162, 'square', 0.09);
        this.tone(b, 659.26, 0.162, 'square', 0.09, 0.09);
        this.tone(b, 783.99, 0.162, 'square', 0.09, 0.18);
        this.tone(b, 659.26, 0.162, 'square', 0.09, 0.27);
        this.tone(b, 1046.5, 0.162, 'square', 0.09, 0.36);
        this.tone(b, 130.81, 0.18, 'triangle', 0.2);
        this.tone(b, 196.0, 0.18, 'triangle', 0.2, 0.18);
        this.tone(b, 261.63, 0.18, 'triangle', 0.2, 0.36);
        break;
      case 'niveau': // niveau gagné : « Trompette » (choix de Rudy, 12/11)
        this.tone(b, 392.0, 0.154, 'sawtooth', 0.1);
        this.tone(b, 392.0, 0.154, 'sawtooth', 0.1, 0.11);
        this.tone(b, 392.0, 0.154, 'sawtooth', 0.1, 0.22);
        this.tone(b, 523.25, 0.154, 'sawtooth', 0.1, 0.33);
        this.tone(b, 523, 0.4, 'sawtooth', 0.1, 0.44);
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
      if (this.realSounds) {
        // style 3D : cuivres pour la mélodie, contrebasse ronde, nappe de cordes à chaque mesure, timbales
        if (lead) this.voice('cuivre', hz(lead), stepDur * 1.1, 0.07, at);
        if (bass) this.tone(this.musicBus, hz(bass), stepDur * 0.95, 'sine', 0.32, at);
        if (i % 8 === 0 && bass) for (const n of [12, 19, 24]) this.voice('cordes', hz(bass + n), stepDur * 8, 0.035, at);
        if (lead) this.tone(this.musicBus, hz(lead + 12), stepDur * 0.9, 'sine', 0.025, at); // flûte qui double la mélodie
        if (i % 2 === 1 && bass) this.tone(this.musicBus, hz(bass + (i % 4 === 1 ? 12 : 19)), stepDur * 0.5, 'triangle', 0.07, at); // cordes pincées
        if (this.step % 32 === 0) this.noise(this.musicBus, 1.4, 0.05, 'highpass', 6000, at); // cymbale à chaque grande phrase
        if (def.drums) {
          const beat = i % 8;
          if (beat === 0 || beat === 4) this.tone(this.musicBus, 95, 0.32, 'sine', 0.5, at, 42); // timbale
          if (beat === 2 || beat === 6) this.noise(this.musicBus, 0.22, 0.12, 'bandpass', 1500, at, 600); // caisse claire d'orchestre
          if (beat % 2 === 1) this.noise(this.musicBus, 0.05, 0.03, 'highpass', 8000, at); // cymbale légère
        }
        this.step++;
        this.nextTime += stepDur;
        continue;
      }
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
