"use client";

/**
 * Browser-side barcode decoding.
 *
 * Two engines, tried in order:
 *  1. The native BarcodeDetector API (Chrome, Android WebView, Edge) — fastest
 *     and needs no download.
 *  2. zxing-wasm, loaded on demand, which covers Safari and Firefox.
 *
 * If neither is usable the caller falls back to typing the number, so the flow
 * never dead-ends on an unsupported browser.
 */

export interface DecodedBarcode {
  value: string;
  format: string;
}

const FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
  "data_matrix",
] as const;

type NativeDetector = {
  detect: (source: CanvasImageSource | Blob) => Promise<Array<{ rawValue: string; format: string }>>;
};

let nativeDetector: NativeDetector | null | undefined;

async function getNativeDetector(): Promise<NativeDetector | null> {
  if (nativeDetector !== undefined) return nativeDetector;

  const Ctor = (globalThis as any).BarcodeDetector;
  if (!Ctor) {
    nativeDetector = null;
    return null;
  }

  try {
    const supported: string[] = (await Ctor.getSupportedFormats?.()) ?? [];
    const formats = FORMATS.filter((f) => !supported.length || supported.includes(f));
    nativeDetector = new Ctor(formats.length ? { formats } : undefined) as NativeDetector;
  } catch {
    nativeDetector = null;
  }
  return nativeDetector;
}

let zxingReader: ((data: ImageData) => Promise<DecodedBarcode[]>) | null | undefined;

async function getZxingReader() {
  if (zxingReader !== undefined) return zxingReader;
  try {
    const mod: any = await import("zxing-wasm/reader");

    // Serve the decoder's WebAssembly from this app, not from a CDN.
    //
    // Left to itself, zxing-wasm fetches the binary from jsDelivr on first
    // use. iOS Safari has no native BarcodeDetector, so zxing is the only
    // decoder there — meaning barcode scanning on iPhone silently did nothing
    // whenever that CDN wasn't reachable, and it quietly contradicted the
    // promise that this app doesn't phone anywhere. scripts/ensure-wasm.mjs
    // puts the file in public/zxing for us.
    mod.setZXingModuleOverrides({
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? `/zxing/${path}` : prefix + path,
    });

    // Actually instantiate the module rather than assuming it will work.
    // Importing the JS succeeds even when the WebAssembly behind it can't
    // load, and the failure only surfaces on the first decode — which made
    // "is a decoder available?" answer yes when it wasn't, and the scanner
    // then blamed the photo for a problem the photo never had.
    //
    // This only runs where zxing is genuinely needed: browsers with a native
    // BarcodeDetector never reach here.
    await mod.getZXingModule();

    zxingReader = async (imageData: ImageData) => {
      const results = await mod.readBarcodesFromImageData(imageData, {
        tryHarder: true,
        formats: ["EAN-13", "EAN-8", "UPC-A", "UPC-E", "Code128", "Code39", "ITF", "QRCode", "DataMatrix"],
        maxNumberOfSymbols: 1,
      });
      return (results ?? [])
        .filter((r: any) => r.isValid !== false && r.text)
        .map((r: any) => ({ value: String(r.text), format: String(r.format ?? "unknown") }));
    };
  } catch {
    // The wasm bundle couldn't be fetched (offline, or blocked). Not fatal.
    zxingReader = null;
  }
  return zxingReader;
}

export async function decoderAvailable(): Promise<boolean> {
  if (await getNativeDetector()) return true;
  return Boolean(await getZxingReader());
}

/**
 * Why scanning can't run, if it can't.
 *
 * "insecure" is the common one in practice: the live camera needs a secure
 * page, so opening the app over a plain http:// address on a local IP fails
 * here even though everything else works. Worth naming exactly, because the
 * remedy is completely different from "try a better photo".
 */
export type ScanBlocker = "none" | "insecure" | "no-decoder" | "no-camera";

export async function cameraBlocker(): Promise<ScanBlocker> {
  if (typeof window === "undefined") return "no-camera";
  if (!(await decoderAvailable())) return "no-decoder";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "no-camera";
  return "none";
}

/** Try to read a code from a video frame or an image. */
export async function decodeFrom(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<DecodedBarcode | null> {
  const native = await getNativeDetector();
  if (native) {
    try {
      const results = await native.detect(source as CanvasImageSource);
      const hit = results.find((r) => r.rawValue?.trim());
      if (hit) return { value: hit.rawValue.trim(), format: hit.format };
      // Native detector ran and found nothing — no need to also run zxing.
      return null;
    } catch {
      // Fall through to zxing on a detector error.
    }
  }

  const reader = await getZxingReader();
  if (!reader) return null;

  const imageData = toImageData(source);
  if (!imageData) return null;

  try {
    const results = await reader(imageData);
    return results[0] ?? null;
  } catch {
    return null;
  }
}

function toImageData(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): ImageData | null {
  const width =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth
        : source.width;
  const height =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight
        : source.height;

  if (!width || !height) return null;

  // Cap the working size: barcodes decode fine at this resolution and it keeps
  // per-frame work small enough for a phone.
  const scale = Math.min(1, 1000 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

/** A plausible retail barcode — used to validate typed input. */
export function looksLikeBarcode(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 14;
}
