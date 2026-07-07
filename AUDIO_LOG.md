# Audio Pipeline Generation Log

## 2026-07-07 — Announcer System Overhaul

### Task 1: Generate 180 Individual Announcer Clips

**Status:** Script Ready — Awaiting Generation

**Objective:** Regenerate 180 individual score-specific announcer clips (1–180) using Higgsfield API text2speech_v2 with elevanlabs variant and Harrison voice.

**Infrastructure:** 
- dartAnnouncer.ts already loads all 180 score files (score_1.mp3–score_180.mp3)
- Assets directory contains all 183 files (180 scores + 3 sfx: bust, game_on, game_shot)
- Individual announcer playback implemented and working

**Script Created:** `scripts/generateAnnouncer.js`
- Follows existing `downloadAnnouncer.js` pattern (file download + asset management)
- Generates ALL CAPS prompts with exclamation marks (e.g., "ONE!", "TWENTY ONE!", "ONE HUNDRED EIGHTY!")
- Special handling: score 100 = "ONE HUNDRED!" (not "TON" or "HUNDRED")
- Dry-run tested: all 180 number-to-words conversions verified correct
- Number-to-words conversion tested for edge cases (1–9, 10–19, 20–99, 100, 101–119, 120–180)

**Generation Parameters:**
- Model: `text2speech_v2`
- Variant: `elevanlabs`
- Voice ID: `573e5163-59b3-4926-aab1-951ef2985f81` (Harrison)
- Delivery: ALL CAPS with exclamation marks, no commentary phrases

**API Endpoint:** `POST https://api.higgsfield.ai/v1/audio/generate`

**Usage:**
```bash
# Dry run: validate prompts
node scripts/generateAnnouncer.js --dry-run

# Full generation (requires HIGGSFIELD_API_KEY env var)
HIGGSFIELD_API_KEY=<key> node scripts/generateAnnouncer.js
```

**Next Steps:**
1. Execute generation script with HIGGSFIELD_API_KEY
2. Collect generated URLs and verify all 180 clips created
3. Run `npm run build` to ensure clips load in assets
4. Verify sound volumes for dart_hit, tap, bust, max_score, checkout, killer, eliminated, win

---

## Pending Tasks

- [ ] Generate 180 announcer clips via script
- [ ] Verify all clips present and play correctly
- [ ] Check sound effect volumes match CLAUDE.md spec
