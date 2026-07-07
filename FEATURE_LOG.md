# Feature Build Log

Working branch: `feature-build` (backend/logic/systems only, no visual styling changes).

## Session 2026-07-07

### Camera detection accuracy (backlog #1)
- Debug frame logging was already in place (`DEBUG_SAVE_FRAMES` saves each
  analyzed frame to a "DartMasters Debug" photo album and logs the raw
  Vision API response).
- Root cause per brief: oblique camera angle foreshortens the ring
  ellipses, especially on the far side of the board from the camera.
  Two changes address this:
  - `USER_PROMPT` now explicitly tells the model the image is likely an
    oblique shot, explains that ring width varies by position under
    perspective, and instructs it to judge ring membership by radial
    distance on the same side of the board rather than absolute pixel
    width. It also asks for a "low" confidence + note instead of a guess
    when the angle is too oblique to tell.
  - Added live on-screen tilt guidance using `expo-sensors` `DeviceMotion`
    (device pitch/beta) shown during the idle/aiming phase, coaching the
    user to hold the phone level with the board before throwing — this
    reduces the very foreshortening that confuses detection. Installed
    `expo-sensors` via `npx expo install`.
