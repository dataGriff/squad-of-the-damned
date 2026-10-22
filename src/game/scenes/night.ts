/**
 * A night (#31, #33, #28): loads the level, runs the world, handles the boss
 * arena, checkpoints, lives/continue, the finale timer and the demo autopilot.
 */
import { Camera } from '../../engine/camera';
import { Particles } from '../../engine/particles';
import { TileMap, type MapObject } from '../../engine/tilemap';
import type { Renderer } from '../../engine/render';
import { SCREEN_H, SCREEN_W, TILE } from '../../engine/constants';
import { audio } from '../../engine/audio';
import { Game, type Scene } from './scene';
import { LEVEL_JSON } from '../levels';
import type { NightDef } from '../levels/nights';
import { World, type Entity } from '../world';
import { Player } from '../player';
import { Squad, type KidId } from '../squad';
import { spawnObject, Sluice, Portal, Seal, Lamp, Exit } from '../objects';
import { spawnEnemy, Bat } from '../enemies/fodder';
import { spawnBoss } from '../bosses';
import type { Boss } from '../bosses/base';
import { tileSprite, type Theme } from '../art/tiles';
import { drawBackdrop, drawForeground, Storm } from '../backdrop';
import { placeProps, type PlacedProp } from '../dressing';
import { maskAt } from '../art/autotiles';
import { hash2 } from '../../engine/pixelart';
import { SONGS } from '../music';
import { drawHud } from '../hud';
import { PAGE_BY_ID } from '../manual';
import { GameOverScene, HubScene, PauseScene, WinScene } from './ui';
import { StoryScene } from './story';
import { CHAPTERS, afterChapter } from '../story';

export interface NightOpts {
  demo?: boolean;
}

interface ArenaDef {
  x: number;
  y: number;
  w: number;
  h: number;
  boss: string;
  bossX: number;
  bossY: number;
  started: boolean;
  cleared: boolean;
}

export class NightScene implements Scene {
  private map!: TileMap;
  private world!: World;
  private player!: Player;
  private camera = new Camera();
  private particles = new Particles();
  private squad!: Squad;
  private arenas: ArenaDef[] = [];
  private boss: Boss | null = null;
  private lives = 3;
  private checkpoint = -1;
  private state: 'intro' | 'play' | 'dying' | 'cleared' | 'midnight' = 'intro';
  private stateT = 0;
  private timer: number | null = null;
  private pagePopup: string | null = null;
  private popupT = 0;
  private theme: Theme = 'suburb';
  private demoSrc: Set<import('../../engine/input').Action> | null = null;
  private demoT = 0;
  private drainT = -1;
  private portalSpawn = 0;
  private id: string;
  heatmap = false;
  private props: PlacedProp[] = [];
  /** Lightning over the graveyard and the storm drain (#54). */
  private storm = new Storm();

  constructor(private game: Game, private night: NightDef | null, private opts: NightOpts = {}) {
    this.id = night ? night.id : 'finale';
    this.load();
  }

