import { ImageResponse } from "next/og";

export const contentType = "image/png";

/** Matches `app/manifest.ts`'s icon `sizes` — 192 for the home-screen icon, 512 for splash/store contexts. */
const ICON_SIZES = [192, 512] as const;

export function generateImageMetadata() {
  return ICON_SIZES.map((pixels) => ({
    id: String(pixels),
    size: { width: pixels, height: pixels },
    contentType,
  }));
}

/** Brand accent — matches `--primary` (oklch(0.53 0.13 224)) converted to sRGB for `next/og`, which can't render `oklch()`. */
const BRAND_BLUE = "#2f6690";
const ON_BRAND = "#fdfcfa";

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const pixels = Number(await id) || 192;

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
        <svg
          width={pixels * 0.56}
          height={pixels * 0.56}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
    { width: pixels, height: pixels },
  );
}
