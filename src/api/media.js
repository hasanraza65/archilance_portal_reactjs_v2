// Ported verbatim from archilance_portal_reactjs/src/pages/utility/apiHelper.js.
// Two SEPARATE cutoff/host schemes exist on the live backend — do not merge them.

// Profile pics / screenshots: cutoff 2026-06-14, old host is the legacy portal.
const MEDIA_CUTOFF = new Date("2026-06-14T00:00:00Z");
const OLD_STORAGE_BASE = "https://portal.archilance.net/backend/public";

export function getMediaUrl(path, createdAt = null) {
  if (!path) return null;
  const str = String(path);
  if (str.startsWith("http://") || str.startsWith("https://")) return str;
  const cleanPath = str.replace(/^\/+/, "");
  const base =
    createdAt && new Date(createdAt) >= MEDIA_CUTOFF
      ? import.meta.env.VITE_BACKEND_BASE_URL
      : OLD_STORAGE_BASE;
  return `${base}/storage/${cleanPath}`;
}

// Task / comment / brief attachments: a DIFFERENT cutoff (2026-01-10) and a
// DIFFERENT new-host scheme (OneDrive proxy route, not /storage/).
const ATTACHMENT_CUTOFF = new Date("2026-01-10T00:00:00.000Z");

export function getAttachmentUrl(filePath, createdAt = null) {
  if (!filePath) return null;
  const str = String(filePath);
  if (str.startsWith("http://") || str.startsWith("https://")) return str;
  const cleanPath = str.replace(/^\/+/, "");
  const base = import.meta.env.VITE_BACKEND_BASE_URL;
  if (createdAt && new Date(createdAt) >= ATTACHMENT_CUTOFF) {
    // NOT url-encoded — matches the live backend's actual query parsing (v1 parity).
    return `${base}/onedrive-image?path=${cleanPath}`;
  }
  return `${base}/storage/${cleanPath}`;
}
