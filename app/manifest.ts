import type { MetadataRoute } from "next";

/**
 * Native App Router manifest (Next 16 renders this at `/manifest.webmanifest`
 * — see `proxy.ts`'s matcher exclusion for that exact path). Icon `src`
 * values point at the generated routes from `app/icon.tsx`
 * (`generateImageMetadata` there produces `/icon/192` and `/icon/512`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Everyday List",
    short_name: "Everyday List",
    description: "A calm, offline-first daily task list.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfcfa",
    theme_color: "#2f6690",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
