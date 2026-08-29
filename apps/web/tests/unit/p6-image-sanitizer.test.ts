import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  sanitizeIngredientImage,
  sniffImageMediaType,
} from "../../lib/submissions/image-sanitizer";

const options = {
  maxInputBytes: 2_000_000,
  maxOutputBytes: 500_000,
  maxOutputDimension: 320,
};

describe("Phase 6 image sanitizer", () => {
  it("sniffs bytes instead of trusting the declared file type", async () => {
    const png = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: "white",
      },
    })
      .png()
      .toBuffer();

    expect(sniffImageMediaType(png)).toBe("image/png");
    expect(sniffImageMediaType(Buffer.from("not an image"))).toBeNull();
  });

  it("rotates, bounds dimensions, converts to JPEG, and proves metadata removal", async () => {
    const source = await sharp({
      create: {
        width: 800,
        height: 400,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const sanitized = await sanitizeIngredientImage(source, options);
    const metadata = await sharp(sanitized.buffer).metadata();

    expect(sanitized.rawMediaType).toBe("image/jpeg");
    expect(sanitized.sanitizedMediaType).toBe("image/jpeg");
    expect(Math.max(sanitized.width, sanitized.height)).toBeLessThanOrEqual(320);
    expect(sanitized.exifStripped).toBe(true);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(sanitized.rawSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(sanitized.sanitizedSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    ["empty", Buffer.alloc(0), "EMPTY_IMAGE"],
    ["unsupported", Buffer.from("GIF89a"), "UNSUPPORTED_IMAGE_TYPE"],
    [
      "oversized",
      Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(40)]),
      "RAW_IMAGE_TOO_LARGE",
    ],
  ])("rejects %s input with a safe code", async (_label, input, code) => {
    await expect(
      sanitizeIngredientImage(input, {
        ...options,
        maxInputBytes: code === "RAW_IMAGE_TOO_LARGE" ? 20 : options.maxInputBytes,
      }),
    ).rejects.toMatchObject({ code });
  });
});
