/**
 * Each product keeps one colour everywhere on the dashboard (colour follows the entity).
 * These are slots from the reference categorical palette, dark-surface steps, and the
 * five pass the validator's lightness, chroma, adjacent-CVD, normal-vision and 3:1
 * contrast gates on the #1a1a19 card surface in this stacking order.
 */
export const APP_COLORS: Record<string, string> = {
  wonderhome: "#199e70",
  wonderjobs: "#9085e9",
  wondercreator: "#d55181",
  wonderark: "#3987e5",
  wonderid: "#d95926",
};
export const appColor = (slug: string) => APP_COLORS[slug] ?? "#3987e5";
