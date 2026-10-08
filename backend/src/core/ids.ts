const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export interface Ids {
  /** Primary keys. */
  id(): string;
  /** Unguessable public slugs for `/q/:slug` (22 chars of base62, ~131 bits). */
  slug(): string;
}

export const ids: Ids = {
  id: () => crypto.randomUUID(),
  slug: () => randomBase62(22),
};

export function randomBase62(length: number): string {
  let out = '';
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      // 248 = 62 * 4: drop the top values so every character is equally likely.
      if (byte < 248 && out.length < length) out += BASE62[byte % 62];
    }
  }
  return out;
}
