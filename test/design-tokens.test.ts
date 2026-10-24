import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MASTER_PALETTE } from '../src/game/palette';
import { TOKENS, hex, solid } from '../src/game/design/tokens';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('colour tokens (#59)', () => {
  it('no raw hex colours outside the master palette module', () => {
    const offenders: string[] = [];
    for (const file of sources('src')) {
      if (file.endsWith(join('game', 'palette.ts'))) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/['"`]#[0-9a-fA-F]{3,8}['"`]/.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders, 'use a token from src/game/design/tokens.ts or a palette name').toEqual([]);
  });

  it('every token names a master palette colour and no token shadows a palette name', () => {
    for (const [token, name] of Object.entries(TOKENS)) {
      expect(MASTER_PALETTE[name], token).toBeTruthy();
      expect(token in MASTER_PALETTE, `${token} is also a palette name`).toBe(false);
    }
  });

  it('resolves tokens, palette names and master hex, and rejects anything else', () => {
    expect(hex('text')).toBe(MASTER_PALETTE.white);
    expect(hex('navy')).toBe(MASTER_PALETTE.navy);
    expect(hex(MASTER_PALETTE.cyan)).toBe(MASTER_PALETTE.cyan);
    expect(() => hex('#123456' as never)).toThrow(/Unknown colour/);
    expect(() => hex('chartreuse' as never)).toThrow(/Unknown colour/);
    expect(solid('danger')).toEqual([null, MASTER_PALETTE.red, MASTER_PALETTE.red, MASTER_PALETTE.red]);
  });
});
