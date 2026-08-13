/**
 * Release history for the Archilance LLC desktop time tracker (Windows).
 *
 * There is no releases API — v1 hard-coded this same list, so it stays a static
 * manifest. To publish a new build: upload the installer, then append an entry
 * here. `versions` is ordered OLDEST → NEWEST; the page derives "latest" from
 * the last entry, so nothing else needs touching.
 */
export const versions = [
  {
    id: 0,
    version: "3.0.4",
    releaseDate: "May 6, 2026",
    url: "http://portal.archilance.net/Archilance%20LLC%20Setup%203.0.4.exe",
    releaseNotes: [
      "Version upgraded with overall performance improvements.",
      "Added activity recording to improve analytics: keyboard inputs and click events are now recorded.",
      "Multiple issues and bugs from previous versions have been fixed.",
    ],
  },
  {
    id: 1,
    version: "3.1.0",
    releaseDate: "June 11, 2026",
    url: "http://portal.archilance.net/Archilance%20LLC%20Setup%203.1.0.exe",
    releaseNotes: [
      "Version upgraded with overall performance improvements.",
      "You can now add manual time entries by uploading supporting proof/documents.",
      "Multiple issues and bugs from previous versions have been fixed.",
    ],
  },
  {
    id: 2,
    version: "3.1.1",
    releaseDate: "June 12, 2026",
    url: "http://portal.archilance.net/Archilance%20LLC%20Setup%203.1.1.exe",
    releaseNotes: [
      "Version upgraded with overall performance improvements.",
      "You can now add manual time entries by uploading supporting proof/documents.",
      "Multiple issues and bugs from previous versions have been fixed.",
    ],
  },
  {
    id: 3,
    version: "3.2.0",
    releaseDate: "June 14, 2026",
    url: "https://portal.archilance.net/Archilance%20LLC%20Setup%203.2.0.exe",
    releaseNotes: [
      "Projects now load instantly using local cache — no more waiting on every visit.",
      "PDF export fixed: large session reports no longer fail with a URL error.",
      "Offline mode improved: start a local timer even when the server is unreachable.",
      "Multiple bug fixes and stability improvements.",
    ],
  },
  {
    id: 4,
    version: "3.4.0",
    releaseDate: "June 17, 2026",
    url: "https://portal.archilance.net/Archilance%20LLC%20Setup%203.4.0.exe",
    releaseNotes: [
      "Auto-update is here! You no longer need to visit the portal to download new versions.",
      "Whenever a new update is available, you'll see a prompt directly in the app — just download and install it in one click.",
      "Version upgraded with overall performance improvements.",
      "Multiple issues and bugs from previous versions have been fixed.",
    ],
  },
  {
    id: 5,
    version: "3.4.1",
    releaseDate: "July 5, 2026",
    url: "https://portal.archilance.net/Archilance%20LLC%20Setup%203.4.1.exe",
    releaseNotes: [
      "Added the new Internee module.",
      "Multiple issues and bugs from previous versions have been fixed.",
    ],
  },
   {
    id: 6,
    version: "3.4.3",
    releaseDate: "August 08, 2026",
    url: "https://portal.archilance.net/Archilance%20LLC%20Setup%203.4.3.exe",
    releaseNotes: [
      "Version upgraded with overall performance improvements.",
      "Multiple issues and bugs from previous versions have been fixed.",
    ],
  },
   {
    id: 7,
    version: "3.4.4",
    releaseDate: "August 11, 2026",
    url: "https://portal.archilance.net/Archilance%20LLC%20Setup%203.4.4.exe",
    releaseNotes: [
      "Version upgraded with overall performance improvements.",
      "Multiple issues and bugs from previous versions have been fixed.",
    ],
  },
];

export const latestRelease = versions[versions.length - 1] || null;
export const previousReleases = versions.slice(0, -1).reverse();
