# DartMasters Bug Log

## Fixed Bugs

### 1. iOS Camera Shutter Sound During Frame Captures
**Commit:** `0a1d2a1`
**Issue:** iOS camera was producing audible shutter sounds during motion-detection frame captures, creating unwanted noise during gameplay.
**Root Cause:** Motion-detection captures had `shutterSound: false`, but the main dart-detection photo capture did not.
**Fix:** Added `shutterSound: false` to the main photo capture in `detectDarts()` function.
**Status:** ✅ Fixed

### 2. Checkout Announcement Overlap
**Commit:** `dafca3f`
**Issue:** When a dart completes a leg (checkout), the score-number announcer clip and "GAME SHOT" announcement could overlap, creating audio confusion.
**Root Cause:** While the code correctly skipped score announcements on checkout, there was no explicit cancellation of any pending announcements before playing the game shot.
**Fix:** 
- Added `cancelAnnouncements()` function to dartAnnouncer.ts that increments sequenceToken and stops any currently playing clip
- Called `cancelAnnouncements()` before `announceGameShot()` in X01GameScreen's `finishVisit()` function
**Status:** ✅ Fixed

### 3. iOS Silent Mode Audio Configuration
**Status:** ✅ Already Fixed
**Note:** Both `App.tsx` and `src/utils/dartAnnouncer.ts` already have `Audio.setAudioModeAsync()` with `playsInSilentModeIOS: true` configured.

### 4. Missing Error Handling for MatchStorage.save
**Commit:** `187f345`
**Issue:** When a match is completed, if AsyncStorage.save() fails, the app gets stuck on the game screen without navigating to the summary screen.
**Root Cause:** All game screens called `MatchStorage.save().then()` without `.catch()` handlers, so failures were silently ignored.
**Fix:** Added `.catch()` handlers to all game screen finalizeMatch functions that log the error and proceed with navigation regardless. Ensures the app doesn't get stuck even if storage fails.
**Affected Screens:** X01, Cricket, Killer, Practice170, AroundTheClock, Bobs27, Shanghai
**Status:** ✅ Fixed

### 5. Uncleared Pending Timeouts on Component Unmount
**Commit:** `86d8d14`
**Issue:** When user navigates away during a bust display timeout, setState calls execute on unmounted component causing React warning: "Can't perform a React state update on an unmounted component."
**Root Cause:** X01GameScreen and Practice170GameScreen had setTimeout calls in tapDart handler with no cleanup mechanism. If component unmounts before timeout completes, the callback still executes.
**Fix:** Added pendingTimeoutsRef and scheduleTimeout helper that tracks all pending timeouts. Cleanup useEffect clears all timeouts when component unmounts.
**Affected Screens:** X01GameScreen, Practice170GameScreen
**Status:** ✅ Fixed

### 6. Missing Error Handling for HomeScreen Data Loading
**Commit:** `0505bbe`
**Issue:** If PlayerStorage.getAll(), MatchStorage.getAll(), or ActiveMatchStorage.get() fail, HomeScreen would not load any data, appearing blank to the user.
**Root Cause:** Promise.all() had no .catch() handler, so if any storage operation failed, the entire Promise would reject silently and state would remain empty.
**Fix:** Added .catch() handlers to both Promise.all() and computeDailyChallengeReport() to explicitly set state to empty values when errors occur.
**Status:** ✅ Fixed

## Verification Results

### Visual Overhaul (Fable 5) Safety Check
**Branch Checked:** visual-upgrade-v2
**Files Modified:** Only UI components and styling
- CricketGameScreen: CricketMark component visual enhancement
- KillerGameScreen: LifeDots component visual enhancement
- Practice170GameScreen: Breathing ring animation
- Other screens: Minor visual updates only

**Game Logic Verification:** No changes to `src/logic/` directory or game-core logic files
**Camera Code Verification:** No changes to `src/screens/CameraScoringScreen.tsx`
**Conclusion:** ✅ Visual overhaul is safe - no core game logic or camera functionality altered

## Testing Notes

### Remaining Manual Testing Required
The following flows need to be tested end-to-end in Expo Go on actual iOS/Android devices:

#### Game Modes to Test:
1. **501/301/201 (X01)** - Primary game mode
2. **Cricket** - Closing target segments
3. **Around the Clock** - Sequential segment progression
4. **Killer** - Life elimination mechanics
5. **Practice 170** - Single-leg maximum training
6. **Shanghai** - Multi-round pattern
7. **Bob's 27** - Combination rounds

#### Flows to Verify for Each Mode:
- ✅ **Checkout Flow:** Final dart completing leg, "GAME SHOT" plays without score overlap
- ✅ **Bust Flow:** Invalid score, screen flash, proper state reset
- ✅ **Win Flow:** Match completion, confetti animation, summary statistics

**Note:** Due to environment constraints, device-based manual testing with Expo Go is recommended to confirm audio mixing, haptic feedback, and animation playback on real hardware.
