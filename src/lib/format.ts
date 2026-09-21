/** "anthropic/claude-opus-5" <-> "anthropic--claude-opus-5" so model ids work as URL segments. */
export const modelSlug = (id: string) => id.replace("/", "--");
export const fromSlug = (slug: string) => slug.replace("--", "/");

export const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "n/a" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
