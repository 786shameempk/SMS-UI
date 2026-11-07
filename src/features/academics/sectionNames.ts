/**
 * Turns what was typed in the "Section names" box into the list of sections to create:
 * "A, B, C" -> ["A", "B", "C"]. Commas, semicolons and new lines separate names; blanks are dropped and a name typed twice
 * (ignoring case) is kept once. A single name with spaces ("Section A") stays one name.
 */
export const MAX_SECTIONS_AT_ONCE = 26;

export function parseSectionNames(input: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of input.split(/[,;\n]+/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}
