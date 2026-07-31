// Ported from archilance_portal_reactjs's EmployeeWorkStats.jsx categorizer
// (tuned for an architecture/design studio), plus the bounded-ratio fix so
// "Productive" can never exceed worked time or 100% — see the categorizer's
// non-productive-first ordering and the ratio math in aggregateWindowsActivity.

const NON_PRODUCTIVE_KEYWORDS = [
  "facebook", "instagram", "tiktok", "twitter", "x.com", "reddit", "snapchat", "9gag",
  "netflix", "prime video", "hulu", "disney+", "hotstar", "hbo", "twitch",
  "spotify", "soundcloud", "apple music", "gaana", "jiosaavn",
  "discord",
  "steam", "epic games", "valorant", "league of legends", "dota",
  "counter-strike", "call of duty", "minecraft", "roblox", "fortnite", "pubg",
];

const PRODUCTIVE_KEYWORDS = [
  "slack", "microsoft teams", "teams", "zoom", "google meet", "meet",
  "webex", "skype", "whatsapp", "google chat",
  "outlook", "gmail", "thunderbird", "webmail", "roundcube", "zoho mail", "proton mail",
  "notion", "trello", "asana", "jira", "clickup", "monday.com",
  "confluence", "miro", "figjam", "loom", "archilance",
  "google docs", "google sheets", "google slides", "google drive", "dropbox",
  "excel", "word", "powerpoint", "onenote", "visio", "sharepoint",
  "onedrive", "microsoft office", "office 365", "microsoft 365",
  "autocad", "revit", "archicad", "sketchup", "sketch up", "3ds max", "3dsmax",
  "rhino", "rhinoceros", "grasshopper", "vectorworks", "civil 3d",
  "navisworks", "autodesk", "recap", "infraworks", "formit", "microstation",
  "allplan", "chief architect", "solidworks", "fusion 360", "inventor",
  "lumion", "d5 render", "d5render", "enscape", "twinmotion", "v-ray", "vray",
  "corona render", "keyshot", "blender", "cinema 4d", "c4d",
  "bluebeam", "revu", "pdf", "acrobat", "adobe reader", "foxit", "nitro pro", "sumatra",
  "adobe", "photoshop", "illustrator", "indesign", "lightroom",
  "after effects", "premiere", "adobe xd",
  "figma", "canva", "invision",
  "matterport", "docusketch", "cubicasa", "magicplan", "regrid",
  "google earth", "google maps", "mapbox", "arcgis", "qgis",
  "upwork", "fiverr", "freelancer",
  "chatgpt", "openai", "claude", "ai studio", "gemini", "copilot", "perplexity",
  "tutorial", "how to", "training", "webinar", "lecture",
  "udemy", "coursera", "skillshare", "pluralsight", "khan academy", "linkedin learning",
  "visual studio", "vs code", "vscode", "pycharm", "intellij", "android studio",
  "sublime text", "github", "gitlab", "bitbucket", "gitkraken", "sourcetree",
  "docker", "postman",
];

const BROWSERS = ["chrome", "edge", "firefox", "brave", "opera", "safari"];
const WORK_HINTS = ["admin", "crm", "archilance", "docs", "dashboard", "portal"];

export function categorizeApp(appName, windowTitle) {
  if (!appName) return "Neutral";
  const name = String(appName).toLowerCase();
  const title = windowTitle ? String(windowTitle).toLowerCase() : "";
  const haystack = `${name} ${title}`;
  const matches = (list) => list.some((k) => haystack.includes(k));

  if (matches(NON_PRODUCTIVE_KEYWORDS)) return "Social";
  if (matches(PRODUCTIVE_KEYWORDS)) return "Productive";

  const isBrowser = BROWSERS.some((b) => name.includes(b));
  if (isBrowser) {
    return WORK_HINTS.some((k) => title.includes(k)) ? "Productive" : "Neutral";
  }
  return "Neutral";
}

/**
 * Aggregates `windows_activity` rows into per-app totals + category totals, then
 * expresses Productive as a RATIO of tracked app time applied to the reliable
 * worked-time total — so it can never exceed worked time or 100%, even though
 * the raw activity buckets over-count and still include idle overlap.
 */
export function aggregateWindowsActivity(rows = [], workedSeconds = 0) {
  const appMap = new Map();
  const categoryTotals = { Productive: 0, Social: 0, Neutral: 0 };
  let totalActivitySeconds = 0;

  for (const row of rows) {
    const dur = Number(row?.duration_seconds) || 0;
    if (dur <= 0 || !row?.app_name) continue;
    const category = categorizeApp(row.app_name, row.window_title);
    const key = String(row.app_name).trim();
    const existing = appMap.get(key) || { name: key, duration: 0, category };
    existing.duration += dur;
    appMap.set(key, existing);
    categoryTotals[category] = (categoryTotals[category] || 0) + dur;
    totalActivitySeconds += dur;
  }

  const productiveRatio = totalActivitySeconds > 0 ? categoryTotals.Productive / totalActivitySeconds : 0;
  const productiveSeconds = Math.round(productiveRatio * workedSeconds);
  const productivePercent = Math.round(productiveRatio * 100);

  const apps = [...appMap.values()].sort((a, b) => b.duration - a.duration);

  return { apps, categoryTotals, totalActivitySeconds, productiveSeconds, productivePercent };
}
