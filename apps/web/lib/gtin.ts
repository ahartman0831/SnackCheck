const SUPPORTED_LENGTHS = new Set([8, 12, 13, 14]);

export type GtinFormat = "UPC_A" | "UPC_E" | "EAN_8" | "EAN_13" | "GTIN_14";

export interface NormalizedGtin {
  raw: string;
  digits: string;
  gtin14: string;
  format: GtinFormat;
}

function checkDigit(body: string): number {
  const padded = body.padStart(13, "0");
  let sum = 0;
  for (let index = 0; index < 13; index += 1) {
    const digit = Number(padded[index]);
    sum += index % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

export function expandUpcE(upcE: string): string | null {
  if (!/^\d{8}$/.test(upcE)) {
    return null;
  }
  const numberSystem = upcE[0] ?? "0";
  const d = upcE.slice(1, 7);
  const last = d[5] ?? "";
  let manufacturer: string;
  let item: string;
  if (last === "0" || last === "1" || last === "2") {
    manufacturer = `${d.slice(0, 2)}${last}00`;
    item = `00${d.slice(2, 5)}`;
  } else if (last === "3") {
    manufacturer = `${d.slice(0, 3)}00`;
    item = `000${d.slice(3, 5)}`;
  } else if (last === "4") {
    manufacturer = `${d.slice(0, 4)}0`;
    item = `0000${d[4] ?? ""}`;
  } else {
    manufacturer = d.slice(0, 5);
    item = `0000${last}`;
  }
  const body = `${numberSystem}${manufacturer}${item}`;
  return `${body}${checkDigit(body)}`;
}

export function normalizeGtin(rawInput: string): NormalizedGtin | { error: string } {
  const raw = rawInput.trim();
  const digits = raw.replace(/\D/g, "");
  if (digits !== raw.replace(/[\s-]/g, "")) {
    return { error: "Barcode must be numeric." };
  }
  if (!SUPPORTED_LENGTHS.has(digits.length)) {
    return { error: "Supported barcodes are UPC-A, UPC-E, EAN-8, and EAN-13." };
  }

  let expanded = digits;
  let format: GtinFormat;
  if (digits.length === 8 && digits.startsWith("0")) {
    const upcA = expandUpcE(digits);
    if (!upcA) {
      return { error: "That UPC-E could not be expanded." };
    }
    expanded = upcA;
    format = "UPC_E";
  } else if (digits.length === 8) {
    format = "EAN_8";
  } else if (digits.length === 12) {
    format = "UPC_A";
  } else if (digits.length === 13) {
    format = "EAN_13";
  } else {
    format = "GTIN_14";
  }

  const gtin14 = expanded.padStart(14, "0");
  const expected = checkDigit(gtin14.slice(0, 13));
  if (Number(gtin14[13]) !== expected) {
    return {
      error:
        "That barcode check digit is invalid. Try scanning again or enter it manually.",
    };
  }

  return { raw, digits, gtin14, format };
}
