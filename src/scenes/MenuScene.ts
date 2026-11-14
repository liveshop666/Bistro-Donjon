import Phaser from 'phaser';
import { landscapeMenu, MENU_SCALE, portraitMenu } from '../ui/landscapeMenu';
import { applyQuality, landscapeWanted, RES } from '../core/layout';
import { audio } from '../audio/AudioManager';
import { CHEF_ORDER, CHEFS, ChefId, DAILY_GIFT, FREE_WORLDS, H, itemLabel, playerLevel, W, worldUnlocked, WORLD_ORDER, WorldId, WORLDS } from '../core/constants';
import { claimDailyGift, loadProfile, loadRun, saveProfile } from '../core/Storage';
import { openModal } from '../ui/Modal';
import { claimBonus, claimMission, dailyMissions, MISSION_BONUS, MISSIONS, missionsStatus } from '../core/Missions';
import { BUILD_LABEL } from '../core/update';
import { button, txt } from '../ui/text';

/** Ecran titre : choix du chef et du monde, accès au solo, au duel, à la reprise et aux règles. */
export class MenuScene extends Phaser.Scene {
  private chef: ChefId = 'moustachu';
  private world: WorldId = 'clairiere';
  private unlocked = 1;
  private owned: string[] = [];
  /** Les mondes s'affichent 4 par 4. */
  private worldPage = 0;
  private worldObjs: Phaser.GameObjects.GameObject[] = [];
  private pageBtn!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Image;
  private frame!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private stats!: Phaser.GameObjects.Graphics;
  private worldInfo!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    applyQuality(); // une partie a ramé : on repasse en rendu fluide avant d'afficher le menu
    if (!loadProfile().rulesSeen) {
      // premier lancement : on montre les règles
      saveProfile({ rulesSeen: true });
      this.scene.start('Rules');
      return;
    }
    const gift = claimDailyGift(); // cadeau du jour, une fois par jour
    const profile = loadProfile();
    this.chef = profile.chef;
    this.unlocked = profile.unlocked;
    this.owned = profile.owned;
    this.world = worldUnlocked(profile.world, this.unlocked, this.owned) ? profile.world : 'clairiere';
    if (landscapeWanted()) {
      this.createLandscape(profile, gift);
      return;
    }

