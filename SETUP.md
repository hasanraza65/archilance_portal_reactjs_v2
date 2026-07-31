# Archilance Portal — New UI (v2)

This is the **second** of two apps. They are separate builds that run on the
same origin:

| URL | App | Repo |
|---|---|---|
| `/`      | Classic | `archilance_portal_reactjs` |
| `/v2/`   | New UI  | `archilance_portal_reactjs_v2` (this one) |

They are deliberately kept separate: both declare `--color-primary-*` in their
own Tailwind `@theme` with different values, so a single build would merge the
blocks and one design's palette would silently overwrite the other's.

## Running both locally

Clone the two repos **side by side**:

    <parent>/archilance_portal_reactjs
    <parent>/archilance_portal_reactjs_v2

Then, once per repo:

    npm install

In this repo only:

    cp .env.example .env

Finally, from **either** repo:

    node dev-both.mjs

    Classic  ->  http://localhost:4000/
    New (v2) ->  http://localhost:4000/v2/

### Why one port

Cookies are per-origin. Running the two dev servers on their own ports (5173 /
5180) means signing in twice, and the version switch cannot carry your session
across. `dev-both.mjs` starts both and puts a router in front so they share one
origin — exactly like production. Hot reload still works on both sides.

To test on a phone, use your machine's LAN IP on the same port, e.g.
`http://192.168.1.2:4000`.

## The version switch

Admins and managers get a switcher in the header. Choosing a version **sticks**:
the classic app redirects to `/v2/` on later visits until you switch back. The
current page is carried across, so `/jobs/412` opens as `/v2/jobs/412`.

Shared logic lives in `src/features/versionSwitch/` here and in
`src/version2/` in the classic repo. Five of those files are byte-identical in
both — **keep them in sync when editing**:

    versionPrefs.js  routeMap.js  OnboardingTour.jsx  TourScenes.jsx  VersionSwitcher.jsx

## Deploying

    classic  npm run build  ->  dist/      -> web root
    v2       npm run build  ->  dist/      -> web root /v2/

The server needs SPA fallback for both:

    /v2/*  -> /v2/index.html
    /*     -> /index.html
