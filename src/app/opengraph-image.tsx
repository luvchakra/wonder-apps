import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "WonderApps — Ideas for a brighter tomorrow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const mark = await readFile(path.join(process.cwd(), "public/brands/wonderapps/mark.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #050507 0%, #0b0b14 55%, #14102a 100%)",
        color: "#f5f5f7",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <img src={markSrc} width={96} height={65} alt="" />
        <div style={{ display: "flex", fontSize: 40, letterSpacing: -1.5 }}>
          <span style={{ fontWeight: 700 }}>Wonder</span>
          <span style={{ fontWeight: 300 }}>Apps</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -4, lineHeight: 0.98 }}>Four products. One chassis.</div>
        <div style={{ fontSize: 28, color: "#a1a1a6" }}>WonderHome · WonderJobs · WonderArk · WonderID</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          <div style={{ width: 120, height: 4, borderRadius: 2, background: "linear-gradient(90deg, #1ba7fe, #6132fd, #a94ad1, #ff7a45)" }} />
          <div style={{ fontSize: 18, letterSpacing: 5, color: "#86868b" }}>IDEAS FOR A BRIGHTER TOMORROW</div>
        </div>
      </div>
    </div>,
    size,
  );
}
