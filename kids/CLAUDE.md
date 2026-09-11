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

## How André wants replies

Explicit standing instruction: keep chat replies short. Only write back
when there's something he actually needs to read — a decision only he
can make, or information only he can get (e.g. "what does
`speechSynthesis.getVoices()` show on that Chromebook?"). Otherwise fix
it, verify it, log it here, and say so in one line. Silence/brevity means
"handled" — he will not read a long report, and said so directly. Don't
restate what was already fixed in past tense at length; this file is the
paper trail, not the chat.

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
parent dashboard → sound/motion/touch-targets → deploy) are done and live
at `kids.andaluma.com`. The one thing intentionally left open:
**illustration quality**. Comet, Stella, and the exercise icon set are
hand-authored inline SVG — functional, not polished — and the plan calls
for André and Daniela's own sign-off on whether that's good enough or
needs real illustration work.

**Real-use feedback, applied**: first hands-on test with Maia (5, can't
read yet) found prompts like "How many?" / "Which shows this many?" were
opaque to her, and the star cluster to count didn't read as visually
distinct from the page. Fixed by adding spoken narration (a shared
`Speech` utility in `exercise.js` — speaks the question, never the answer
options, best-effort female voice from whatever the device offers) wired
into `match-select` and `sequence-tap`, plus visually framing every
prompt (stars/numeral/picture) in its own bordered card, matching the
answer buttons' visual language. If more real-use issues surface, this is
the pattern to follow: fix the actual interaction, verify with a
synthetic browser test (mock `speechSynthesis.speak` to assert what gets
said, since there's no audio in a headless test), then update this file.

**Second round of real-use feedback**: Luka got stuck on "space" in Spell
It — it had no picture, only audio, and the audio alone wasn't enough to
go on. Audit found 4 of 8 words in that topic were audio-only with no
visual fallback at all. Rule going forward: **every `spell-tiles`
exercise should carry both an image and audio**, never audio alone —
audio can fail for reasons nothing in the code controls (quiet device,
unclear TTS voice, a word that's hard to place from sound). Two of the
four got new icons (`zoom`, `comet` in `exercise.js`'s icon set); the two
that were genuinely too abstract to draw (`speed`, `space`) were swapped
for equally on-theme, concrete words (`skate`, `planet`) rather than
forcing a mismatched picture onto them.

**Third round of real-use feedback**: streak stayed at 0 despite Luka doing
real exercises. Root cause: `updateStreak()` was only ever called from
`endSession()` — which only runs when a session ends by mastery or by the
queue running out — so a child who practices for a bit and then taps
"Stop" (completely normal usage) never got credited at all, even though
they showed up and did the work. Fixed by moving the `updateStreak()` call
into `finishExercise()`, which fires after every single answered exercise
regardless of how the session ends. Verified with a synthetic test:
answer one exercise, hit Stop immediately, streak still correctly shows
`{current:1, longest:1, ...}`. Also added `.catch()` error logging to all
three Firebase RTDB writes (`kids_progress`, `kids_streaks`,
`kids_sessions`) — if progress/streaks ever silently fail to save again in
a way this fix doesn't explain (e.g. an RTDB security-rules rejection),
it'll now show up as a `PERMISSION_DENIED`-style error in the browser
console instead of failing silently.

**Fourth round of real-use feedback**: two issues from the same message.
(1) A "how many stars" prompt whose answer is 0 rendered as a blank white
box — indistinguishable from something failing to load. Fixed with
`ExerciseUI.starGhost`, a dashed outline star shown only for the
zero-stars case (`match-select.js`'s `_promptHtml`) — a numeral or text
"0"/"empty" couldn't be used instead since 0 is itself one of the tappable
answer options and would give it away. (2) Luka had noticed the correct
answer kept landing in the same screen position — true, because content
authors `options` arrays in whatever order was convenient
(`pictureMatchExercise`/`sightWordExercise` in `letters-maia.js` always put
the answer at index 0), and nothing ever reordered them before render.
Fixed generically at the engine layer, not per content file:
`ExerciseUI.shuffle()` (Fisher-Yates on a copy) is now called on
`item.options` in `match-select.js`, `item.items` in `sequence-tap.js`,
and `item.letterBank` in `spell-tiles.js`, every time that exercise is
rendered — so position is re-randomized on every viewing, for every
exercise type, without touching any content file. Verified with a
synthetic test: rendering the same fixed-position content item 30 times
in a row put the correct answer in all three slots, not always the same
one.

Also added error callbacks (the 3rd argument to Firebase's `.on('value',
...)`) to every progress/streak read listener in `kids.js`, mirroring the
`.catch()` already on the writes — a parent asked whether a day's
progress had actually been saved, and reads failing silently on a
security-rules rejection would look exactly like "forgot everything
overnight" with nothing in the console to point at why. If that ever
recurs, check the browser console for a `kids_progress read failed` /
`PERMISSION_DENIED`-shaped error before assuming it's a repeat of this.

**Fifth round of real-use feedback**: the mini dot-clusters shown as
option content in "which shows this many?" recognition exercises weren't
centered inside their buttons — a count of 1, 2, or 3 dots sat packed
toward the top-left instead of in the middle. Cause: `.opt-stars` used
CSS Grid with a fixed `repeat(5, 1fr)` template — grid auto-placement
fills cells from the top-left corner, so anything short of 5 (or not an
exact multiple of the row width) leaves empty trailing cells and looks
off-center; `justify-content` on a grid centers unused *track* space, not
content, so it did nothing here. Switched `.opt-stars` to flexbox with
wrap + `justify-content`/`align-content: center`, which centers every row
and the whole block regardless of dot count. Also made `.opt-btn` itself
an explicit `display:flex; align-items:center; justify-content:center`
rather than relying on the browser's default button centering, so any
future option content (text, icon, or dot cluster) centers reliably
instead of by accident. Verified with screenshots at 1/2/3 dots and at
10/11/12 dots (two-row wrap case) — both centered correctly.

**Sixth round of real-use feedback**: Luka's narration came out sounding
like "a mix between Spanish, English, and something we don't understand."
Root cause, in `Speech._pickVoice()` (`exercise.js`): when the device has
no English TTS voice installed at all, the code fell back to picking from
*every* installed voice regardless of language — so on a Chromebook set
up for a Spanish-speaking household with only Spanish voices available,
it would silently hand English question text to a Spanish voice engine,
which mangles the pronunciation into exactly that garbled, half-language
result. Fixed two ways: (1) `_pickVoice()` now returns null instead of
falling back to a non-English voice when none is installed — no voice
substitution across languages, ever; (2) `say()` now always sets
`u.lang = 'en-US'` on the utterance itself regardless of whether a
specific voice object was found, so the browser's own TTS engine knows
the text is English even with no matching voice selected. Also bumped
`pitch` (1.05 → 1.15) and `rate` (0.88 → 0.95) per a request for a
"happier" voice — brighter pitch, a touch less draggy without losing
clarity. Verified with two mocked-voices-list scenarios: Spanish-only (no
voice forced, `lang` still `en-US`) and mixed-with-English (the English
voice is correctly chosen over the Spanish ones ahead of it in the list).

**Seventh round of real-use feedback**: the letter-to-picture exercise
spoke "Find the letter D" while the actual task was "find the picture
whose name starts with D" — a real mismatch, since there's no letter D
anywhere on screen to tap in that exercise, only pictures. Root cause:
`letterExercise` (letter-to-letter matching) and `pictureMatchExercise`
(letter-to-picture) both use `prompt.kind === 'letter'`, so
`_speakText`/`_question` in `match-select.js` treated them identically.
Fixed by also checking `options[0].kind` (the same pattern already used
to disambiguate the numeral/stars case) — when the options are pictures,
it now says "Which picture starts with the letter D?" instead.

Same message also flagged (a) the `dog` icon as unrecognizable ("not sure
what the middle is" — it was a single-tone purple blob with no muzzle or
ears distinct from the head) and (b) asked for clearer images generally.
Auditing the full icon set turned up a worse, compounding version of the
same problem: `reading-luka.js`'s "what runs fast in the story?"
comprehension exercise puts **fox, dog, and cat** together as the three
options in one question — and fox/cat were both plain orange circles,
functionally indistinguishable from each other at a glance. Redesigned
`dog` (warm brown, floppy ears, a visible pale muzzle+nose) and `cat`
(gray, pointy ears, whiskers) so all three read as different animals
side by side; also fixed `unicorn` (was near-white-on-white, invisible
against the card background — given a pale lavender fill and a visible
stroke), `zoom` (three bare lines read as a hamburger-menu icon, not
"fast" — added an arrowhead to make it an unambiguous motion streak),
and `skate` (a boot-on-a-blade shape that read as an unrecognizable blob
at icon size — replaced with a plain skateboard-deck-and-two-wheels
silhouette). Verified by rendering the full icon set plus the three
specific flagged exercises (D→dog, the dog/crown/star sight-word set,
and the fox/dog/cat trio) and confirming everything reads clearly at
actual in-app size.

Also fixed, spotted while testing the above: sight-word answer buttons
(`opt.kind === 'word'`, e.g. "crown", "rainbow") were forced into the
same fixed 76×76px square used for single digits/letters, so the word
text overflowed past the button's own border and visually ran into the
next button ("crown" and "star" appearing to merge into one word). Added
an `.opt-btn-word` modifier (auto width, smaller font, padding) applied
whenever an option's kind is `word`, so text-based options size to their
content instead of overflowing a box built for something much shorter.

**Curriculum change, requested directly rather than found through
testing**: full sight-word reading was "one tiny step too far" straight
after letter-to-picture matching — Maia needed more letter practice in
between. Added a new bridging topic, `letters-starting-sound` ("Starts
With") in `letters-maia.js`, between `letters-to-picture` and
`letters-sight-words` in the prerequisite chain: given a picture, tap the
letter its name starts with — the same first-sound pairing as
`pictureMatchExercise`, just reversed (picture → letter instead of
letter → picture), so it's still letter-level recognition, not whole-word
reading. Implemented as `letterStartExercise()`, a `match-select` with
`prompt: {kind:'picture', ...}` and letter-kind options — no engine or
mastery-gating changes needed, `Mastery.statusFor` already gates purely
by `prerequisiteId`. Needed one more disambiguation in `match-select.js`
(`_question`/`_speakText`): a `picture` prompt now also checks whether
its options are letters or words, same pattern as the two `letter`-
prompt cases fixed earlier, so it asks "Which letter does it start
with?" instead of "Which word matches the picture?" when the options
aren't words. If sight words still feel like too big a jump after this,
the next lever is easier/shorter words in `letters-sight-words` itself,
not another bridging topic — this one topic is meant to be the full gap.

**Eighth round of real-use feedback**: no way to correct a mistake in
Spell It — once a wrong letter was tapped there was no undo, only
finishing the word (right or wrong) or Stop-ing the whole exercise.
Fixed in `spell-tiles.js`: the most recently tapped slot is now itself
tappable to undo (outlined in coral to signal that), plus an explicit
"⌫ Erase last letter" button for discoverability. Required switching
`_picked` from a plain string to `_pickedIndices` (bank indices in tap
order) — undo has to know exactly which physical tile a letter came from
to give the right one back, and a plain character string can't
disambiguate that when a word repeats a letter. Both undo affordances
disappear the instant the word is fully spelled and scored, so there's
no way to reopen an already-submitted answer. Verified end-to-end: tap
r-o-k (wrong, skips c), erase the k, tile reappears usable in the bank,
finish spelling c-k-e-t correctly, get "Got it!".

**Ninth round**: two more targeted fixes from the same feedback message.
(1) `skate` icon was still unclear even after the first redesign (a bare
deck+wheels bar) — replaced with a boot-shaped upper over the same
wheels, since the boot silhouette is the part that actually reads as
"skate," not the deck. (2) Luka's narration is still coming out with
Spanish-accented pronunciation on his Chromebook even after the
English-only voice fix — `_pickVoice()` now prefers a voice whose name
contains "Google" among the installed English ones (network TTS voices
are reliably well-pronounced; a device can have more than one voice
tagged "en" and the first one in the list isn't necessarily the good
one). If this is still wrong after this fix, it means that device's only
installed English voice is a low-quality local engine, and no
JS-side fix can improve pronunciation quality that doesn't exist on the
device — the next step would be checking that Chromebook's OS-level
language/voice settings, which only André can do.

**Tenth round**: `zoom` icon redesigned again — three plain lines (even
with an arrowhead added last round) still just read as lines, not
"fast." Switched to the classic cartoon convention instead: a solid ball
with speed-line trails behind it.

Also addressed the recurring "progress resets after going back"
complaint with an actual behavior fix, not just more logging. On a fresh
page load (e.g. the browser's own back button, not this app's in-page
nav), `kidsProgress` starts empty and has to wait on a Firebase read
before it reflects what's actually mastered — and an empty map and a
not-yet-loaded map rendered identically. On a slow connection that looks
exactly like "the progress is gone," when it's only still loading.
`selectSubjectTab` now renders a "Loading &lt;name&gt;'s progress…"
placeholder instead of the (necessarily empty) skill map until the first
real Firebase snapshot for that profile+subject arrives, then swaps in
the real map. This also makes the two real possibilities distinguishable
for the first time: if the map now loads correctly after a brief
placeholder, it really was just this race; if it stays stuck on
"Loading…" indefinitely, that's a genuine Firebase read failure (rules
or connectivity) worth checking the browser console for. Verified both
paths: a stuck read shows the loading text and never fabricates an empty
skill tree, and a real (delayed) snapshot correctly replaces it with the
loaded map and mastery badges.

Nothing else is a known gap as of this writing.