  private load(): void {
    const json = LEVEL_JSON[this.id];
    this.map = new TileMap(json);
    this.theme = this.map.theme as Theme;
    this.props = placeProps(this.map, this.theme);
    const save = this.game.save.data;
    const kids = save.kidsUnlocked as KidId[];
    this.squad = new Squad(kids, Math.max(save.silver, 3), this.squad?.active);
    this.particles = new Particles();
    this.particles.reduced = save.options.reducedFlash;
    this.camera = new Camera();
    this.camera.reducedMotion = save.options.reducedFlash;
    this.camera.bounds = { x: 0, y: 0, w: this.map.pixelWidth, h: Math.max(SCREEN_H, this.map.pixelHeight) };
    this.world = new World(this.map, this.camera, this.particles, this.squad, this.game.save, this.game.input, this.events(), this.id);
    const start = this.map.objectsOfType('player')[0];
    const lamps = this.map.objectsOfType('lamp');
    let sx = start ? start.x : 32;
    let sy = start ? start.y + start.h : 200;
    if (this.checkpoint >= 0) {
      const lamp = lamps.find((l) => Number(l.props.index ?? l.id) === this.checkpoint);
      if (lamp) {
        sx = lamp.x;
        sy = lamp.y + lamp.h;
      }
    }
    this.player = new Player(sx, sy, this.squad.kid);
    this.player.worldRef = this.world;
    this.player.holdToJump = save.options.holdToJump;
    this.player.reducedFlash = save.options.reducedFlash;
    this.world.player = this.player;
    this.world.add(this.player);
    this.arenas = [];
    this.boss = null;
    this.world.bossActive = null;
    for (const o of this.map.objects) this.spawn(o);
    for (const a of this.arenas) this.camera.lockZones.push({ x: a.x, y: a.y, w: a.w, h: a.h });
    // mark already-lit lamps
    for (const l of this.world.all<Lamp>('lamp')) if (l.index <= this.checkpoint) l.lit = true;
    // the Gill arena's water surface (row 10); only the boss and the drain care
    if (this.map.props.water) this.world.waterLevel = (this.map.height - 5) * TILE;
    this.camera.snapTo(this.player.centerX, this.player.centerY, 1);
    this.timer = this.map.props.timer ? Number(this.map.props.timer) : null;
    this.state = 'intro';
    this.stateT = 0;
    this.drainT = -1;
    this.game.renderer.fader.start(0.3);
    if (this.opts.demo && !this.demoSrc) this.demoSrc = this.game.input.addSource();
  }

  private spawn(o: MapObject): void {
    if (o.type === 'player') return;
    if (o.type === 'arena') {
      const bossObj = this.map.objects.find((b) => b.type === 'boss' && b.x >= o.x && b.x < o.x + o.w);
      this.arenas.push({ x: o.x, y: o.y, w: o.w, h: o.h, boss: String(o.props.boss ?? 'none'), bossX: bossObj ? bossObj.x : o.x + o.w / 2, bossY: bossObj ? bossObj.y + bossObj.h : o.y + 208, started: false, cleared: false });
      return;
    }
    if (o.type === 'boss') return;
    const enemy = spawnEnemy(o.type, o.x, o.y);
    if (enemy) {
      this.world.add(enemy);
      return;
    }
    const obj = spawnObject(o, this.night?.page ?? 'vampire');
    if (obj) {
      // pages already collected don't respawn
      if (obj.kind === 'page' && this.game.save.hasPage((obj as unknown as { pageId: string }).pageId)) return;
      this.world.add(obj);
    }
  }

  private events() {
    return {
      onPlayerDeath: () => {
        this.state = 'dying';
        this.stateT = 0;
      },
      onLevelComplete: () => {
        this.state = 'cleared';
        this.stateT = 0;
        audio.playSong(SONGS.win);
        if (this.night) this.game.save.clearNight(this.night.number);
        this.game.save.data.silver = this.squad.silver;
        this.game.save.save();
      },
      onBossDefeated: (_id: string) => {
        this.world.bossActive = null;
        for (const a of this.arenas) if (a.started && !a.cleared) {
          a.cleared = true;
          this.setArenaWalls(a, false);
        }
        this.boss = null;
        this.camera.lockZones = [];
        audio.playSong(SONGS[this.night?.song ?? 'finale']);
      },
      onPage: (id: string) => {
        if (this.game.save.addPage(id)) {
          this.pagePopup = PAGE_BY_ID[id]?.creature ?? id;
          this.popupT = 3;
        }
      },
      onCheckpoint: (index: number) => {
        this.checkpoint = index;
        this.squad.heal(6);
        this.game.save.data.checkpoints[this.id] = index;
        this.game.save.data.silver = this.squad.silver;
        this.game.save.save();
      },
      onSeal: (count: number, total: number) => {
        if (count >= total) {
          const portal = this.world.find<Portal>('portal');
          if (portal) {
            portal.closing = 2;
            audio.play('portal');
            this.camera.shake(4, 1);
          }
          this.state = 'cleared';
          this.stateT = 0;
        }
      },
    };
  }

