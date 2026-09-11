/**
 * iOS launch images.
 *
 * Safari has no manifest equivalent for these: it wants one link per device
 * resolution, matched by media query, or you get a blank white screen while the
 * app starts. Next's Metadata API has no field for them, so they're emitted
 * here as plain link tags.
 *
 * Anything not listed simply falls back to the manifest's background colour,
 * which is the same dark brown — so a missing size degrades to a plain screen
 * rather than a white flash.
 */

interface Splash {
  width: number;
  height: number;
  /** Device pixel ratio the media query should match. */
  ratio: number;
}

const SPLASHES: Splash[] = [
  { width: 750, height: 1334, ratio: 2 }, // iPhone SE, 8
  { width: 828, height: 1792, ratio: 2 }, // iPhone XR, 11
  { width: 1125, height: 2436, ratio: 3 }, // iPhone X, XS, 11 Pro
  { width: 1170, height: 2532, ratio: 3 }, // iPhone 12, 13, 14
  { width: 1179, height: 2556, ratio: 3 }, // iPhone 14 Pro, 15, 16
  { width: 1242, height: 2688, ratio: 3 }, // iPhone XS Max, 11 Pro Max
  { width: 1284, height: 2778, ratio: 3 }, // iPhone 12/13 Pro Max, 14 Plus
  { width: 1290, height: 2796, ratio: 3 }, // iPhone 14/15/16 Pro Max
  { width: 1536, height: 2048, ratio: 2 }, // iPad, iPad mini
  { width: 1668, height: 2388, ratio: 2 }, // iPad Pro 11"
  { width: 2048, height: 2732, ratio: 2 }, // iPad Pro 12.9"
];

export function AppleSplashLinks() {
  return (
    <>
      {SPLASHES.map(({ width, height, ratio }) => {
        // Media queries are in CSS pixels, the images in device pixels.
        const cssWidth = width / ratio;
        const cssHeight = height / ratio;
        return (
          <link
            key={`${width}x${height}`}
            rel="apple-touch-startup-image"
            href={`/splash/splash-${width}x${height}.png`}
            media={`(device-width: ${cssWidth}px) and (device-height: ${cssHeight}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`}
          />
        );
      })}
    </>
  );
}
