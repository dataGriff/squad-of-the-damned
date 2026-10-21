import { TILE } from './constants';

/**
 * Tilemap (#3). Levels are Tiled-format JSON: one tile layer named "tiles", one
 * object group named "objects", and a tileset whose tiles carry a `kind` property.
 * Everything in the game asks the map for tile *kinds*, never raw gids, so any
 * Tiled tileset that labels its tiles with the same kinds will work.
 */
export type TileKind =
  | 'empty'
  | 'solid'
  | 'oneway'
  | 'ladder'
  | 'cracked'
  | 'spike'
  | 'vent'
  | 'water'
  | 'deco';

/** Fixed gid → kind mapping of the core tileset (firstgid = 1). */
export const CORE_TILESET: { kind: TileKind; name: string }[] = [
  { kind: 'solid', name: 'ground' }, // 1
  { kind: 'solid', name: 'fill' }, // 2
  { kind: 'oneway', name: 'platform' }, // 3
  { kind: 'ladder', name: 'ladder' }, // 4
  { kind: 'cracked', name: 'cracked' }, // 5
  { kind: 'spike', name: 'spike' }, // 6
  { kind: 'vent', name: 'vent' }, // 7
  { kind: 'water', name: 'water' }, // 8
  { kind: 'deco', name: 'deco1' }, // 9
  { kind: 'deco', name: 'deco2' }, // 10
  { kind: 'deco', name: 'deco3' }, // 11
  { kind: 'deco', name: 'lamp' }, // 12
  { kind: 'deco', name: 'door' }, // 13
  { kind: 'solid', name: 'pillar' }, // 14
  { kind: 'empty', name: 'bg' }, // 15 (background dressing, no art of its own)
];

export interface TiledProperty {
  name: string;
  type?: string;
  value: string | number | boolean;
}
export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledProperty[];
}
export interface TiledLayer {
  type: 'tilelayer' | 'objectgroup';
  name: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: TiledObject[];
}
export interface TiledTileset {
  firstgid: number;
  name: string;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  tiles?: { id: number; properties?: TiledProperty[] }[];
}
export interface TiledMap {
  type: 'map';
  version: string;
  orientation: 'orthogonal';
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
  properties?: TiledProperty[];
}

export interface MapObject {
  id: number;
  type: string;
  name: string;
  /** Pixel position of the object's top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  props: Record<string, string | number | boolean>;
}

export function propsToRecord(list?: TiledProperty[]): Record<string, string | number | boolean> {
  const r: Record<string, string | number | boolean> = {};
  for (const p of list ?? []) r[p.name] = p.value;
  return r;
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly gids: Uint16Array;
  readonly kinds: TileKind[];
  readonly objects: MapObject[];
  readonly props: Record<string, string | number | boolean>;
  private kindByGid: Map<number, TileKind>;

  constructor(json: TiledMap) {
    if (json.tilewidth !== TILE || json.tileheight !== TILE) {
      throw new Error(`Map must use ${TILE}px tiles`);
    }
    this.width = json.width;
    this.height = json.height;
    this.props = propsToRecord(json.properties);
    this.kindByGid = new Map();
    for (const ts of json.tilesets) {
      for (const t of ts.tiles ?? []) {
        const kind = propsToRecord(t.properties).kind as TileKind | undefined;
        if (kind) this.kindByGid.set(ts.firstgid + t.id, kind);
      }
    }
    const layer = json.layers.find((l) => l.type === 'tilelayer' && l.name === 'tiles');
    if (!layer?.data) throw new Error('Map needs a tile layer named "tiles"');
    if (layer.data.length !== this.width * this.height) throw new Error('Tile layer size mismatch');
    this.gids = Uint16Array.from(layer.data);
    this.kinds = new Array(this.width * this.height);
    for (let i = 0; i < this.gids.length; i++) this.kinds[i] = this.kindOfGid(this.gids[i]);
    const objs = json.layers.find((l) => l.type === 'objectgroup' && l.name === 'objects');
    this.objects = (objs?.objects ?? []).map((o) => ({
      id: o.id,
      type: o.type,
      name: o.name,
      x: o.x,
      y: o.y,
      w: o.width,
      h: o.height,
      props: propsToRecord(o.properties),
    }));
  }

  get theme(): string {
    return String(this.props.theme ?? 'suburb');
  }
  get pixelWidth(): number {
    return this.width * TILE;
  }
  get pixelHeight(): number {
    return this.height * TILE;
  }

  kindOfGid(gid: number): TileKind {
    if (gid === 0) return 'empty';
    return this.kindByGid.get(gid) ?? 'empty';
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  /** Kind at tile coords; outside the map is solid at the sides and empty above/below. */
  kindAt(tx: number, ty: number): TileKind {
    if (tx < 0 || tx >= this.width) return 'solid';
    if (ty < 0 || ty >= this.height) return 'empty';
    return this.kinds[ty * this.width + tx];
  }
  gidAt(tx: number, ty: number): number {
    if (!this.inBounds(tx, ty)) return 0;
    return this.gids[ty * this.width + tx];
  }
  /** Kind at pixel coords. */
  kindAtPx(x: number, y: number): TileKind {
    return this.kindAt(Math.floor(x / TILE), Math.floor(y / TILE));
  }
  setTile(tx: number, ty: number, gid: number): void {
    if (!this.inBounds(tx, ty)) return;
    const i = ty * this.width + tx;
    this.gids[i] = gid;
    this.kinds[i] = this.kindOfGid(gid);
  }
  isSolidKind(k: TileKind, small = false): boolean {
    return k === 'solid' || k === 'cracked' || (k === 'vent' && !small);
  }
  /** True if any solid tile overlaps the pixel rect. */
  rectSolid(x: number, y: number, w: number, h: number, small = false): boolean {
    const x0 = Math.floor(x / TILE);
    const y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 0.001) / TILE);
    const y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) if (this.isSolidKind(this.kindAt(tx, ty), small)) return true;
    return false;
  }
  /** True if any tile of `kind` overlaps the rect. */
  rectHas(x: number, y: number, w: number, h: number, kind: TileKind): boolean {
    const x0 = Math.floor(x / TILE);
    const y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 0.001) / TILE);
    const y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.kindAt(tx, ty) === kind) return true;
    return false;
  }
  objectsOfType(type: string): MapObject[] {
    return this.objects.filter((o) => o.type === type);
  }
}

