/** Palettes any sprite may be drawn in, whatever its own palette is. */
import { solid } from '../design/tokens';
import { pal } from '../palette';

/** The one-frame white flash when something is hit. */
export const FLASH_PAL = solid('white');
/** Silhouettes: locked portraits and unfound manual pages. */
export const SILHOUETTE_PAL = solid('darkGrey');
/** A black shape against a bright sky: lightning strikes and story silhouettes. */
export const SHADOW_PAL = pal('black', 'black', 'darkGrey');

/** Every palette above: the registry accepts these for any sprite. */
export const UNIVERSAL_PALETTES = [FLASH_PAL, SILHOUETTE_PAL, SHADOW_PAL];
