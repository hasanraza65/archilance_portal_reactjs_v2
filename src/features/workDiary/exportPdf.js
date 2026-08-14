import { getMediaUrl } from "@/api/media";
import { formatDuration } from "@/lib/format";
import { idleSecondsForSession, sessionWorkedSeconds } from "./useWorkDiaryData";

/**
 * Work-diary PDF export.
 *
 * Built directly with jsPDF from the SESSION DATA — deliberately not by
 * rasterising the page with html2canvas, which is what this used to do and had
 * three problems that have no tuning fix:
 *
 *  1. It could only capture what was on screen. A session card is collapsed by
 *     default, so its screenshots aren't in the DOM at all — the export silently
 *     dropped every screenshot except the handful the user had manually expanded.
 *  2. Slicing one tall canvas into A4 pages cuts wherever the page happens to
 *     end, so sessions and screenshot rows were sawn in half across pages.
 *  3. One giant canvas over a month-wide range is slow and memory-hungry, and
 *     every glyph ends up as blurry pixels rather than selectable text.
 *
 * Building from data fixes all three: every screenshot is fetched by URL whether
 * or not its card was ever opened, pages break only between whole blocks, and
 * text stays vector (crisp, searchable, and a fraction of the file size).
 */

const PAGE_MARGIN = 40;
const THUMBS_PER_ROW = 4;
const THUMB_GAP = 10;
const THUMB_RATIO = 0.625;          // h/w of the thumbnail cell
const CAPTION_H = 10;

// Screenshots are re-encoded at this multiple of their printed size before being
// embedded. Full-resolution stills would balloon the file to tens of MB for a
// month of work while printing no better than ~200 DPI.
const RASTER_SCALE = 3;
const JPEG_QUALITY = 0.72;

const MAX_SCREENSHOTS_PER_SESSION = 12;
const MAX_TOTAL_SCREENSHOTS = 400;
const IMAGE_CONCURRENCY = 4;
const IMAGE_TIMEOUT_MS = 6000;

const INK = [17, 24, 39];
const MUTED = [107, 114, 128];
const FAINT = [156, 163, 175];
const LINE = [226, 232, 240];
const BAR_BG = [241, 245, 249];
const BAR_FG = [99, 102, 241];

/* ------------------------------- images ------------------------------- */

/**
 * Loads one screenshot and re-encodes it, already scaled down, as a JPEG data
 * URL. Never rejects: a dead or slow image resolves to null so a single bad
 * screenshot can't stall an export of several hundred.
 */
const loadThumbOnce = (url, boxW, boxH) =>
  new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), IMAGE_TIMEOUT_MS);
    img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(timer);
      try {
        const natW = img.naturalWidth || boxW;
        const natH = img.naturalHeight || boxH;
        // Fit inside the cell instead of stretching to it — a dual-monitor
        // capture is extremely wide and looked squashed when forced to a box.
        const ratio = Math.min(boxW / natW, boxH / natH);
        const w = natW * ratio;
        const h = natH * ratio;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * RASTER_SCALE));
        canvas.height = Math.max(1, Math.round(h * RASTER_SCALE));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        finish({ dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), w, h });
      } catch {
        finish(null); // tainted canvas (CORS) or decode failure
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.src = url;
  });

/**
 * A wide export runs long enough to hit a transient network blip mid-way (wifi
 * reconnect, laptop wake, VPN toggle). Those clear in about a second, so one
 * retry recovers most of them instead of losing the screenshot for good.
 */
const loadThumb = async (url, boxW, boxH) => {
  const first = await loadThumbOnce(url, boxW, boxH);
  if (first) return first;
  await new Promise((r) => setTimeout(r, 800));
  return loadThumbOnce(url, boxW, boxH);
};

/** Small worker pool — caps requests in flight, which is what actually avoids
 *  ERR_INSUFFICIENT_RESOURCES on wide ranges (a total cap alone doesn't). */
const loadThumbs = async (urls, boxW, boxH, onOne) => {
  const out = new Array(urls.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      out[i] = await loadThumb(urls[i], boxW, boxH);
      onOne?.();
    }
  };
  await Promise.all(Array.from({ length: Math.min(IMAGE_CONCURRENCY, urls.length) }, worker));
  return out;
};

/* ------------------------------ formatting ---------------------------- */

// En dash (WinAnsi 0x96). See sessionTimeLabel for why this can't be "→".
const ARROW = "–";

