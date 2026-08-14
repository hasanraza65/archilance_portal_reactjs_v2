import { fetchAllEmployeeWorkSessions } from "@/api/workSessions";
import { aggregateWindowsActivity } from "@/lib/productivity";
import { makeZip, safeFileName, downloadBlob } from "@/lib/zip";
import { formatDuration } from "@/lib/format";
import { exportWorkDiaryPdf } from "./exportPdf";
import { sessionWorkedSeconds } from "./useWorkDiaryData";

/**
 * Bulk work-diary export — one PDF per employee, delivered as a single ZIP.
 *
 * ── WHY THIS RUNS IN THE BROWSER ─────────────────────────────────────────────
 * The obvious design is a queued backend job, and it's the wrong one here. The
 * production box runs cron only — there is no queue worker — and the screenshots
 * live in OneDrive, not on the web server. A server-side renderer would have to
 * pull every screenshot down over the network, rasterise it, hold it in PHP
 * memory, write the PDFs to disk, serve them, and then clean them up. That is
 * the single heaviest thing the app could possibly do, on its weakest resource.
 *
 * Run from the admin's browser instead and all of that cost disappears: the
 * screenshots go straight from OneDrive to the browser that is already
 * authorised to display them (the same fetch the gallery does), the PDF is
 * built by the same jsPDF engine the per-employee export already uses, and the
 * server only ever answers the ordinary work-session API calls it answers today.
 * No new tables, no queue, no temp files, no cleanup cron — and the progress
 * bar can be honest, because the loop reporting it is the loop doing the work.
 *
 * The trade is that the tab has to stay open, which is why cancel is supported
 * and why the caller warns before navigation.
 */

/** Per-employee row states, surfaced in the UI list. */
export const ROW_STATUS = {
  PENDING: "pending",
  WORKING: "working",
  DONE: "done",
  EMPTY: "empty",
  FAILED: "failed",
};

/**
 * How many screenshots each diary carries.
 *
 * "All" is genuinely uncapped — Infinity, not a large number — because a cap
 * that silently trims a report an auditor is relying on is worse than a slow
 * export. The other presets exist because what is a reasonable file for one
 * person becomes an unreasonable archive multiplied by a whole company, and an
 * over-large ZIP is the one failure mode that wastes the entire run.
 *
 * `warn` drives the caution note on the export screen.
 */
export const SCREENSHOT_PRESETS = {
  all: { label: "All screenshots", perSession: Infinity, total: Infinity, warn: true },
  balanced: { label: "Balanced", perSession: 6, total: 150 },
  few: { label: "Fewer (smaller file)", perSession: 3, total: 60 },
  none: { label: "No screenshots", perSession: 0, total: 0 },
};

// Progress weights within one employee's slot. Fetching is a couple of API
// round-trips; the screenshots are the real work; drawing/encoding is the tail.
const W_FETCH = 0.12;
const W_SHOTS = 0.8;

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

/** CSV cell: quote always, double any embedded quote. Excel-safe. */
const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function buildManifestCsv(rows, { periodLabel, startDate, endDate, generatedAt }) {
  const header = [
    "Employee", "Email", "Team", "Type", "Sessions",
    "Worked", "Worked (hours)", "Idle", "Productive %", "Screenshots", "Status",
  ];
  const lines = [
    [`Work diary export — ${periodLabel}`].map(cell).join(","),
    [`Range`, `${startDate} to ${endDate}`].map(cell).join(","),
    [`Generated`, generatedAt.toLocaleString()].map(cell).join(","),
    "",
    header.map(cell).join(","),
  ];

  for (const row of rows) {
    lines.push([
      row.name,
      row.email || "",
      row.team || "",
      row.type || "",
      row.sessionCount ?? 0,
      formatDuration(row.workedSeconds || 0),
      ((row.workedSeconds || 0) / 3600).toFixed(2),
      formatDuration(row.idleSeconds || 0),
      row.sessionCount ? `${row.productivePercent ?? 0}%` : "",
      row.screenshotCount ?? 0,
      row.status === ROW_STATUS.FAILED ? `Failed: ${row.error || "unknown error"}`
        : row.status === ROW_STATUS.EMPTY ? "No activity"
          : "Exported",
    ].map(cell).join(","));
  }

  // Leading BOM: without it Excel reads the file as the local ANSI codepage and
  // mangles every accented name. Written by code point because a literal BOM is
  // invisible in a diff and gets stripped by well-meaning editors.
  const bom = String.fromCharCode(0xfeff);
  return new TextEncoder().encode(`${bom}${lines.join("\r\n")}\r\n`);
}

