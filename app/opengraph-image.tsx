import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { SITE_NAME } from "@/lib/site";

export const alt = `${profile.name}, ${profile.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card: the name emerging from a misty highland dusk, as on arrival. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(180deg, #9fb3c2 0%, #5d6b5a 62%, #2a2320 100%)",
          color: "#f3efe4",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "48px 56px",
            borderRadius: 28,
            background: "rgba(13, 14, 19, 0.86)",
            maxWidth: 920,
          }}
        >
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: "#e3c98e" }}>
            {profile.headline}
          </div>
          <div style={{ fontSize: 76, marginTop: 18, lineHeight: 1.05 }}>{profile.name}</div>
          <div style={{ fontSize: 30, marginTop: 22, color: "#cbc5b6" }}>
            {`${profile.role} at ${profile.organisation.name} · ${profile.location}`}
          </div>
          <div style={{ fontSize: 28, marginTop: 30, color: "#f3efe4" }}>{profile.tagline}</div>
        </div>
        <div style={{ marginTop: 34, fontSize: 24, color: "#cbc5b6", letterSpacing: 2 }}>{SITE_NAME}</div>
      </div>
    ),
    size,
  );
}