/**
 * jsPDF's built-in fonts speak WinAnsi. A single character outside that set
 * silently promotes the WHOLE string to UTF-16, which those fonts can't render
 * — the line comes out as mojibake rather than as one wrong glyph. Task titles
 * and names are free text, so anything can turn up in them; map what has an
 * obvious equivalent and replace the rest, so a stray emoji costs one character
 * instead of the whole line.
 */
const WINANSI_EXTRA = new Set(
  [0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
   0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
   0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178]
);
const TRANSLITERATE = {
  "\u2192": "-", "\u2190": "-", "\u2194": "-", "\u21d2": "=>",
  "\u2713": "v", "\u2714": "v", "\u2717": "x", "\u2265": ">=", "\u2264": "<=",
  // Narrow / thin / hair / zero-width spaces. Current ICU puts a NARROW
  // NO-BREAK SPACE (U+202F) before AM/PM in toLocaleTimeString, which would
  // otherwise break every timestamp in the report.
  "\u202f": " ", "\u2009": " ", "\u200a": " ", "\u200b": "", "\u2060": "",
};

const winAnsi = (value) => {
  const str = String(value ?? "");
  let out = "";
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) || WINANSI_EXTRA.has(code)) out += ch;
    else if (TRANSLITERATE[ch]) out += TRANSLITERATE[ch];
    else if (code === 10 || code === 13 || code === 9) out += " ";
    else out += "?";
  }
  return out;
};

const hhmm = (d) =>
  d && Number.isFinite(d.getTime())
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

const dayHeading = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return String(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  const date = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
  if (same(d, today)) return `Today · ${date}`;
  if (same(d, yesterday)) return `Yesterday · ${date}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short" })} · ${date}`;
};