  private setArenaWalls(a: ArenaDef, closed: boolean): void {
    const tx0 = Math.floor(a.x / TILE);
    const tx1 = tx0 + Math.floor(a.w / TILE) - 1;
    for (const ty of [11, 12]) {
      for (const tx of [tx0, tx1]) {
        if (this.map.kindAt(tx, ty) === 'solid' && !closed) this.map.setTile(tx, ty, 0);
        else if (closed) this.map.setTile(tx, ty, 14);
        this.particles.burst(tx * TILE + 8, ty * TILE + 8, '#bcbcbc', 4, 50);
      }
    }
  }

  enter(): void {
    audio.playSong(SONGS[this.night?.song ?? 'finale']);
  }
  exit(): void {
    if (this.demoSrc) this.demoSrc.clear();
  }

  private quitToHub(): void {
    this.game.save.data.silver = this.squad.silver;
    this.game.save.save();
    this.game.replace(new HubScene(this.game));
  }

  update(dt: number): void {
    const input = this.game.input;
    if (this.opts.demo) {
      if (this.game.idle === 0 && this.demoT > 0.5) {
        // any real key ends the demo
        this.game.pop();
        return;
      }
      this.drive(dt);
    }
    this.stateT += dt;
    if (this.popupT > 0) this.popupT -= dt;
    switch (this.state) {
      case 'intro':
        if (this.stateT > 2 || input.pressed('menu')) this.state = 'play';
        this.player.update(this.world, 0);
        return;
      case 'dying':
        this.world.particles.update(dt);
        if (this.stateT > 1.6) {
          if (this.opts.demo && this.lives === 0) {
            this.game.pop(); // attract mode never shows the game-over menu
            return;
          }
          if (this.lives > 0) {
            this.lives--;
            this.load();
          } else {
            this.game.push(new GameOverScene(this.game, () => {
              this.lives = 3;
              this.load();
              this.game.pop();
              audio.playSong(SONGS[this.night?.song ?? 'finale']);
            }));
            this.state = 'intro';
            this.stateT = 0;
          }
        }
        return;
      case 'cleared':
        this.world.update(dt);
        this.camera.update(this.player.centerX, this.player.centerY, this.player.facing, dt);
        if (this.stateT > 3.5) {
          // the after-night chapter (or the ending) plays once (#57)
          const ch = afterChapter(this.night ? this.night.number : null);
          const next = () => (this.night ? this.quitToHub() : this.game.replace(new WinScene(this.game)));
          if (ch && !this.game.save.data.storySeen.includes(ch)) {
            this.game.save.data.silver = this.squad.silver;
            this.game.replace(new StoryScene(this.game, [CHAPTERS[ch]], next));
          } else next();
        }
        return;
      case 'midnight':
        if (this.stateT > 2.5) {
          this.timer = Number(this.map.props.timer);
          this.load();
          this.state = 'play';
        }
        return;
    }
    if (input.pressed('pause') && !this.opts.demo) {
      audio.play('menu');
      this.game.push(new PauseScene(this.game, () => this.quitToHub()));
      return;
    }
    // boss arena trigger
    for (const a of this.arenas) {
      if (!a.started && a.boss !== 'none' && this.player.centerX > a.x + 24 && this.player.centerX < a.x + a.w && this.player.centerY > a.y && this.player.centerY < a.y + a.h) {
        a.started = true;
        this.boss = spawnBoss(a.boss, a.bossX, a.bossY);
        if (this.boss) {
          this.boss.arenaX = a.x;
          this.boss.arenaW = a.w;
          (this.boss as unknown as { arenaTop: number }).arenaTop = a.y;
          this.world.add(this.boss);
          this.world.bossActive = a.boss;
          this.setArenaWalls(a, true);
          audio.playSong(SONGS.boss);
          audio.play('roar');
          this.camera.shake(3, 0.4);
        }
      }
    }
    if (this.timer !== null) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'midnight';
        this.stateT = 0;
        audio.play('die');
        return;
      }
      if (this.timer < 10 && Math.floor(this.timer) !== Math.floor(this.timer + dt)) audio.play('tick');
    }
    // finale: portal breathes out bats
    const portal = this.world.find<Portal>('portal');
    if (portal && portal.closing <= 0) {
      this.portalSpawn -= dt;
      if (this.portalSpawn <= 0 && this.world.all<Bat>('enemy').length < 4) {
        this.portalSpawn = 4;
        this.world.add(new Bat(portal.x + 8, portal.y + 16));
      }
    }
    // night 5: drain the arena once the sluice is broken
    const sluice = this.world.find<Sluice>('sluice');
    if (sluice?.broken && this.drainT < 0) this.drainT = 0;
    if (this.drainT >= 0 && this.drainT < 4) {
      this.drainT += dt;
      const rowsDrained = Math.floor(this.drainT);
      const top = this.map.height - 5; // water rows start here
      for (let r = 0; r < rowsDrained && r < 3; r++) for (let tx = 0; tx < this.map.width; tx++) if (this.map.kindAt(tx, top + r) === 'water') this.map.setTile(tx, top + r, 0);
      this.world.waterLevel = rowsDrained >= 3 ? null : (top + rowsDrained) * TILE;
    }
    this.world.update(dt);
    this.camera.update(this.player.centerX, this.player.centerY, this.player.facing, dt);
    if (this.theme === 'graveyard' || this.theme === 'drain') {
      const s = this.storm.update(dt);
      if (s.thunder) audio.play('thunder');
    }
  }

  /** Attract-mode autopilot (#44): walk right, hop over things, shoot now and then. */
  private drive(dt: number): void {
    const s = this.demoSrc!;
    this.demoT += dt;
    s.clear();
    if (this.state !== 'play') {
      if (this.state === 'intro') s.add('menu');
      return;
    }
    const p = this.player;
    const map = this.map;
    s.add('right');
    const aheadX = p.x + p.w + 6;
    const wall = map.rectSolid(aheadX, p.y + 2, 4, p.h - 4) || this.world.all('crate').some((c) => c.x > p.x && c.x < p.x + 24);
    const gap = !map.rectSolid(aheadX, p.y + p.h + 2, 4, 8) && !map.rectHas(aheadX, p.y + p.h, 4, 8, 'oneway');
    const enemyNear = this.world.all('enemy').some((e) => Math.abs(e.x - p.x) < 60 && e.x > p.x);
    if ((wall || gap) && p.onGround) s.add('jump');
    if (enemyNear && Math.floor(this.demoT * 4) % 2 === 0) s.add('action');
    if (Math.floor(this.demoT) % 7 === 0 && this.demoT % 1 < dt * 2) s.add('swap');
    if (this.demoT > 40) {
      this.game.pop();
    }
  }

  draw(r: Renderer, alpha: number): void {
    const cam = this.camera.offset(alpha);
    const stormy = this.theme === 'graveyard' || this.theme === 'drain';
    drawBackdrop(r, this.theme, cam.x, this.world.time, stormy ? this.storm.state(this.game.save.data.options.reducedFlash) : 'none');
    // tiles
    const frame = Math.floor(this.world.time * 3);
    const kindAt = (x: number, y: number) => this.map.kindAt(x, y);
    const tx0 = Math.max(0, Math.floor(cam.x / TILE));
    const ty0 = Math.max(0, Math.floor(cam.y / TILE));
    const tx1 = Math.min(this.map.width - 1, tx0 + SCREEN_W / TILE + 1);
    const ty1 = Math.min(this.map.height - 1, ty0 + SCREEN_H / TILE + 1);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const gid = this.map.gidAt(tx, ty);
        if (!gid) continue;
        const mask = gid <= 8 || gid === 14 ? maskAt(kindAt, tx, ty, this.map.height) : 0;
        const t = tileSprite(gid, this.theme, frame, mask, Math.floor(hash2(tx, ty) * 4));
        if (t) r.sprite(t.sprite, t.pal, tx * TILE - cam.x, ty * TILE - cam.y);
      }
    }
    // props stand on the floor behind everyone (#55)
    for (const pp of this.props) {
      const x = pp.x - cam.x;
      if (x > -32 && x < SCREEN_W) r.sprite(pp.prop.sprite, pp.prop.pal, x, pp.y - cam.y);
    }
    // entities by layer
    const ents = [...this.world.entities].sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));
    for (const e of ents) if (!e.dead || e === (this.player as Entity)) e.draw(r, cam.x, cam.y, alpha);
    this.particles.draw((x, y, w, h, c) => r.rect(x, y, w, h, c), cam.x, cam.y);
    drawForeground(r, this.theme, cam.x, this.world.time);
    if (this.heatmap) this.drawHeatmap(r, cam.x, cam.y);
    // hit / swap flash
    if (this.world.flash > 0) r.dither(0, 0, SCREEN_W, SCREEN_H, this.world.flashColour, this.world.flash & 1);
    drawHud(r, this.squad, this.timer, this.pagePopup, this.popupT);
    if (this.boss) this.boss.drawHud(r);
    r.textShadow(`LIVES ${this.lives}`, 180, 228, '#fcfcfc');
    if (this.opts.demo) r.textCentered('DEMO - PRESS ANY KEY', 228, Math.floor(this.world.time * 2) % 2 ? '#fcfcfc' : '#7c7c7c');
    switch (this.state) {
      case 'intro':
        r.box(8, 96, SCREEN_W - 16, 40, '#000000');
        r.textCentered(this.night ? this.night.title : 'MIDNIGHT: CLOSE THE PORTAL', 108, '#f8d878');
        r.textCentered(this.night ? `KIDS NEEDED: ${this.night.requiredKids.length}+` : 'EVERY KID. EVERY SEAL. 90 SECONDS.', 120, '#bcbcbc');
        break;
      case 'cleared':
        r.box(24, 96, SCREEN_W - 48, 32, '#000000');
        r.textCentered(this.night ? 'NIGHT CLEARED!' : 'THE PORTAL IS CLOSED!', 108, '#f8d878');
        break;
      case 'midnight':
        r.box(24, 96, SCREEN_W - 48, 32, '#000000');
        r.textCentered('MIDNIGHT. THE PORTAL OPENS.', 108, '#e40058');
        break;
      case 'dying':
        if (this.stateT > 0.8) r.textCentered(this.lives > 0 ? 'OUCH.' : 'THE SQUAD IS DOWN', 108, '#e40058');
        break;
    }
  }

  /** Death heatmap overlay (#48), toggled with F3. */
  private drawHeatmap(r: Renderer, cx: number, cy: number): void {
    const deaths = this.game.save.data.deaths.filter((d) => d.night === this.id);
    const cells = new Map<string, number>();
    for (const d of deaths) {
      const k = `${Math.floor(d.x / TILE)},${Math.floor(d.y / TILE)}`;
      cells.set(k, (cells.get(k) ?? 0) + 1);
    }
    const max = Math.max(1, ...cells.values());
    for (const [k, n] of cells) {
      const [tx, ty] = k.split(',').map(Number);
      r.ctx.globalAlpha = 0.3 + 0.6 * (n / max);
      r.rect(tx * TILE - cx, ty * TILE - cy, TILE, TILE, n / max > 0.6 ? '#e40058' : '#f8b800');
    }
    r.ctx.globalAlpha = 1;
    r.text(`DEATHS: ${deaths.length}`, 4, 20, '#e40058');
  }

  /** Exposed for the smoke test. */
  get debug() {
    return { world: this.world, player: this.player, state: this.state, boss: this.boss, map: this.map, lives: this.lives };
  }
  get exitObj(): Exit | undefined {
    return this.world.find<Exit>('exit');
  }
  get seals(): Seal[] {
    return this.world.all<Seal>('seal');
  }
}