/** Build the Tiled tileset descriptor the exporter and tests share. */
export function coreTileset(name = 'core'): TiledTileset {
  return {
    firstgid: 1,
    name,
    tilewidth: TILE,
    tileheight: TILE,
    tilecount: CORE_TILESET.length,
    columns: CORE_TILESET.length,
    tiles: CORE_TILESET.map((t, id) => ({
      id,
      properties: [
        { name: 'kind', type: 'string', value: t.kind },
        { name: 'name', type: 'string', value: t.name },
      ],
    })),
  };
}

/* ------------------------------------------------------------------------ */
/* String-row authoring helper: used by the level sources and by tests.      */
/* ------------------------------------------------------------------------ */

export const CHAR_TO_GID: Record<string, number> = {
  '#': 1, // solid (exporter picks ground/fill)
  '-': 3,
  H: 4,
  X: 5,
  '^': 6,
  v: 7,
  '~': 8,
  ',': 9,
  ';': 10,
  '"': 11,
  l: 12,
  D: 13,
  '|': 14,
  '.': 0,
  ' ': 0,
};

/** Characters that place an object (centred on the tile's bottom) rather than a tile. */
export const CHAR_TO_OBJECT: Record<string, { type: string; w: number; h: number }> = {
  P: { type: 'player', w: 16, h: 16 },
  b: { type: 'bat', w: 16, h: 16 },
  r: { type: 'rat', w: 16, h: 16 },
  z: { type: 'hand', w: 16, h: 16 },
  f: { type: 'frog', w: 16, h: 16 },
  M: { type: 'page', w: 16, h: 16 },
  L: { type: 'lamp', w: 16, h: 32 },
  C: { type: 'crate', w: 16, h: 16 },
  S: { type: 'silver', w: 16, h: 16 },
  h: { type: 'heart', w: 16, h: 16 },
  E: { type: 'exit', w: 16, h: 32 },
  B: { type: 'boss', w: 32, h: 32 },
  A: { type: 'arena', w: 256, h: 240 },
  W: { type: 'valve', w: 16, h: 16 },
  T: { type: 'lantern', w: 16, h: 16 },
  G: { type: 'sluice', w: 16, h: 32 },
  Q: { type: 'seal', w: 16, h: 16 },
  O: { type: 'portal', w: 32, h: 48 },
  K: { type: 'secret', w: 16, h: 16 },
  g: { type: 'giant_ally', w: 32, h: 48 },
};

export interface LevelSource {
  id: string;
  theme: string;
  rows: string[];
  /** Extra objects with properties the single-character grammar can't express. */
  objects?: { type: string; tx: number; ty: number; w?: number; h?: number; props?: Record<string, string | number | boolean> }[];
  props?: Record<string, string | number | boolean>;
}

export function levelToTiled(src: LevelSource): TiledMap {
  const height = src.rows.length;
  const width = Math.max(...src.rows.map((r) => r.length));
  const data: number[] = new Array(width * height).fill(0);
  const objects: TiledObject[] = [];
  let nextId = 1;
  const solidAt = (x: number, y: number) => y >= 0 && y < height && (src.rows[y][x] ?? '.') === '#';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = src.rows[y][x] ?? '.';
      if (ch in CHAR_TO_OBJECT) {
        const o = CHAR_TO_OBJECT[ch];
        objects.push({
          id: nextId++,
          name: '',
          type: o.type,
          x: x * TILE + (TILE - o.w) / 2,
          y: (y + 1) * TILE - o.h,
          width: o.w,
          height: o.h,
        });
        continue;
      }
      let gid = CHAR_TO_GID[ch];
      if (gid === undefined) throw new Error(`Unknown level char '${ch}' at ${x},${y} in ${src.id}`);
      if (ch === '#') gid = solidAt(x, y - 1) ? 2 : 1;
      data[y * width + x] = gid;
    }
  }
  for (const o of src.objects ?? []) {
    const w = o.w ?? 16;
    const h = o.h ?? 16;
    objects.push({
      id: nextId++,
      name: '',
      type: o.type,
      x: o.tx * TILE + (TILE - w) / 2,
      y: (o.ty + 1) * TILE - h,
      width: w,
      height: h,
      properties: Object.entries(o.props ?? {}).map(([name, value]) => ({
        name,
        type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string',
        value,
      })),
    });
  }
  return {
    type: 'map',
    version: '1.10',
    orientation: 'orthogonal',
    width,
    height,
    tilewidth: TILE,
    tileheight: TILE,
    properties: [
      { name: 'id', type: 'string', value: src.id },
      { name: 'theme', type: 'string', value: src.theme },
      ...Object.entries(src.props ?? {}).map(([name, value]) => ({
        name,
        type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string',
        value,
      })),
    ],
    layers: [
      { type: 'tilelayer', name: 'tiles', width, height, data },
      { type: 'objectgroup', name: 'objects', objects },
    ],
    tilesets: [coreTileset()],
  };
}
