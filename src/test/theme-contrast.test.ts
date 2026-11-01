import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// OKLab to linear sRGB, followed by WCAG relative luminance. This checks declared
// theme pairs, not every rendered state or image. See CSS Color 4 conversion code.
function luminance(value: string): number {
  const values = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (!values) throw new Error(`Unsupported test color: ${value}`);
  const light = Number(values[1]),
    chroma = Number(values[2]),
    hue = (Number(values[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue),
    b = chroma * Math.sin(hue);
  const l = (light + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (light - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (light - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * blue;
}
const css = readFileSync("src/styles.css", "utf8");
const theme = (selector: string) => {
  const body = css.slice(css.indexOf(`${selector} {`)).split("}")[0]!;
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(oklch\([^;]+\));/g)].map((m) => [m[1], m[2]]),
  );
};
const ratio = (a: string, b: string) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const textPairs = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["warning-foreground", "warning"],
  ["success-foreground", "success"],
  ["lavender-foreground", "lavender"],
];
describe.each([":root", ".dark"])("%s declared theme contrast", (selector) => {
  it.each(textPairs)("keeps %s on %s at AA body-text contrast", (foreground, background) => {
    const colors = theme(selector);
    expect(ratio(colors[foreground]!, colors[background]!)).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps input boundaries distinguishable from page and card backgrounds", () => {
    const colors = theme(selector);
    for (const background of ["background", "card"])
      expect(ratio(colors["input"]!, colors[background]!)).toBeGreaterThanOrEqual(3);
  });
  it("keeps the keyboard focus indicator distinguishable from page and card backgrounds", () => {
    const colors = theme(selector);
    for (const background of ["background", "card"])
      expect(ratio(colors["ring"]!, colors[background]!)).toBeGreaterThanOrEqual(3);
  });
});
