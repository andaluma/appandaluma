# Andaluma Kids

A Duolingo-style daily learning app for Luka (7) and Maia (5) — skill
trees, mastery gating, adaptive difficulty, spaced review, and a parent
dashboard. Read this file before changing anything in `kids/` — several
things here are set up differently from how they'd look at first glance,
for reasons that already cost real debugging time once.

**Full plan, rationale, and design decisions**: https://claude.ai/code/artifact/ee6043b4-a939-40b6-a78e-36c159fa9aa0
(curriculum per child, palette/mascot reasoning, the growth-mindset design
rules, phase-by-phase history). This file is the fast-reference; that link
is the "why."

## Deployment — read this first

`kids.andaluma.com` is **not** part of the same deployment as
`andaluma.com` / `finance.andaluma.com`. It's a **separate Cloudflare
Pages project** (`andaluma-kids` in the Cloudflare dashboard), connected
to this same GitHub repo (`andaluma/appandaluma`), deploying from `main`,
with its **build output directory set to `kids`** — not the repo root.

That has two consequences that aren't obvious from the code alone:

1. **`kids/` is that deployment's own root.** Every internal asset path
   (`manifest.json`, `icon.svg`, `css/kids.css`, every script in
   `kids/index.html`) must be root-relative (`/css/kids.css`,
   `/js/kids.js`, ...) — **not** prefixed with `/kids/`. It used to be
   prefixed, because this was originally built assuming it'd live as a
   subfolder of the main site. If you ever see a `/kids/` prefix creep
   back into one of these paths, that's a regression — the deployed page
   will load as unstyled, non-interactive HTML with no error message.

2. **Cloudflare Pages' `_redirects` file matches by path only, not by
   hostname.** The repo's root `_redirects` file has a working line for
   `finance.andaluma.com`-style routing, but a host-prefixed rule
   (`https://kids.andaluma.com/  /kids/  302`) is **silently ignored** —
   this is a real Cloudflare/Netlify syntax difference, not a typo. That's
   why `kids.andaluma.com` needed its own Pages project instead of a
   redirect rule. Don't try to route it via `_redirects` again.

DNS for `kids.andaluma.com` is a **proxied** CNAME (Cloudflare orange
cloud) — it needs to stay proxied for Cloudflare to issue the certificate
and route the custom domain correctly.

## Firebase

Same Firebase **project** as the Planner/CRM (`andaluma-planner`), but its
own registered Firebase **app** (see `appId` in `kids/js/kids.js`). Realtime
Database only, no Auth product, no Firestore. All data lives under
`kids_`-prefixed top-level keys (`kids_progress`, `kids_streaks`,
`kids_sessions`) — same collision-avoidance convention `crm_contacts` uses
in the CRM.

## Auth

No login for kids — tap-to-select a profile (Comet = Luka, Stella = Maia).
The parent dashboard sits behind its own 4-digit PIN, **`4471`**
(`_KIDS_PARENT_PIN` in `kids/js/kids.js`) — separate from the main
Planner/CRM PIN (`1213` in `js/core.js`). Change it there if you want a
different one; there's a `TODO(André)` marking the spot.

## Architecture

```
kids/
  index.html            all screens, root-relative asset paths (see above)
  manifest.json
  icon.svg
  css/kids.css
  js/
    kids.js              boot, profile picker, nav, Firebase init, dashboard
    engine/
      mastery.js          mastery-rule evaluation — never looks at exercise shape
      scheduler.js         spaced-review due-date logic
      session.js            builds the exercise queue (new + due review)
    content/               hardcoded skill trees, one file per child+subject
      math-maia.js, letters-maia.js
      math-luka.js, writing-luka.js, reading-luka.js
    ui/
      map.js                skill-tree map renderer
      exercise/
        exercise.js          dispatches by exercise type, shared icon set
        match-select.js       prompt -> tap the matching option among 3
        sequence-tap.js        tap items into the correct order
        spell-tiles.js          tap letters to spell a word or phrase
```

**Key finding from building this**: the whole curriculum (Maia's counting/
letters, Luka's math/writing/reading) reduces to three generic exercise
types — `match-select`, `sequence-tap`, `spell-tiles`. `engine/*.js` only
ever sees a `correct` boolean; it was never touched again after Phase 1.
Adding new content is a content-file change, not an engine change.

## Status

Phases 0–8 (foundation → engine → both children's full curricula → real
parent dashboard → sound/motion/touch-targets → deploy) are done and on
`main`. The one thing intentionally left open: **illustration quality**.
Comet, Stella, and the exercise icon set are hand-authored inline SVG —
functional, not polished — and the plan calls for André and Daniela's own
sign-off on whether that's good enough or needs real illustration work.
Nothing else is a known gap as of this writing.
