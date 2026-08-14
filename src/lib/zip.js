/**
 * Minimal, dependency-free ZIP writer — STORE mode (no compression).
 *
 * Why hand-rolled instead of JSZip: the only thing this app ever archives is a
 * folder of PDFs, and a PDF is already compressed internally (Flate object
 * streams wrapping JPEG images). Deflating one a second time saves ~1-2% and
 * costs seconds of main-thread time per file, so STORE is the correct mode
 * whatever library is used — and at STORE the format is ~100 lines, which isn't
 * worth a dependency and an `npm install` on a deploy box.
 *
 * Deliberately NOT ZIP64, which caps an archive at 4 GB and 65,535 entries.
 * Both limits are checked and throw a plain-English error rather than letting a
 * silently corrupt archive reach the user.
 *
 * Entry payloads are handed to the final Blob as Blobs, not as one giant
 * concatenated Uint8Array, so the browser can spill a large export to disk
 * instead of pinning all of it in the JS heap.
 */

/* CRC-32 (IEEE), which ZIP requires per entry. */
const CRC_TABLE = /* @__PURE__ */ (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

const CRC_CHUNK = 1 << 20; // 1 MiB per slice
const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * CRC-32 over a whole buffer, yielding between slices so checksumming a 20 MB
 * PDF can't freeze the very progress bar that is reporting it.
 */
async function crc32(bytes) {
  let c = 0xffffffff;
  for (let start = 0; start < bytes.length; start += CRC_CHUNK) {
    const end = Math.min(start + CRC_CHUNK, bytes.length);
    for (let i = start; i < end; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    if (end < bytes.length) await yieldToBrowser();
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Fixed-size little-endian record builder — every ZIP field is LE. */
class Record {
  constructor(size) {
    this.bytes = new Uint8Array(size);
    this.view = new DataView(this.bytes.buffer);
    this.at = 0;
  }
  u16(v) { this.view.setUint16(this.at, v & 0xffff, true); this.at += 2; return this; }
  u32(v) { this.view.setUint32(this.at, v >>> 0, true); this.at += 4; return this; }
  raw(arr) { this.bytes.set(arr, this.at); this.at += arr.length; return this; }
}

/** MS-DOS packed date/time. The format cannot express anything before 1980. */
function dosStamp(date) {
  const year = date.getFullYear();
  if (year < 1980) return { time: 0, date: (1 << 5) | 1 };
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

// The path separators plus the characters Windows rejects outright. A name
// carrying any of these can fail to extract, or escape its intended folder.
const ILLEGAL = /[<>:"/\\|?*]/g;

/** Control codes are dropped by code point rather than by a regex range, which
 *  keeps this file free of control-character escapes (and of the eslint rule
 *  that exists to catch them being written by accident). */
const stripControls = (str) =>
  Array.from(str).filter((ch) => ch.codePointAt(0) >= 32).join("");

/**
 * Turns free text (an employee's name) into something safe to use as a file
 * name on every platform. Keeps spaces — they're legal, and far more readable
 * than dashes in a document a person is going to open.
 */
export function safeFileName(name, fallback = "file") {
  const cleaned = stripControls(String(name ?? ""))
    .replace(ILLEGAL, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")      // a leading dot hides the file on unix
    .replace(/[. ]+$/, "");   // Windows silently strips these, corrupting the name
  return cleaned.slice(0, 120) || fallback;
}

/**
 * Builds a ZIP archive.
 *
 * @param {Array<{name: string, data: Blob|Uint8Array|ArrayBuffer, date?: Date}>} entries
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function makeZip(entries, onProgress) {
  if (entries.length > 0xffff) {
    throw new Error(`A ZIP file can hold ${0xffff} entries; this export has ${entries.length}.`);
  }

  const encoder = new TextEncoder();
  const parts = [];        // Blob | Uint8Array, in archive order
  const directory = [];    // central-directory records, written after the data
  let offset = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const nameBytes = encoder.encode(entry.name);

    const raw = entry.data;
    const isBlob = typeof Blob !== "undefined" && raw instanceof Blob;
    const bytes =
      raw instanceof Uint8Array ? raw
        : raw instanceof ArrayBuffer ? new Uint8Array(raw)
          : new Uint8Array(await raw.arrayBuffer());

    const checksum = await crc32(bytes);
    const { time, date } = dosStamp(entry.date || new Date());
    // Bit 11 marks the name as UTF-8. Pure ASCII is valid UTF-8, so this is
    // always safe and keeps accented names intact on extraction.
    const flags = 0x0800;

    const local = new Record(30 + nameBytes.length);
    local.u32(0x04034b50).u16(20).u16(flags).u16(0)   // store
      .u16(time).u16(date)
      .u32(checksum).u32(bytes.length).u32(bytes.length)
      .u16(nameBytes.length).u16(0)
      .raw(nameBytes);

    const central = new Record(46 + nameBytes.length);
    central.u32(0x02014b50).u16(20).u16(20).u16(flags).u16(0)
      .u16(time).u16(date)
      .u32(checksum).u32(bytes.length).u32(bytes.length)
      .u16(nameBytes.length).u16(0).u16(0)             // extra, comment
      .u16(0).u16(0).u32(0)                            // disk, attrs
      .u32(offset)
      .raw(nameBytes);
    directory.push(central.bytes);

    parts.push(local.bytes);
    // Reuse the caller's Blob rather than wrapping the bytes in a second one:
    // for an archive of ~150 MB of PDFs, re-wrapping would hold two full copies
    // at once. Only non-Blob input needs a Blob made for it, and either way the
    // `bytes` view above becomes collectable on the next iteration.
    parts.push(isBlob ? raw : new Blob([bytes]));

    offset += local.bytes.length + bytes.length;
    if (offset > 0xffffffff) {
      throw new Error("This export is over the 4 GB ZIP limit — narrow the date range or select fewer people.");
    }
    onProgress?.(i + 1, entries.length);
  }

  const directorySize = directory.reduce((sum, rec) => sum + rec.length, 0);
  const end = new Record(22);
  end.u32(0x06054b50).u16(0).u16(0)
    .u16(entries.length).u16(entries.length)
    .u32(directorySize).u32(offset)
    .u16(0);

  return new Blob([...parts, ...directory, end.bytes], { type: "application/zip" });
}

/** Hands a Blob to the browser as a download, then releases the object URL. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously can cancel the download in Safari/Firefox; one turn
  // of the event loop is enough for the navigation to have been queued.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
