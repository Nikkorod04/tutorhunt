import type { Ionicons } from '@expo/vector-icons';

/**
 * A valid Ionicons glyph name. Components take this rather than `string` so a
 * typo is a compile error instead of a blank square at runtime.
 */
export type IconName = keyof typeof Ionicons.glyphMap;
