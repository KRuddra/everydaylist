import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Same brand mark as `app/icon.tsx`, at Apple's canonical touch-icon size (no transparency — iOS applies its own mask/corners). */
const BRAND_BLUE = "#2f6690";
const ON_BRAND = "#fdfcfa";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_BLUE,
        }}
      >
        <svg width={100} height={100} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 12.5l5 5L20 7"
            stroke={ON_BRAND}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