const sessionTimeLabel = (session) => {
  const start = new Date(`${session.start_date}T${session.start_time}`);
  const running = !session.end_date && !session.end_time;
  const end = running ? null : new Date(`${session.end_date}T${session.end_time}`);
  const from = hhmm(start) || "-";
  // ARROW is an en dash, not the "→" the on-screen card uses. jsPDF's built-in
  // fonts are WinAnsi; one character outside that set (U+2192 is) silently
  // switches the WHOLE string to UTF-16, which those fonts cannot render — the
  // line then comes out as garbage. "·" and "—" are in WinAnsi, so they're fine.
  if (running) return `${from} ${ARROW} running`;
  const crossedMidnight = session.end_date && session.start_date && session.end_date !== session.start_date;
  const endPart = crossedMidnight
    ? `${new Date(`${session.end_date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${hhmm(end)}`
    : hhmm(end);
  return `${from} ${ARROW} ${endPart || "-"}`;
};

/** Same field choice the on-screen gallery makes, so the PDF shows what the UI shows. */
const screenshotUrl = (shot, isAdminView) => {
  const path = isAdminView ? shot.screenshot_file : shot.emp_screenshot_file || shot.screenshot_file;
  const base = getMediaUrl(path, shot.created_at);
  if (!base) return null;
  // Cache-bust: a plain <img> on the page may have cached this exact URL with no
  // CORS validation, and reusing that entry taints the canvas.
  return `${base}${base.includes("?") ? "&" : "?"}cors=1`;
};

/* -------------------------------- export ------------------------------ */

/**
 * @param {object}   opts
 * @param {string}   opts.heading      e.g. "Work Diary"
 * @param {Array}    opts.meta         [[label, value], ...] shown under the heading
 * @param {object}   opts.stats        { workedSeconds, idleSeconds, productiveSeconds, productivePercent }
 * @param {object[]} opts.apps         aggregateWindowsActivity().apps
 * @param {object[]} opts.sessions
 * @param {boolean}  opts.isAdminView  picks which screenshot field to read
 * @param {string}   opts.fileName
 * @param {function} opts.onProgress   (loaded, total) while screenshots download
 */
export async function exportWorkDiaryPdf({
  heading = "Work Diary",
  meta = [],
  stats = {},
  apps = [],
  sessions = [],
  isAdminView = false,
  fileName = "work-diary.pdf",
  onProgress,
}) {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const thumbW = (contentWidth - THUMB_GAP * (THUMBS_PER_ROW - 1)) / THUMBS_PER_ROW;
  const thumbH = thumbW * THUMB_RATIO;
  const rowH = thumbH + CAPTION_H + 8;

  let y = PAGE_MARGIN;

  // Reserve the footer strip so text never collides with the page number.
  const bottomLimit = () => pageHeight - PAGE_MARGIN - 14;
  const ensureSpace = (needed) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = PAGE_MARGIN;
      return true;
    }
    return false;
  };

  const text = (str, x, opts = {}) => {
    const { size = 10, bold = false, color = INK, align } = opts;
    doc.setFontSize(size);
    doc.setFont(undefined, bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(winAnsi(str), x, y, align ? { align } : undefined);
  };

  /* ---------------------------- header ---------------------------- */
  text(heading, PAGE_MARGIN, { size: 17, bold: true });
  y += 20;

  meta.filter(Boolean).forEach(([label, value]) => {
    if (value == null || value === "") return;
    text(`${label}: `, PAGE_MARGIN, { size: 10, color: MUTED });
    const labelW = doc.getTextWidth(`${label}: `);
    text(value, PAGE_MARGIN + labelW, { size: 10, color: INK });
    y += 14;
  });

  text(`Generated ${new Date().toLocaleString()}`, PAGE_MARGIN, { size: 8, color: FAINT });
  y += 18;

  /* --------------------------- stat cards -------------------------- */
  const cards = [
    ["WORKED", formatDuration(stats.workedSeconds)],
    ["IDLE", formatDuration(stats.idleSeconds)],
    ["PRODUCTIVE", formatDuration(stats.productiveSeconds)],
    ["PRODUCTIVITY", `${stats.productivePercent || 0}%`],
  ];
  const cardGap = 8;
  const cardW = (contentWidth - cardGap * (cards.length - 1)) / cards.length;
  const cardH = 44;
  ensureSpace(cardH + 20);
  cards.forEach(([label, value], i) => {
    const x = PAGE_MARGIN + i * (cardW + cardGap);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, cardW, cardH, 4, 4);
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...MUTED);
    doc.text(winAnsi(label), x + 8, y + 15);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...INK);
    doc.text(winAnsi(value), x + 8, y + 33);
  });
  y += cardH + 22;

  /* ---------------------------- top apps --------------------------- */
  const topApps = apps.slice(0, 10);
  if (topApps.length > 0) {
    ensureSpace(28);
    text("Top Applications", PAGE_MARGIN, { size: 12, bold: true });
    y += 16;
    const totalActivity = apps.reduce((sum, a) => sum + (a.duration || 0), 0);
    topApps.forEach((app) => {
      ensureSpace(22);
      const pct = totalActivity > 0 ? (app.duration / totalActivity) * 100 : 0;
      text(app.name, PAGE_MARGIN, { size: 9, color: INK });
      text(formatDuration(app.duration), PAGE_MARGIN + contentWidth, { size: 9, color: MUTED, align: "right" });
      y += 5;
      doc.setFillColor(...BAR_BG);
      doc.rect(PAGE_MARGIN, y, contentWidth, 5, "F");
      doc.setFillColor(...BAR_FG);
      doc.rect(PAGE_MARGIN, y, (contentWidth * Math.min(pct, 100)) / 100, 5, "F");
      y += 15;
    });
    y += 8;
  }

  /* ---------------------------- sessions --------------------------- */
  ensureSpace(26);
  text(`Sessions (${sessions.length})`, PAGE_MARGIN, { size: 12, bold: true });
  y += 18;

  if (sessions.length === 0) {
    text("No work sessions in this period.", PAGE_MARGIN, { size: 10, color: FAINT });
    y += 16;
  }

  // Group by day exactly like the on-screen list, newest day first.
  const groups = new Map();
  for (const s of sessions) {
    const key = s.start_date || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const orderedDays = [...groups.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));

  // Work out the screenshot plan up front so progress is a real fraction and
  // any trimming can be stated on the last page instead of passing unnoticed.
  let budget = MAX_TOTAL_SCREENSHOTS;
  const plan = new Map();
  let plannedTotal = 0;
  let skippedTotal = 0;
  for (const s of sessions) {
    const all = Array.isArray(s.screenshots) ? s.screenshots : [];
    const take = Math.max(0, Math.min(MAX_SCREENSHOTS_PER_SESSION, budget, all.length));
    budget -= take;
    plannedTotal += take;
    skippedTotal += all.length - take;
    plan.set(s.id, take);
  }
  let loadedCount = 0;
  onProgress?.(0, plannedTotal);

  for (const [day, rows] of orderedDays) {
    const dayTotal = rows.reduce((sum, s) => sum + sessionWorkedSeconds(s), 0);

    // Keep a day header attached to at least the start of its first session.
    ensureSpace(38);
    doc.setFillColor(246, 247, 250);
    doc.rect(PAGE_MARGIN, y - 10, contentWidth, 20, "F");
    text(dayHeading(day), PAGE_MARGIN + 6, { size: 10, bold: true });
    text(
      `${rows.length} session${rows.length === 1 ? "" : "s"} · ${formatDuration(dayTotal)}`,
      PAGE_MARGIN + contentWidth - 6,
      { size: 9, color: MUTED, align: "right" }
    );
    y += 24;

    for (const session of rows) {
      const worked = sessionWorkedSeconds(session);
      const idle = idleSecondsForSession(session);
      const take = plan.get(session.id) || 0;

      // Header + one thumbnail row stay together; a title stranded alone at the
      // foot of a page is exactly the break that made the old output unreadable.
      ensureSpace(34 + (take > 0 ? rowH : 0));

      text(session.task_detail?.task_title || "Untitled task", PAGE_MARGIN, { size: 10, bold: true });
      y += 13;

      const bits = [sessionTimeLabel(session), `Worked ${formatDuration(worked)}`];
      if (idle > 0) bits.push(`Idle ${formatDuration(idle)}`);
      if (session.type === "Manual") bits.push("Manual entry");
      text(bits.join("   ·   "), PAGE_MARGIN, { size: 8.5, color: MUTED });
      y += 14;

      if (session.memo_content) {
        doc.setFontSize(8.5);
        doc.setFont(undefined, "italic");
        doc.setTextColor(...MUTED);
        doc.splitTextToSize(winAnsi(`"${session.memo_content}"`), contentWidth).forEach((line) => {
          ensureSpace(12);
          doc.text(line, PAGE_MARGIN, y);
          y += 11;
        });
        doc.setFont(undefined, "normal");
        y += 3;
      }

      const all = Array.isArray(session.screenshots) ? session.screenshots : [];
      const shots = all.slice(0, take);

      if (shots.length > 0) {
        const urls = shots.map((s) => screenshotUrl(s, isAdminView));
        const thumbs = await loadThumbs(urls, thumbW, thumbH, () => {
          loadedCount += 1;
          onProgress?.(loadedCount, plannedTotal);
        });

        for (let i = 0; i < thumbs.length; i += THUMBS_PER_ROW) {
          const row = thumbs.slice(i, i + THUMBS_PER_ROW);
          // Whole rows only — never split a row of screenshots across a page.
          ensureSpace(rowH);
          row.forEach((thumb, j) => {
            const cellX = PAGE_MARGIN + j * (thumbW + THUMB_GAP);
            if (thumb) {
              // Centre inside the cell so mixed aspect ratios stay tidy.
              const ix = cellX + (thumbW - thumb.w) / 2;
              const iy = y + (thumbH - thumb.h) / 2;
              try {
                doc.addImage(thumb.dataUrl, "JPEG", ix, iy, thumb.w, thumb.h);
              } catch {
                doc.setDrawColor(...LINE);
                doc.rect(cellX, y, thumbW, thumbH);
              }
            } else {
              doc.setDrawColor(...LINE);
              doc.rect(cellX, y, thumbW, thumbH);
              doc.setFontSize(7);
              doc.setTextColor(...FAINT);
              doc.text("unavailable", cellX + thumbW / 2, y + thumbH / 2, { align: "center" });
            }
            const shot = shots[i + j];
            if (shot) {
              doc.setFontSize(6.5);
              doc.setTextColor(...FAINT);
              doc.text(winAnsi(hhmm(new Date(shot.created_at)) || ""), cellX, y + thumbH + 8);
            }
          });
          y += rowH;
        }
      }

      const hidden = all.length - shots.length;
      if (hidden > 0) {
        ensureSpace(12);
        text(`+${hidden} more screenshot${hidden === 1 ? "" : "s"} not included`, PAGE_MARGIN, { size: 7.5, color: FAINT });
        y += 12;
      }

      ensureSpace(10);
      doc.setDrawColor(240, 242, 245);
      doc.line(PAGE_MARGIN, y, PAGE_MARGIN + contentWidth, y);
      y += 14;
    }
  }

  /* ---------------------------- footers ---------------------------- */
  // Say plainly when the caps trimmed something, rather than letting the report
  // look complete when it isn't.
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...FAINT);
    doc.text(`Page ${p} of ${pages}`, pageWidth - PAGE_MARGIN, pageHeight - PAGE_MARGIN + 8, { align: "right" });
    if (p === pages && skippedTotal > 0) {
      doc.text(
        `${skippedTotal} screenshot${skippedTotal === 1 ? "" : "s"} omitted (limit ${MAX_SCREENSHOTS_PER_SESSION}/session, ${MAX_TOTAL_SCREENSHOTS} total)`,
        PAGE_MARGIN,
        pageHeight - PAGE_MARGIN + 8
      );
    }
  }

  doc.save(fileName);
  return { screenshotsIncluded: plannedTotal, screenshotsOmitted: skippedTotal, pages };
}
