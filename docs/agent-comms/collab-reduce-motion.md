# Collab spec: Reduce Motion toggle

Feature: an accessibility toggle (mirrors the just-shipped Haptics toggle)
that lets a user turn off/tone down Reanimated `entering=` layout
animations and the celebratory stinger/confetti effects, while keeping
haptics and sound untouched (those are separate toggles already).

## Sequencing

1. **Logic/Systems Agent writes this section first** — the state shape
   and persistence contract. UI/Animation build against what's written
   here, not against assumptions.
2. **Animation Agent reads this file, then implements**, appending its
   own section below with what it actually did and any deviation from
   the plan (with reasoning).
3. **QA/Integration Agent reviews the finished collab as a whole** once
   both sections are filled in — not each piece separately.

---

## Logic/Systems Agent — state shape (fill in below)

**Persisted setting** — `src/storage/storage.ts`
- `AppSettings.reducedMotionEnabled: boolean`, default `false` (motion is on
  by default; this is an opt-in reduction). Added to `DEFAULT_SETTINGS`.
  Purely additive — `SettingsStorage.get()` already merges
  `{...DEFAULT_SETTINGS, ...stored}`, so old persisted settings blobs
  without this field get `false` automatically. No migration needed.
- `src/logic/backup.ts` needs no changes — it round-trips `AppSettings`
  generically via spread (`exportAllData()` pulls the whole object from
  `SettingsStorage.get()`, `importAllData()` writes it back via
  `SettingsStorage.save({...SettingsStorage.defaults, ...data.settings})`).
  Verified, not touched.

**Runtime flag module** — `src/theme/motionPreference.ts` (new file)
Mirrors the module-level-flag pattern from `src/sound/haptics.ts`
(`setHapticsEnabled`/gated) and `soundManager.ts` (`setSoundEnabled`), but
with no async permission gating — just a boolean other modules read
synchronously:
```ts
export function setReducedMotionEnabled(enabled: boolean): void;
export function isReducedMotionEnabled(): boolean;
```
Module-level flag defaults to `false`. Does not import Reanimated or touch
any component — it is only the flag.

**Init wiring**
- `App.tsx`: in the existing `useEffect` that calls `SettingsStorage.get().then(s => {...})`
  (alongside `setSoundEnabled(s.soundEnabled)` / `setHapticsEnabled(s.hapticsEnabled)`),
  added `setReducedMotionEnabled(s.reducedMotionEnabled)`.
- `src/screens/SettingsScreen.tsx`: added a `SwitchRow` labeled "Reduce motion"
  directly under the existing "Haptics" row, wired to
  `update({ reducedMotionEnabled: v })`. The screen's `update()` function
  (which patches state + persists + syncs runtime flags) now also calls
  `setReducedMotionEnabled(patch.reducedMotionEnabled)` when that key is
  present in the patch, matching how `soundEnabled`/`hapticsEnabled` are
  handled there.

**Contract for Animation Agent — what "reduced" means and what to gate**
(This is intent/scope, not prescribed code — implementation approach is
yours to own.)

1. **Screen-entrance choreography**: every Reanimated `entering={FadeInDown...}`
   / `ZoomIn` / `FadeIn` / etc. prop across `src/screens/` and
   `src/components/` should, when `isReducedMotionEnabled()` is true, either
   be omitted entirely (content just appears) or use a near-zero-duration
   variant. This includes staggered entrances driven by `STAGGER_MS` delays
   (e.g. `FadeInDown.delay(i * STAGGER_MS)`) — the delay should collapse to
   0 too, not just the animation duration, otherwise list items still visibly
   cascade in one at a time.
2. **Celebratory/decorative effects**: `Confetti`, `EventStinger`,
   `ScreenFlash`, and similar non-essential flourishes (pulse rings on the
   win screen, `useShake` shake effects, etc.) should be skipped outright or
   fast-forwarded to their end state rather than played at full length.
3. **Out of scope / do not gate**: functional motion that *communicates
   state* — spring feedback on `PressableScale` press, `SwitchRow` thumb
   slide, `CheckoutBanner` breathing dot, key press scale-down — is not
   required to be gated by this flag. Reduced motion here targets
   ambient/decorative animation and screen-entrance choreography, not core
   tactile feedback. Use judgment on edge cases (e.g. `CricketMark` pop,
   `LifeDots` collapse) — these lean functional (they convey game state
   changes) but are also flourish-heavy; your call.
4. `MountReveal` (core-RN-Animated launch-safe entrance, used on
   `HomeScreen` and anything visible at app start) is a special case per
   `CLAUDE.md`'s hard rule about Reanimated `entering=` hanging at splash —
   don't swap its mechanism, but it's reasonable to shorten/skip its
   fade+rise when the flag is set, same intent as bullet 1.
5. Read the flag with `isReducedMotionEnabled()` from
   `src/theme/motionPreference.ts` at the point of use (e.g. inside a
   component's render, or when constructing an `entering=` prop) — it's a
   synchronous plain function, no subscription/listener exists. If a
   component needs to react to the setting changing while mounted (e.g.
   SettingsScreen itself, or a currently-visible screen), pull the current
   value fresh; there's no event emitter to subscribe to, by design (matches
   the haptics/sound flag pattern, which has the same limitation).

---

## Animation Agent — implementation (fill in below)

*(pending — do not start until the Logic section above is filled in)*