    this.bg = this.add.image(0, 0, 'map_' + this.world).setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.72).setOrigin(0);

    const title = txt(this, W / 2, 50, 'BISTRO\nDONJON', 32, '#ffc533').setOrigin(0.5);
    title.setStroke('#7a2a12', 6);
    this.tweens.add({ targets: title, y: 53, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const lvl = playerLevel(profile.earned);
    txt(this, W / 2, 100, `NIVEAU ${lvl.level}   PIECES : ${profile.coins}   RECORD : ${profile.best}`, 8, '#bfc8e0').setOrigin(0.5);
    // barre de progression vers le niveau suivant
    const xp = this.add.graphics();
    xp.fillStyle(0x1b1b2b).fillRect(80, 108, 200, 6);
    xp.fillStyle(0x4fb8ff).fillRect(81, 109, Math.round((198 * lvl.into) / lvl.span), 4);

    // --- Chefs
    txt(this, W / 2, 124, 'CHOISIS TON CHEF', 8, '#8fe0ff').setOrigin(0.5);
    CHEF_ORDER.forEach((id, i) => {
      const x = 70 + i * 110;
      this.add.rectangle(x, 166, 52, 56, 0x1b1b2b);
      this.add
        .image(x, 166, 'portrait_' + id)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.chef = id;
          audio.sfx('clic');
          this.refresh();
        });
    });
    this.info = txt(this, W / 2, 204, '').setOrigin(0.5, 0);
    this.stats = this.add.graphics();
    ['VIE', 'VITESSE', 'DEGATS'].forEach((s, i) => txt(this, 96, 250 + i * 14, s, 8, '#bfc8e0'));

    // --- Mondes
    txt(this, W / 2, 304, 'CHOISIS TON MONDE', 8, '#8fe0ff').setOrigin(0.5);
    this.worldPage = Math.floor(WORLD_ORDER.indexOf(this.world) / 4);
    this.worldObjs = [];
    this.pageBtn = txt(this, W - 6, 304, '', 8, '#ffc533').setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.pageBtn.on('pointerdown', () => this.setWorldPage(this.worldPage === 0 ? 1 : 0));
    // Glisser le doigt vers la gauche ou la droite sur les cartes change de page (comme un carrousel)
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.some((o) => (o as Phaser.GameObjects.Image).depth >= 3000)) return; // une fenêtre est ouverte par-dessus
      const dx = (p.x - p.downX) / RES; // le canvas est RES fois plus fin que la page
      const downY = p.downY / RES;
      if (downY < 312 || downY > 462 || Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(p.y - p.downY) / RES) return;
      this.setWorldPage(this.worldPage + (dx < 0 ? 1 : -1));
    });
    this.drawWorlds();
    this.worldInfo = txt(this, W / 2, 464, '').setOrigin(0.5, 0);
    this.frame = this.add.graphics();

    // --- Boutons
    const pick = () => saveProfile({ chef: this.chef, world: this.world });
    button(this, 92, 512, 168, 36, 'JOUER SOLO', 0xe8642a, () => {
      pick();
      this.scene.start('Game', { chef: this.chef, world: this.world, mode: 'solo' });
    });
    button(this, 268, 512, 168, 36, 'DUEL', 0xb03a5a, () => {
      pick();
      this.scene.start('Duel', { chef: this.chef, world: this.world });
    });
    const run = loadRun();
    const cont = button(this, 92, 554, 168, 32, run ? `CONTINUER (V.${Math.min(run.wave + 1, 4)})` : 'CONTINUER', 0x3d7a4a, () => {
      if (run) this.scene.start('Game', { chef: run.chef, world: run.world, mode: 'solo', resume: run });
    });
    if (!run) cont.setAlpha(0.4);
    button(this, 268, 554, 168, 32, 'BOUTIQUE', 0xc98a1e, () => this.scene.start('Shop'));
    button(this, 92, 596, 168, 30, 'REGLES DU JEU', 0x4a4f66, () => this.scene.start('Rules'));
    button(this, 268, 596, 168, 30, 'MON COMPTE', 0x4a4f66, () => this.scene.start('Account'));

    const son = () => (audio.muted ? 'SON : NON' : 'SON : OUI');
    const mute = txt(this, W - 6, 6, son(), 8, '#bfc8e0').setOrigin(1, 0).setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => {
      audio.toggleMute();
      mute.setText(son());
      audio.sfx('clic');
    });
    audio.music('menu');
    this.refresh();
    this.missionsButton();
    txt(this, 6, 6, `V ${BUILD_LABEL}`, 8, '#6b7391'); // date de la version chargée : pour vérifier d'un coup d'œil qu'on est à jour
    this.welcome(gift);
    portraitMenu(this, () => saveProfile({ chef: this.chef, world: this.world }));
  }

  /** Message « menu ouvert » (mise à jour), proposition d'installation et cadeau du jour. */
  private welcome(gift: ReturnType<typeof claimDailyGift>): void {
    this.game.events.emit('menu');
    // Proposer d'installer le jeu sur l'écran d'accueil (seulement dans Chrome, pas dans l'appli déjà installée)
    // (après le cadeau du jour s'il y en a un, pour ne pas empiler deux fenêtres)
    let giftOpen = !!gift;
    const offer = () => !giftOpen && this.scene.isActive() && this.offerInstall();
    offer();
    this.game.events.on('installable', offer);
    this.events.once('shutdown', () => this.game.events.off('installable', offer));
    if (gift) {
      const tomorrow = DAILY_GIFT[Math.min(gift.streak + 1, DAILY_GIFT.length) - 1];
      const lines = [`Jour ${gift.streak} d'affilée : +${gift.coins} pièces !`, `Reviens demain : +${tomorrow} pièces.`];
      for (const g of gift.gifts) lines.push(`Cadeau débloqué : ${itemLabel(g)} !`);
      audio.sfx('cadeau');
      openModal(this, 'CADEAU DU JOUR', [{
        label: 'MERCI !', color: 0xe8642a,
        action: () => {
          giftOpen = false;
          this.time.delayedCall(80, offer);
        },
      }], lines.join('\n'));
    }
  }

  // ------------------------------------------------------------------ paysage (maquette validée par Rudy le 12/11)
  private mode: 'solo' | 'duel' = 'solo';

  /** Écran titre en paysage, façon jeu mobile : menu à gauche, chef en grand au centre, monde et JOUER à droite. */
  private createLandscape(profile: ReturnType<typeof loadProfile>, gift: ReturnType<typeof claimDailyGift>): void {
    const { w, h } = landscapeMenu(this, () => saveProfile({ chef: this.chef, world: this.world }));
    this.bg = this.add.image(w / 2, h / 2, 'map_' + this.world).setScale(w / W);
    this.add.rectangle(0, 0, w, h, 0x0c0c18, 0.62).setOrigin(0);

    // barre du haut : niveau, titre, pièces, son
    this.add.rectangle(0, 0, w, 30, 0x0c0c18, 0.88).setOrigin(0);
    this.add.rectangle(0, 30, w, 2, 0x3a3f55).setOrigin(0);
    const lvl = playerLevel(profile.earned);
    this.add.rectangle(8, 6, 24, 18, 0x4fb8ff).setOrigin(0).setStrokeStyle(2, 0x1b1b2b);
    txt(this, 20, 15, String(lvl.level), 8, '#0c0c18').setOrigin(0.5);
    txt(this, 38, 7, `NIVEAU ${lvl.level}`, 8, '#bfc8e0');
    const xp = this.add.graphics();
    xp.fillStyle(0x1b1b2b).fillRect(38, 18, 110, 5);
    xp.fillStyle(0x4fb8ff).fillRect(38, 18, Math.round((110 * lvl.into) / lvl.span), 5);
    txt(this, w / 2, 16, 'BISTRO DONJON', 16, '#ffc533').setOrigin(0.5).setStroke('#7a2a12', 4);
    this.add.image(w - 150, 15, 'piece');
    txt(this, w - 138, 15, String(profile.coins), 8, '#ffd23e').setOrigin(0, 0.5);
    const son = () => (audio.muted ? 'SON : NON' : 'SON : OUI');
    const sb = button(this, w - 40, 15, 70, 20, son(), 0x3a3f55, () => {
      audio.toggleMute();
      (sb.getAt(1) as Phaser.GameObjects.Text).setText(son());
      audio.sfx('clic');
    });

    // menu de gauche
    const st = missionsStatus();
    const mb = button(this, 67, 61, 118, 30, `MISSIONS ${st.done}/3`, st.claimable ? 0x3d7a4a : 0x3d5c8f, () => this.openMissions());
    if (st.claimable) this.tweens.add({ targets: mb, scale: 1.06, duration: 450, yoyo: true, repeat: -1 });
    button(this, 67, 97, 118, 30, 'BOUTIQUE', 0xc98a1e, () => this.scene.start('Shop'));
    button(this, 67, 133, 118, 30, 'MON COMPTE', 0x4a4f66, () => this.scene.start('Account'));
    button(this, 67, 169, 118, 30, 'REGLES', 0x4a4f66, () => this.scene.start('Rules'));
    txt(this, 6, h - 12, `V ${BUILD_LABEL}`, 8, '#6b7391');
    txt(this, 6, h - 30, `RECORD : ${profile.best}`, 8, '#bfc8e0');

    // à droite : le monde, le mode et JOUER
    const px = w - 246;
    this.add.rectangle(px, 44, 238, 150, 0x14141f, 0.8).setOrigin(0).setStrokeStyle(2, 0x3a3f55);
    button(this, px + 116, 168, 28, 24, '<', 0x3a3f55, () => this.stepWorld(-1));
    button(this, px + 222, 168, 28, 24, '>', 0x3a3f55, () => this.stepWorld(1));
    const play = button(this, px + 119, 264, 238, 44, 'JOUER', 0xe8642a, () => this.playLandscape());
    (play.getAt(1) as Phaser.GameObjects.Text).setFontSize(16);
    const run = loadRun();
    const cont = button(this, px + 119, 308, 238, 26, run ? `CONTINUER (V.${Math.min(run.wave + 1, 4)})` : 'CONTINUER', 0x3d7a4a, () => {
      if (run) this.scene.start('Game', { chef: run.chef, world: run.world, mode: 'solo', resume: run });
    });
    if (!run) cont.setAlpha(0.4);
    audio.music('menu');
    this.drawLandscape();
    this.welcome(gift);
  }

  /** Partie qui change sur l'écran paysage : chef choisi, monde choisi, mode. */
  private drawLandscape(): void {
    this.worldObjs.forEach((o) => o.destroy());
    this.worldObjs = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.worldObjs.push(o), o);
    const w = this.scale.width / MENU_SCALE;
    const p = loadProfile();
    const c = CHEFS[this.chef];
    const wd = WORLDS[this.world];
    this.bg.setTexture('map_' + this.world);

    // chef en grand au centre
    const cx = Math.round((132 + (w - 252)) / 2);
    const glow = add(this.add.graphics());
    glow.fillStyle(0xffc533, 0.18).fillEllipse(cx, 236, 190, 26);
    const skin = p.skins[this.chef];
    // le chef en grand : dessin haute définition (ou le costume équipé, agrandi en nombre entier)
    const worn = skin && p.owned.includes(skin) ? skin : null;
    const img = add(this.add.image(cx, 240, worn ?? 'hd_' + this.chef).setOrigin(0.5, 1));
    img.setScale(worn ? Math.max(1, Math.floor(Math.min(3, 190 / img.width, 160 / img.height))) : Math.min(190 / img.width, 150 / img.height));
    add(txt(this, cx, 250, c.name, 8, '#ffc533').setOrigin(0.5, 0));
    add(txt(this, cx, 264, `${c.weapon}\n${c.ultimateName}`, 8, '#bfc8e0').setOrigin(0.5, 0).setAlign('center'));
    CHEF_ORDER.forEach((id, i) => {
      const x = cx + (i - 1) * 58;
      const pt = add(this.add.image(x, 322, 'hdp_' + id).setDisplaySize(34, 38).setInteractive({ useHandCursor: true }));
      pt.on('pointerdown', () => {
        this.chef = id;
        audio.sfx('clic');
        this.drawLandscape();
      });
      if (id === this.chef) add(this.add.graphics()).lineStyle(2, 0xffc533).strokeRect(x - 18, 322 - 20, 36, 40);
    });

    // monde
    const px = w - 246;
    const i = WORLD_ORDER.indexOf(this.world);
    const locked = !worldUnlocked(this.world, this.unlocked, this.owned);
    add(txt(this, px + 10, 52, `MONDE ${i + 1} / ${WORLD_ORDER.length}`, 8, '#8fe0ff'));
    const th = add(this.add.image(px + 10, 66, 'map_' + this.world).setOrigin(0).setScale(68 / W));
    if (locked) {
      th.setTint(0x333344);
      add(this.add.image(px + 44, 126, 'cadenas'));
    }
    add(this.add.graphics()).lineStyle(2, locked ? 0x6b7391 : 0xffc533).strokeRect(px + 9, 65, 70, 123);
    add(txt(this, px + 88, 70, wd.name, 8, '#ffc533').setWordWrapWidth(144));
    const why = i < FREE_WORLDS ? `Termine d'abord le monde ${i}` : 'A débloquer : BOUTIQUE > PACKS';
    add(txt(this, px + 88, 96, locked ? why : wd.hint, 8, locked ? '#ff9d8a' : '#bfc8e0').setWordWrapWidth(144).setLineSpacing(3));

    // mode
    const modeBtn = (x: number, m: 'solo' | 'duel', label: string, color: number) => {
      add(button(this, x, 218, 116, 26, label, color, () => {
        this.mode = m;
        audio.sfx('clic');
        this.drawLandscape();
      }));
      if (this.mode === m) add(this.add.graphics()).lineStyle(2, 0xffc533).strokeRect(x - 60, 218 - 15, 120, 30);
    };
    modeBtn(px + 59, 'solo', 'SOLO', 0xe8642a);
    modeBtn(px + 179, 'duel', 'DUEL', 0xb03a5a);
  }

  private stepWorld(d: number): void {
    const n = WORLD_ORDER.length;
    this.world = WORLD_ORDER[(WORLD_ORDER.indexOf(this.world) + d + n) % n];
    audio.sfx('clic');
    this.drawLandscape();
  }

  private playLandscape(): void {
    if (!worldUnlocked(this.world, this.unlocked, this.owned)) {
      audio.sfx('parti');
      return;
    }
    saveProfile({ chef: this.chef, world: this.world });
    if (this.mode === 'duel') this.scene.start('Duel', { chef: this.chef, world: this.world });
    else this.scene.start('Game', { chef: this.chef, world: this.world, mode: 'solo' });
  }


  /** Bouton des missions du jour, en haut à gauche (clignote quand une récompense attend). */
  private missionsButton(): void {
    const st = missionsStatus();
    const b = button(this, 40, 34, 72, 22, 'MISSIONS', st.claimable ? 0x3d7a4a : 0x3d5c8f, () => this.openMissions());
    txt(this, 40, 54, `${st.done}/3`, 8, st.claimable ? '#7dff7d' : '#bfc8e0').setOrigin(0.5, 0);
    if (st.claimable) this.tweens.add({ targets: b, scale: 1.08, duration: 450, yoyo: true, repeat: -1 });
  }

  /** Fenêtre des missions du jour : progression, récompenses à récupérer, bonus. */
  private openMissions(): void {
    const m = dailyMissions();
    const items = m.list.map((it, i) => {
      const def = MISSIONS[it.id];
      return {
        label: () => {
          const cur = dailyMissions().list[i];
          if (cur.claimed) return `${def.label} : OK`;
          if (cur.progress >= def.target) return `${def.label} +${def.reward}`;
          return `${def.label} ${Math.min(cur.progress, def.target)}/${def.target}`;
        },
        color: it.progress >= def.target && !it.claimed ? 0x3d7a4a : 0x4a4f66,
        action: () => {
          if (claimMission(i)) audio.sfx('piece');
          return false;
        },
      };
    });
    const bonus = {
      label: () => {
        const cur = dailyMissions();
        return cur.bonus ? 'BONUS : OK' : `BONUS 3 MISSIONS +${MISSION_BONUS}`;
      },
      color: 0xc98a1e,
      action: () => {
        if (claimBonus()) audio.sfx('legendaire');
        return false;
      },
    };
    openModal(this, 'MISSIONS DU JOUR', [...items, bonus, { label: 'FERMER', action: () => void this.scene.restart() }],
      "Appuie sur une mission terminée pour\nrécupérer ses pièces. Nouvelles\nmissions chaque jour !");
  }

  /** Change de page de mondes (bouton ou glissement du doigt), avec un petit glissement des cartes. */
  private setWorldPage(page: number): void {
    const last = Math.ceil(WORLD_ORDER.length / 4) - 1;
    const next = Phaser.Math.Clamp(page, 0, last);
    if (next === this.worldPage) return;
    const dir = next > this.worldPage ? 1 : -1;
    this.worldPage = next;
    audio.sfx('clic');
    this.drawWorlds();
    this.refresh();
    for (const o of this.worldObjs as unknown as Phaser.GameObjects.Image[]) {
      const x = o.x;
      o.setX(x + dir * 70).setAlpha(0);
      this.tweens.add({ targets: o, x, alpha: 1, duration: 170, ease: 'Cubic.out' });
    }
  }

  /** Dessine les 4 mondes de la page courante (vignette, cadenas, numéro). */
  private drawWorlds(): void {
    this.worldObjs.forEach((o) => o.destroy());
    this.worldObjs = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.worldObjs.push(o), o);
    const first = this.worldPage * 4;
    this.pageBtn.setText(this.worldPage === 0 ? `MONDES ${first + 5}-${first + 8} >` : '< MONDES 1-4');
    WORLD_ORDER.slice(first, first + 4).forEach((id, k) => {
      const i = first + k;
      const x = 51 + k * 86;
      const locked = !worldUnlocked(id, this.unlocked, this.owned);
      const img = add(this.add.image(x, 378, 'map_' + id).setScale(0.2));
      if (locked) {
        img.setTint(0x333344);
        add(this.add.image(x, 378, 'cadenas'));
      }
      img.setInteractive({ useHandCursor: true }).on('pointerup', (p: Phaser.Input.Pointer) => {
        if (Math.abs(p.x - p.downX) / RES > 12) return; // c'était un glissement, pas un appui
        audio.sfx(locked ? 'parti' : 'clic');
        if (locked) this.worldInfo.setText(`${WORLDS[id].name}\n${i < FREE_WORLDS ? `Termine d'abord le monde ${i}` : 'A débloquer : BOUTIQUE > PACKS'}`);
        else {
          this.world = id;
          this.refresh();
        }
      });
      add(txt(this, x, 450, String(i + 1)).setOrigin(0.5));
    });
  }

  /** Propose une fois par ouverture d'installer le jeu comme une appli (icône, plein écran, mises à jour toutes seules). */
  private offerInstall(): void {
    const prompt = this.registry.get('installPrompt') as { prompt: () => Promise<unknown> } | undefined;
    if (!prompt || this.registry.get('installAsked')) return;
    this.registry.set('installAsked', true);
    openModal(this, 'INSTALLER LE JEU', [
      { label: 'INSTALLER', color: 0xe8642a, action: () => void prompt.prompt().catch(() => {}) },
      { label: 'PLUS TARD', action: () => {} },
    ], "Ajoute Bistro Donjon à ton écran\nd'accueil : une icône, le plein\nécran, et les mises à jour se font\ntoutes seules.");
  }

  private refresh(): void {
    const c = CHEFS[this.chef];
    const w = WORLDS[this.world];
    this.bg.setTexture('map_' + this.world);
    this.info.setText(`${c.name}\n${c.weapon}\n${c.ultimateName}`);
    this.worldInfo.setText(`${w.name}\n${w.hint}`);

    this.stats.clear();
    [c.stats.vie, c.stats.vitesse, c.stats.degats].forEach((v, row) => {
      for (let i = 0; i < 5; i++) {
        this.stats.fillStyle(i < v ? 0xffc533 : 0x3a3f55).fillRect(176 + i * 14, 250 + row * 14, 10, 8);
      }
    });

    const ci = CHEF_ORDER.indexOf(this.chef);
    const wi = WORLD_ORDER.indexOf(this.world);
    this.frame.clear().lineStyle(2, 0xffc533);
    this.frame.strokeRect(70 + ci * 110 - 27, 166 - 29, 54, 58);
    if (Math.floor(wi / 4) === this.worldPage) this.frame.strokeRect(51 + (wi % 4) * 86 - 37, 378 - 65, 74, 130);
  }
}
