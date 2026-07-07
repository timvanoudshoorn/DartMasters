# Audio Pipeline Generation Log

## 2026-07-07 — Announcer System Overhaul

### Task 1: Generate 180 Individual Announcer Clips

**Status:** In Progress

**Objective:** Replace the existing 39-clip combo-chaining logic with 180 individual score-specific announcer clips (1–180) using Higgsfield API text2speech_v2 with elevenlabs variant and Harrison voice.

**Script Created:** scripts/generateAnnouncer.js
- Follows existing downloadAnnouncer.js pattern (file download + asset management)
- Generates ALL CAPS prompts with exclamation marks (e.g., "ONE!", "TWENTY ONE!", "ONE HUNDRED EIGHTY!")
- Special handling: score 100 = "ONE HUNDRED!" (not "TON" or "HUNDRED")
- Dry-run tested: all 180 prompts verified correct
- Number-to-words conversion tested for edge cases (1–9, 10–19, 20–99, 100, 101–119, 120–180)

**Parameters:**
- Model: 	ext2speech_v2
- Variant: elevenlabs
- Voice ID: 573e5163-59b3-4926-aab1-951ef2985f81 (Harrison)
- Delivery: ALL CAPS with exclamation marks, no commentary phrases

**API Call Pattern:**
```
POST https://api.higgsfield.ai/v1/audio/generate
Authorization: Bearer {HIGGSFIELD_API_KEY}
{
  "params": {
    "model": "text2speech_v2",
    "prompt": "<SCORE TEXT>",
    "voice_type": "preset",
    "voice_id": "573e5163-59b3-4926-aab1-951ef2985f81",
    "variant": "elevenlabs",
    "count": 1
  }
}
```

**Next Steps:**
1. Execute generation script with HIGGSFIELD_API_KEY
2. Collect generated URLs and update scripts/downloadAnnouncer.js
3. Run 
pm run build to ensure clips load in assets
4. Delete old 39-clip building blocks once new clips confirmed present
5. Delete old combo-chaining logic from announcer system

---

## Pending Commits

- [ ] Add generateAnnouncer.js script
- [ ] Update downloadAnnouncer.js with 180 generated clip URLs
- [ ] Remove old combo-chaining announcer logic
- [ ] Verify sound volumes match CLAUDE.md spec (dart_hit, tap, bust, max_score, checkout, killer, eliminated, win)
