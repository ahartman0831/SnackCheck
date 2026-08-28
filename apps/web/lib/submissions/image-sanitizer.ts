import { createHash } from "node:crypto";
import sharp from "sharp";

export const SANITIZER_VERSION = "sharp-jpeg-v1";

export type ImageSanitizerFailureCode =
  | "EMPTY_IMAGE"
  | "RAW_IMAGE_TOO_LARGE"
  | "UNSUPPORTED_IMAGE_TYPE"
  | "MALFORMED_IMAGE"
  | "ANIMATED_IMAGE"
  | "IMAGE_DIMENSIONS_UNSAFE"
  | "SANITIZED_IMAGE_TOO_LARGE"
  | "METADATA_STRIP_FAILED";

export class ImageSanitizerError extends Error {
  constructor(
    public readonly code: ImageSanitizerFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "ImageSanitizerError";
  }
}

type SanitizeImageOptions = {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxOutputDimension: number;
  maxInputPixels?: number;
};

export type SanitizedIngredientImage = {
  buffer: Buffer;
  rawSha256: string;
  sanitizedSha256: string;
  rawMediaType: "image/jpeg" | "image/png" | "image/webp";
  sanitizedMediaType: "image/jpeg";
  byteSize: number;
  width: number;
  height: number;
  exifStripped: true;
  sanitizerVersion: typeof SANITIZER_VERSION;
};

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sniffImageMediaType(
  input: Buffer,
): SanitizedIngredientImage["rawMediaType"] | null {
  if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    input.length >= 8 &&
    input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (
    input.length >= 12 &&
    input.subarray(0, 4).toString("ascii") === "RIFF" &&
    input.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function sanitizeIngredientImage(
  input: Buffer,
  options: SanitizeImageOptions,
): Promise<SanitizedIngredientImage> {
  if (input.length === 0) {
    throw new ImageSanitizerError("EMPTY_IMAGE", "The uploaded image is empty.");
  }
  if (input.length > options.maxInputBytes) {
    throw new ImageSanitizerError(
      "RAW_IMAGE_TOO_LARGE",
      "The uploaded image exceeds the byte limit.",
    );
  }

  const rawMediaType = sniffImageMediaType(input);
  if (!rawMediaType) {
    throw new ImageSanitizerError(
      "UNSUPPORTED_IMAGE_TYPE",
      "The uploaded file is not an approved image type.",
    );
  }

  const maxInputPixels = options.maxInputPixels ?? 40_000_000;
  let source: sharp.Sharp;
  let metadata: sharp.Metadata;
  try {
    source = sharp(input, {
      failOn: "error",
      limitInputPixels: maxInputPixels,
      sequentialRead: true,
    });
    metadata = await source.metadata();
  } catch {
    throw new ImageSanitizerError(
      "MALFORMED_IMAGE",
      "The uploaded image could not be decoded safely.",
    );
  }

  if ((metadata.pages ?? 1) > 1) {
    throw new ImageSanitizerError(
      "ANIMATED_IMAGE",
      "Animated or multi-page images are not accepted.",
    );
  }
  if (!metadata.width || !metadata.height) {
    throw new ImageSanitizerError(
      "IMAGE_DIMENSIONS_UNSAFE",
      "The uploaded image dimensions are unavailable.",
    );
  }

  let output: Buffer;
  let info: sharp.OutputInfo;
  try {
    const result = await source
      .rotate()
      .resize({
        width: options.maxOutputDimension,
        height: options.maxOutputDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    output = result.data;
    info = result.info;
  } catch {
    throw new ImageSanitizerError(
      "MALFORMED_IMAGE",
      "The uploaded image could not be sanitized.",
    );
  }

  if (output.length > options.maxOutputBytes) {
    throw new ImageSanitizerError(
      "SANITIZED_IMAGE_TOO_LARGE",
      "The sanitized image exceeds the byte limit.",
    );
  }

  const outputMetadata = await sharp(output).metadata();
  if (outputMetadata.exif || outputMetadata.xmp || outputMetadata.iptc) {
    throw new ImageSanitizerError(
      "METADATA_STRIP_FAILED",
      "The sanitized image still contains metadata.",
    );
  }

  return {
    buffer: output,
    rawSha256: sha256(input),
    sanitizedSha256: sha256(output),
    rawMediaType,
    sanitizedMediaType: "image/jpeg",
    byteSize: output.length,
    width: info.width,
    height: info.height,
    exifStripped: true,
    sanitizerVersion: SANITIZER_VERSION,
  };
}
