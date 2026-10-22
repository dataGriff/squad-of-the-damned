/**
 * Readability check (#64): text against the surfaces it sits on, gameplay
 * sprites against each night's backdrop and ground, and backdrops kept
 * quieter than gameplay. See src/game/design/readability.ts for the rules.
 */
import { BACKDROP_MAX, READABLE_SHARE, WARN_SHARE, readableResults, sceneryResults, spriteResults, textResults } from '../src/game/design/readability';

const failures: string[] = [];
const warnings: string[] = [];

const text = textResults();
for (const t of text) if (t.ratio < t.min) failures.push(`text: ${t.what} (${t.colour}) on ${t.on} is ${t.ratio.toFixed(2)}:1, needs ${t.min}:1`);

const sprites = spriteResults();
const readable = readableResults(sprites);
for (const r of readable) {
  const pct = `${Math.round(r.readable * 100)}%`;
  const lost = r.lostOn.length ? `; lost on ${r.lostOn.join(' ')}` : '';
  if (r.readable < READABLE_SHARE) failures.push(`sprite: ${r.entry} stands out from ${pct} of the ${r.theme} background, needs ${READABLE_SHARE * 100}%${lost}`);
  else if (r.readable < WARN_SHARE) warnings.push(`${r.entry} on ${r.theme}: ${pct}${lost}`);
}

const scenery = sceneryResults(sprites);
for (const s of scenery) if (s.backdrop >= BACKDROP_MAX) failures.push(`scenery: the ${s.theme} backdrop has a ${s.backdrop.toFixed(2)}:1 edge, must stay under ${BACKDROP_MAX}:1`);

if (warnings.length) {
  console.log(`Readability warnings (stand out from under ${WARN_SHARE * 100}% of the background):`);
  for (const w of warnings) console.log('  ' + w);
}
if (failures.length) {
  console.error(`Readability check FAILED (${failures.length}):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(
  `Readability check OK: ${text.length} text/surface pairs, ${readable.length} gameplay sprite/night pairs, ${scenery.length} backdrops ` +
    `(busiest ${Math.max(...scenery.map((s) => s.backdrop)).toFixed(2)}:1, under ${BACKDROP_MAX}:1).`,
);
