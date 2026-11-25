export const MAX_TAGS_PER_APPLICATION = 10;
export const MAX_TAG_LENGTH = 40;

export function cleanTagName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTagName(value: string) {
  return cleanTagName(value).normalize("NFKC").toLocaleLowerCase("fr");
}

export function tagColors(name: string) {
  let hash = 2166136261;
  for (const character of normalizeTagName(name)) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  const hue = (hash >>> 0) % 360;
  return { backgroundColor: `hsl(${hue}, 70%, 94%)`, color: `hsl(${hue}, 60%, 28%)` };
}