/**
 * Runs the export. Resolves with a summary; rejects only on a failure that
 * stops the whole run (a cancel resolves, with `cancelled: true`).
 *
 * @param {object}   o
 * @param {string}   o.role            viewer's app role — picks the API path
 * @param {object[]} o.employees       the chosen subset, in display order
 * @param {string}   o.startDate       yyyy-mm-dd
 * @param {string}   o.endDate         yyyy-mm-dd
 * @param {string}   o.periodLabel     e.g. "Last Month"
 * @param {string}   o.screenshotMode  key of SCREENSHOT_PRESETS
 * @param {boolean}  o.skipEmpty       drop people with no sessions in range
 * @param {function} o.onUpdate        (state) => void, throttled
 * @param {{cancelled: boolean}} o.token  set .cancelled to stop
 */
export async function runBulkExport({
  role,
  employees,
  startDate,
  endDate,
  periodLabel,
  screenshotMode = "balanced",
  skipEmpty = true,
  onUpdate,
  token = { cancelled: false },
}) {
  const preset = SCREENSHOT_PRESETS[screenshotMode] || SCREENSHOT_PRESETS.balanced;
  const startedAt = Date.now();
  const total = employees.length;
  const shouldCancel = () => token.cancelled;

  const rows = employees.map((e) => ({
    id: e.id,
    name: e.name || `Employee ${e.id}`,
    email: e.email || "",
    team: e.employee_team || "",
    type: e.employee_type || "",
    status: ROW_STATUS.PENDING,
    sessionCount: 0,
    workedSeconds: 0,
    idleSeconds: 0,
    productivePercent: 0,
    screenshotCount: 0,
    error: null,
  }));

  const files = [];
  let smoothedEta = null;
  let lastPush = 0;

  // Progress within the employee currently being processed, 0..1.
  let slotFraction = 0;
  let currentIndex = 0;
  let shotsLoaded = 0;
  let shotsPlanned = 0;
  // Set once the per-employee loop is done and the archive is being written —
  // checksumming ~150 MB is slow enough that it needs its own progress.
  let zip = null;

  const push = (force = false) => {
    const now = Date.now();
    // ~12 fps is plenty for a progress bar and keeps React out of the way of
    // the actual work; the final frame of each phase is always forced through.
    if (!force && now - lastPush < 80) return;
    lastPush = now;

    const fraction = total === 0 ? 1 : Math.min(1, (currentIndex + slotFraction) / total);
    const elapsed = (now - startedAt) / 1000;

    // Elapsed-over-progress is self-correcting: it needs no per-employee cost
    // model and absorbs the fact that people differ wildly in screenshot count.
    let eta = null;
    if (fraction > 0.02 && fraction < 1) {
      const raw = (elapsed * (1 - fraction)) / fraction;
      smoothedEta = smoothedEta == null ? raw : smoothedEta * 0.7 + raw * 0.3;
      eta = smoothedEta;
    }

    onUpdate?.({
      fraction,
      percent: Math.round(fraction * 100),
      etaSeconds: eta,
      elapsedSeconds: elapsed,
      currentIndex,
      total,
      current: rows[currentIndex] || null,
      shotsLoaded,
      shotsPlanned,
      zip,
      rows: [...rows],
    });
  };

  push(true);

  for (let i = 0; i < total; i += 1) {
    if (token.cancelled) break;

    currentIndex = i;
    slotFraction = 0;
    shotsLoaded = 0;
    shotsPlanned = 0;
    const row = rows[i];
    row.status = ROW_STATUS.WORKING;
    push(true);

    try {
      const { sessions, windowsActivity } = await fetchAllEmployeeWorkSessions(
        role,
        row.id,
        { startDate, endDate },
        { shouldCancel }
      );
      if (token.cancelled) break;

      slotFraction = W_FETCH;
      push(true);

      // Worked time is summed from the per-session net seconds rather than read
      // from `overall_total_time`, which the API computes for ONE page and
      // rounds to whole minutes — neither is safe for a multi-page range.
      const workedSeconds = sessions.reduce((sum, s) => sum + sessionWorkedSeconds(s), 0);
      const idleSeconds = sessions.reduce((sum, s) => sum + (Number(s.idle_seconds) || 0), 0);
      const agg = aggregateWindowsActivity(windowsActivity, workedSeconds);

      row.sessionCount = sessions.length;
      row.workedSeconds = workedSeconds;
      row.idleSeconds = idleSeconds;
      row.productivePercent = agg.productivePercent;

      if (sessions.length === 0 && skipEmpty) {
        row.status = ROW_STATUS.EMPTY;
        slotFraction = 1;
        push(true);
        continue;
      }

      const { blob, screenshotsIncluded } = await exportWorkDiaryPdf({
        heading: "Work Diary",
        meta: [
          ["Employee", row.name],
          ["Email", row.email],
          row.team ? ["Team", row.team] : null,
          row.type ? ["Role", row.type] : null,
          ["Period", `${periodLabel} (${startDate} to ${endDate})`],
        ].filter(Boolean),
        stats: {
          workedSeconds,
          idleSeconds,
          productiveSeconds: agg.productiveSeconds,
          productivePercent: agg.productivePercent,
        },
        apps: agg.apps,
        sessions,
        // This module is management-only, so it always reads the admin copy of
        // a screenshot — same choice EmployeeWorkDiaryPage makes.
        isAdminView: true,
        output: "blob",
        maxPerSession: preset.perSession,
        maxTotal: preset.total,
        shouldCancel,
        onProgress: (loaded, planned) => {
          shotsLoaded = loaded;
          shotsPlanned = planned;
          slotFraction = W_FETCH + (planned > 0 ? (loaded / planned) * W_SHOTS : W_SHOTS);
          push();
        },
      });
      if (token.cancelled) break;

      row.screenshotCount = screenshotsIncluded;
      row.status = ROW_STATUS.DONE;
      files.push({
        name: `${String(i + 1).padStart(2, "0")} - ${safeFileName(row.name, `employee-${row.id}`)}.pdf`,
        data: blob,
      });
    } catch (err) {
      if (err?.name === "AbortError" || token.cancelled) break;
      // One person's diary failing must not cost the other twenty-nine. Record
      // it against the row, keep going, and surface it in the manifest.
      row.status = ROW_STATUS.FAILED;
      row.error = err?.message || "Could not build this diary";
    }

    slotFraction = 1;
    push(true);
    // Let the browser paint and reclaim the finished PDF before the next one.
    await yieldToBrowser();
  }

  const counts = () => ({
    rows,
    exported: rows.filter((r) => r.status === ROW_STATUS.DONE).length,
    skipped: rows.filter((r) => r.status === ROW_STATUS.EMPTY).length,
    failed: rows.filter((r) => r.status === ROW_STATUS.FAILED).length,
  });

  // Nothing was produced — either cancelled before the first diary finished, or
  // every selected person had an empty period. No archive to hand over.
  if (files.length === 0) {
    return token.cancelled
      ? { cancelled: true, files: 0, ...counts() }
      : { cancelled: false, files: 0, nothingToExport: true, ...counts() };
  }

  if (!token.cancelled) {
    currentIndex = total;
    slotFraction = 0;
    push(true);
  }

  files.push({
    name: "summary.csv",
    data: buildManifestCsv(rows, { periodLabel, startDate, endDate, generatedAt: new Date() }),
  });

  const archive = await makeZip(files, (done, count) => {
    zip = { done, total: count };
    push();
  });
  zip = null;

  const stamp = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
  // Cancelling means "stop starting new ones", not "bin the twenty you already
  // built" — a long run must never end with nothing to show. The filename says
  // plainly that the archive is incomplete so it can't be mistaken for a full one.
  downloadBlob(archive, `work-diaries-${stamp}${token.cancelled ? "-partial" : ""}.zip`);

  return {
    cancelled: token.cancelled,
    files: files.length - 1, // the CSV isn't a diary
    bytes: archive.size,
    ...counts(),
  };
}

/** "2m 40s" / "45s" / "1h 5m" — short enough for a progress strip. */
export function formatEta(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** "1.4 MB" */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
