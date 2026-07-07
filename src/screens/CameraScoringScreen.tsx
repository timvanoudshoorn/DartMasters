import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GestureEvent,
  HandlerStateChangeEvent,
  PinchGestureHandler,
  PinchGestureHandlerEventPayload,
  State,
} from 'react-native-gesture-handler';
import { Circle, Svg } from 'react-native-svg';
import { PlayStackParamList } from '../navigation/types';
import { FONT } from '../theme/colors';
import { Dart, Multiplier } from '../types';

// Debug mode: when true, every frame sent to the Vision API is also saved
// to a "DartMasters Debug" photo album and its raw response is logged, so
// detection accuracy can be inspected against the exact image analyzed.
const DEBUG_SAVE_FRAMES = true;
const DEBUG_ALBUM_NAME = 'DartMasters Debug';

type Route = { params: { onConfirm: (darts: Dart[]) => void } };

// Local design tokens for this screen, matching the app's dark/accent language.
const COLORS = {
  bg: '#0A0A0A',
  card: '#1A1A1A',
  card2: '#242424',
  border: 'rgba(255,255,255,0.1)',
  accent: '#FF6B2B',
  text: '#FFFFFF',
  textSecondary: '#888888',
  bust: '#FF3B30',
};

const SYSTEM_PROMPT =
  'You are a dart scoring assistant. Analyze dartboard images and return ONLY valid JSON. Never return anything else.';

const USER_PROMPT =
  'This is a dartboard, likely photographed from an angled (non-perpendicular) camera position rather than straight-on. Because of this, the board\'s rings are ellipses, not circles: the ring nearest the camera looks wider and the ring farthest from the camera looks much thinner or can even seem to disappear. Do NOT judge double/triple ring membership by absolute pixel width alone — instead, for each dart, compare its distance from the board center to the local ring boundaries on the SAME side of the board (same angle from center), since ring width varies by position under perspective. The board has numbered segments 1-20 arranged in a specific clockwise order: starting from the top and going clockwise: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5. Look carefully for metal dart shafts or dart tips embedded in the board. Each dart will appear as a thin metallic object sticking out of the board surface. For each dart you can see: identify which numbered segment it landed in, whether it is in the thin outer ring (double = score x2), thin inner ring (triple = score x3), large outer section (single = score x1), outer bull circle (25 points), or inner bull circle (50 points). Only count darts that are physically stuck in the board. If the viewing angle is too oblique to confidently distinguish a ring boundary for a dart, set "confidence" to "low" and say so in "notes" rather than guessing. Return ONLY valid JSON, no other text: {"darts": [{"segment": 20, "multiplier": 1, "score": 20, "description": "Single 20"}], "total": 20, "confidence": "high", "notes": "1 dart detected"}';

// Device pitch (forward/back tilt) beyond this many degrees from level
// makes the board's rings foreshorten enough to confuse detection.
const TILT_GOOD_DEG = 10;
const TILT_WARN_DEG = 25;

interface DetectedDart {
  segment: number;
  multiplier: number;
  score: number;
  description: string;
}

interface DetectionResult {
  darts: DetectedDart[];
  total: number;
  confidence?: string;
  notes?: string;
}

type Status = 'idle' | 'waiting_for_stillness' | 'analyzing' | 'result' | 'error';

const MAX_ZOOM = 0.8;
const MOTION_SAMPLE_INTERVAL_MS = 800;
const MOTION_SAMPLE_QUALITY = 0.05;
const MOTION_SAMPLE_COUNT = 50;
const MOTION_THRESHOLD = 300; // difference above this = movement detected
const STILLNESS_THRESHOLD = 150; // difference below this = still
const STILLNESS_FRAMES_NEEDED = 3; // consecutive still frames before triggering (3 x 800ms = ~2.4s of stillness)
const NO_MOVEMENT_HINT_MS = 10000;
const ERROR_RETRY_SECONDS = 3;

const NUMBER_GRID_ROWS = [
  [20, 1, 18, 4, 13],
  [6, 10, 15, 2, 17],
  [3, 19, 7, 16, 8],
  [11, 14, 9, 12, 5],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Cheap brightness fingerprint: sum the char codes of 50 evenly spaced
// samples across the base64 string rather than decoding actual pixels.
function computeFingerprint(base64: string): number {
  const len = base64.length;
  if (len === 0) return 0;
  let sum = 0;
  for (let i = 0; i < MOTION_SAMPLE_COUNT; i++) {
    const idx = Math.min(Math.floor((i / MOTION_SAMPLE_COUNT) * len), len - 1);
    sum += base64.charCodeAt(idx);
  }
  return sum;
}

let debugPermissionDeniedAlertShown = false;

// Best-effort debug-only side effect: saves a copy of an analyzed frame to a
// dedicated photo album. Never throws — must not affect the real scoring flow.
async function saveDebugFrame(uri: string): Promise<void> {
  try {
    const current = await MediaLibrary.getPermissionsAsync();
    let granted = current.status === 'granted';

    if (!granted && current.canAskAgain) {
      const requested = await MediaLibrary.requestPermissionsAsync();
      granted = requested.status === 'granted';
    }

    if (!granted) {
      if (!debugPermissionDeniedAlertShown) {
        debugPermissionDeniedAlertShown = true;
        Alert.alert(
          'Debug saving disabled',
          'Media library permission was denied, so debug capture frames cannot be saved to your photo library.'
        );
      }
      return;
    }

    const asset = await MediaLibrary.createAssetAsync(uri);
    const album = await MediaLibrary.getAlbumAsync(DEBUG_ALBUM_NAME);
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync(DEBUG_ALBUM_NAME, asset, false);
    }
  } catch (err) {
    console.error('[CameraScoring][debug] Failed to save debug frame:', err);
  }
}

export function CameraScoringScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const route = useRoute() as unknown as Route;
  const { onConfirm } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCountdown, setErrorCountdown] = useState(ERROR_RETRY_SECONDS);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const [zoom, setZoom] = useState(0);
  const baseZoomRef = useRef(0);
  const zoomIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const zoomFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busyRef = useRef(false);
  const capturingRef = useRef(false);
  const cameraReadyRef = useRef(false);
  const prevFingerprintRef = useRef<number | null>(null);
  const stillnessCountRef = useRef(0);
  const everMovedRef = useRef(false);
  const idleHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showNoMovementHint, setShowNoMovementHint] = useState(false);

  const [manualEntry, setManualEntry] = useState(false);
  const [manualDarts, setManualDarts] = useState<Dart[]>([]);
  const [manualMultiplier, setManualMultiplier] = useState<Multiplier>(1);

  const [tiltDeg, setTiltDeg] = useState<number | null>(null);

  useEffect(() => {
    if (!permission?.granted) return;
    DeviceMotion.setUpdateInterval(300);
    const sub = DeviceMotion.addListener((measurement: DeviceMotionMeasurement) => {
      const beta = measurement.rotation?.beta;
      if (typeof beta !== 'number') return;
      setTiltDeg(Math.abs(beta * (180 / Math.PI)));
    });
    return () => sub.remove();
  }, [permission?.granted]);

  const tiltGuidance: { label: string; ok: boolean } | null =
    tiltDeg === null
      ? null
      : tiltDeg <= TILT_GOOD_DEG
      ? { label: 'Good angle — hold steady', ok: true }
      : tiltDeg <= TILT_WARN_DEG
      ? { label: 'Level the phone with the board for better accuracy', ok: false }
      : { label: 'Too steep — mount level with the board center', ok: false };

  const detectDarts = async () => {
    if (!cameraRef.current) return;
    busyRef.current = true;
    setStatus('analyzing');
    setErrorMessage('');

    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      console.warn('[CameraScoring] EXPO_PUBLIC_ANTHROPIC_API_KEY is missing — add it to your .env file.');
      setErrorMessage('No API key configured. Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file.');
      setStatus('error');
      busyRef.current = false;
      return;
    }

    let photoBase64: string | undefined;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8, shutterSound: false });
      photoBase64 = photo?.base64;
      if (DEBUG_SAVE_FRAMES && photo?.uri) {
        saveDebugFrame(photo.uri).catch(() => {});
      }
    } catch {
      setErrorMessage('Could not capture a photo. Try again.');
      setStatus('error');
      busyRef.current = false;
      return;
    }
    if (!photoBase64) {
      setErrorMessage('Could not capture a photo. Try again.');
      setStatus('error');
      busyRef.current = false;
      return;
    }

    let responseText: string;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5-0',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photoBase64 } },
                { type: 'text', text: USER_PROMPT },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        setErrorMessage('Could not detect darts. Try better lighting or angle.');
        setStatus('error');
        busyRef.current = false;
        return;
      }

      const data = await response.json();
      responseText = data?.content?.[0]?.text ?? '';
    } catch {
      setErrorMessage('Network error — check your connection and try again.');
      setStatus('error');
      busyRef.current = false;
      return;
    }

    if (DEBUG_SAVE_FRAMES) {
      console.log(`[CameraScoring][debug] ${new Date().toISOString()} — raw API response:`, responseText);
    }

    const parsed = parseDetectionResult(responseText);
    if (!parsed) {
      setErrorMessage('Could not detect darts. Try better lighting or angle.');
      setStatus('error');
      busyRef.current = false;
      return;
    }

    setResult(parsed);
    setStatus('result');
    busyRef.current = false;
  };

  const detectDartsRef = useRef(detectDarts);
  detectDartsRef.current = detectDarts;

  const checkMotion = async () => {
    if (!cameraRef.current || !cameraReadyRef.current || busyRef.current || capturingRef.current) return;
    if (status !== 'idle' && status !== 'waiting_for_stillness') return;

    capturingRef.current = true;
    let frame: string | undefined;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: MOTION_SAMPLE_QUALITY,
        base64: true,
        skipProcessing: true,
        shutterSound: false,
      });
      frame = photo?.base64;
    } catch {
      capturingRef.current = false;
      return;
    }
    capturingRef.current = false;
    if (busyRef.current || !frame) return;
    if (status !== 'idle' && status !== 'waiting_for_stillness') return;

    const fingerprint = computeFingerprint(frame);
    const prev = prevFingerprintRef.current;
    prevFingerprintRef.current = fingerprint;
    if (prev === null) return; // skip the very first comparison, no previous frame yet

    const diff = Math.abs(fingerprint - prev);

    console.log(`Frame diff: ${diff} | State: ${status.toUpperCase()} | Stillness count: ${stillnessCountRef.current}`);

    if (status === 'idle') {
      if (diff > MOTION_THRESHOLD) {
        everMovedRef.current = true;
        stillnessCountRef.current = 0;
        setShowNoMovementHint(false);
        setStatus('waiting_for_stillness');
      }
    } else if (status === 'waiting_for_stillness') {
      if (diff >= STILLNESS_THRESHOLD) {
        stillnessCountRef.current = 0;
      } else {
        stillnessCountRef.current += 1;
        if (stillnessCountRef.current >= STILLNESS_FRAMES_NEEDED) {
          stillnessCountRef.current = 0;
          prevFingerprintRef.current = null;
          detectDartsRef.current();
        }
      }
    }
  };

  const checkMotionRef = useRef(checkMotion);
  checkMotionRef.current = checkMotion;

  useEffect(() => {
    if (!permission?.granted) return;
    const id = setInterval(() => {
      checkMotionRef.current();
    }, MOTION_SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [permission?.granted]);

  const retake = () => {
    setResult(null);
    setErrorMessage('');
    setManualEntry(false);
    setManualDarts([]);
    setManualMultiplier(1);
    prevFingerprintRef.current = null;
    stillnessCountRef.current = 0;
    busyRef.current = false;
    setStatus('idle');
  };

  const startManualEntry = () => {
    setManualDarts([]);
    setManualMultiplier(1);
    setManualEntry(true);
  };

  const cancelManualEntry = () => {
    setManualEntry(false);
    setManualDarts([]);
    setManualMultiplier(1);
  };

  const tapManualSegment = (segment: number) => {
    if (manualDarts.length >= 3) return;
    const effectiveMultiplier = segment === 25 ? (Math.min(manualMultiplier, 2) as Multiplier) : manualMultiplier;
    setManualDarts((prev) => [...prev, { segment, multiplier: effectiveMultiplier }]);
    setManualMultiplier(1);
  };

  const tapManualMiss = () => {
    if (manualDarts.length >= 3) return;
    setManualDarts((prev) => [...prev, { segment: 0, multiplier: 1 }]);
    setManualMultiplier(1);
  };

  const undoManualDart = () => {
    setManualDarts((prev) => prev.slice(0, -1));
  };

  const confirmManualDarts = () => {
    if (manualDarts.length === 0) return;
    onConfirm(manualDarts);
    navigation.goBack();
  };

  const resumeAfterError = () => {
    setErrorMessage('');
    prevFingerprintRef.current = null;
    stillnessCountRef.current = 0;
    busyRef.current = false;
    setStatus('waiting_for_stillness');
  };

  useEffect(() => {
    if (status !== 'error') return;
    setErrorCountdown(ERROR_RETRY_SECONDS);
    const countdownId = setInterval(() => {
      setErrorCountdown((s) => Math.max(0, s - 1));
    }, 1000);
    const timeoutId = setTimeout(() => {
      resumeAfterError();
    }, ERROR_RETRY_SECONDS * 1000);
    return () => {
      clearInterval(countdownId);
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status !== 'idle' || everMovedRef.current) {
      setShowNoMovementHint(false);
      if (idleHintTimeoutRef.current) {
        clearTimeout(idleHintTimeoutRef.current);
        idleHintTimeoutRef.current = null;
      }
      return;
    }
    idleHintTimeoutRef.current = setTimeout(() => {
      setShowNoMovementHint(true);
    }, NO_MOVEMENT_HINT_MS);
    return () => {
      if (idleHintTimeoutRef.current) clearTimeout(idleHintTimeoutRef.current);
    };
  }, [status]);

  const useThisScore = () => {
    if (!result) return;
    const darts: Dart[] = result.darts.slice(0, 3).map((d) => ({
      segment: clampSegment(d.segment),
      multiplier: clampMultiplier(d.segment, d.multiplier),
    }));
    onConfirm(darts);
    navigation.goBack();
  };

  const showZoomIndicator = () => {
    if (zoomFadeTimeoutRef.current) clearTimeout(zoomFadeTimeoutRef.current);
    zoomIndicatorOpacity.setValue(1);
    zoomFadeTimeoutRef.current = setTimeout(() => {
      Animated.timing(zoomIndicatorOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, 2000);
  };

  const onPinchGestureEvent = (event: GestureEvent<PinchGestureHandlerEventPayload>) => {
    const { scale } = event.nativeEvent;
    const next = clamp(baseZoomRef.current + (scale - 1) * 0.5, 0, MAX_ZOOM);
    setZoom(next);
    showZoomIndicator();
  };

  const onPinchHandlerStateChange = (event: HandlerStateChangeEvent<PinchGestureHandlerEventPayload>) => {
    if (event.nativeEvent.state === State.BEGAN || event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
      baseZoomRef.current = zoom;
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionText}>
            DartMasters needs your camera to detect darts on the board.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>GRANT CAMERA ACCESS</Text>
          </Pressable>
          <Pressable style={styles.cancelLink} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {status !== 'result' && (
        <PinchGestureHandler onGestureEvent={onPinchGestureEvent} onHandlerStateChange={onPinchHandlerStateChange}>
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              zoom={zoom}
              mute
              onCameraReady={() => {
                cameraReadyRef.current = true;
              }}
            />
          </View>
        </PinchGestureHandler>
      )}

      {status !== 'result' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <Circle cx={50} cy={50} r={32} stroke={COLORS.accent} strokeWidth={1.2} strokeOpacity={0.6} fill="none" />
          </Svg>
        </View>
      )}

      <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()} hitSlop={10}>
        <Text style={styles.cancelBtnText}>✕ Cancel</Text>
      </Pressable>

      {status !== 'result' && (
        <Animated.View style={[styles.zoomIndicator, { opacity: zoomIndicatorOpacity }]} pointerEvents="none">
          <Text style={styles.zoomIndicatorText}>{(1 + zoom).toFixed(1)}x</Text>
        </Animated.View>
      )}

      {status === 'idle' && (
        <View style={styles.bottomBar}>
          <Text style={styles.statusText}>
            {showNoMovementHint
              ? 'Try moving closer to the board'
              : everMovedRef.current
              ? 'Ready — throw your darts'
              : 'Point camera at dartboard'}
          </Text>
          {tiltGuidance && (
            <Text style={[styles.statusText, !tiltGuidance.ok && styles.tiltWarnText]}>{tiltGuidance.label}</Text>
          )}
        </View>
      )}

      {status === 'waiting_for_stillness' && (
        <View style={styles.bottomBar}>
          <Text style={styles.statusText}>Darts landing...</Text>
        </View>
      )}

      {status === 'analyzing' && (
        <View style={styles.bottomBar}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={[styles.statusText, { marginTop: 10 }]}>Analyzing board...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.bottomBar}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.statusText}>Could not read board — retaking in {errorCountdown}s...</Text>
        </View>
      )}

      {status === 'result' && result && !manualEntry && (
        <View style={styles.resultPanel}>
          <Text style={styles.resultLabel}>DETECTED</Text>
          <Text style={styles.resultTotal}>{result.total}</Text>

          <View style={styles.dartList}>
            {result.darts.length === 0 ? (
              <Text style={styles.dartItemText}>No darts detected</Text>
            ) : (
              result.darts.map((d, i) => (
                <View key={i} style={styles.dartItem}>
                  <Text style={styles.dartItemText}>{d.description}</Text>
                  <Text style={styles.dartItemScore}>{d.score}</Text>
                </View>
              ))
            )}
          </View>

          {result.notes ? <Text style={styles.notesText}>{result.notes}</Text> : null}

          <View style={styles.resultActions}>
            <Pressable style={styles.secondaryBtn} onPress={retake}>
              <Text style={styles.secondaryBtnText}>RETAKE</Text>
            </Pressable>
            <Pressable style={[styles.detectBtn, { flex: 1 }]} onPress={useThisScore}>
              <Text style={styles.detectBtnText}>USE THIS SCORE</Text>
            </Pressable>
          </View>

          <Pressable style={styles.manualLink} onPress={startManualEntry} hitSlop={8}>
            <Text style={styles.manualLinkText}>Wrong? Enter manually</Text>
          </Pressable>
        </View>
      )}

      {status === 'result' && result && manualEntry && (
        <View style={styles.resultPanel}>
          <View style={styles.manualHeaderRow}>
            <Text style={styles.resultLabel}>ENTER SCORE MANUALLY</Text>
            <Pressable onPress={cancelManualEntry} hitSlop={8}>
              <Text style={styles.manualBackText}>Back to detected</Text>
            </Pressable>
          </View>

          <View style={styles.dartSlotsRow}>
            {Array.from({ length: 3 }).map((_, i) => {
              const dart = manualDarts[i];
              return (
                <View key={i} style={[styles.dartSlot, dart && styles.dartSlotFilled]}>
                  <Text style={[styles.dartSlotText, dart && styles.dartSlotTextFilled]}>
                    {dart ? dartLabel(dart) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.multiplierRow}>
            {(
              [
                { value: 1, label: 'SINGLE' },
                { value: 2, label: 'DOUBLE' },
                { value: 3, label: 'TRIPLE' },
              ] as { value: Multiplier; label: string }[]
            ).map((opt) => {
              const active = manualMultiplier === opt.value;
              const disabled = manualDarts.length >= 3;
              return (
                <Pressable
                  key={opt.value}
                  disabled={disabled}
                  onPress={() => setManualMultiplier(opt.value)}
                  style={[styles.multiplierBtn, active && styles.multiplierBtnActive, disabled && styles.disabled]}
                >
                  <Text style={[styles.multiplierBtnText, active && styles.multiplierBtnTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.numberGrid}>
            {NUMBER_GRID_ROWS.map((row, ri) => (
              <View key={ri} style={styles.numberGridRow}>
                {row.map((n) => (
                  <Pressable
                    key={n}
                    disabled={manualDarts.length >= 3}
                    onPress={() => tapManualSegment(n)}
                    style={[styles.numberBtn, n === 20 && styles.numberBtnSpecial, manualDarts.length >= 3 && styles.disabled]}
                  >
                    <Text style={[styles.numberBtnText, n === 20 && styles.numberBtnTextSpecial]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.bottomRow}>
            <Pressable
              disabled={manualDarts.length >= 3}
              onPress={() => tapManualSegment(25)}
              style={[styles.bottomBtn, styles.bullBtn, manualDarts.length >= 3 && styles.disabled]}
            >
              <Text style={styles.bullBtnText}>BULL{manualMultiplier >= 2 ? ' (D)' : ''}</Text>
            </Pressable>
            <Pressable
              disabled={manualDarts.length >= 3}
              onPress={tapManualMiss}
              style={[styles.bottomBtn, styles.missBtn, manualDarts.length >= 3 && styles.disabled]}
            >
              <Text style={styles.missBtnText}>MISS</Text>
            </Pressable>
          </View>

          <View style={styles.resultActions}>
            <Pressable
              style={[styles.secondaryBtn, manualDarts.length === 0 && styles.disabled]}
              onPress={undoManualDart}
              disabled={manualDarts.length === 0}
            >
              <Text style={styles.secondaryBtnText}>UNDO</Text>
            </Pressable>
            <Pressable
              style={[styles.detectBtn, { flex: 1 }, manualDarts.length === 0 && styles.disabled]}
              onPress={confirmManualDarts}
              disabled={manualDarts.length === 0}
            >
              <Text style={styles.detectBtnText}>CONFIRM SCORE</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function parseDetectionResult(text: string): DetectionResult | null {
  try {
    const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
    const data = JSON.parse(jsonStr);
    if (!data || !Array.isArray(data.darts) || typeof data.total !== 'number') return null;

    const darts: DetectedDart[] = data.darts
      .filter((d: any) => d && typeof d.segment === 'number')
      .map((d: any) => ({
        segment: d.segment,
        multiplier: typeof d.multiplier === 'number' ? d.multiplier : 1,
        score: typeof d.score === 'number' ? d.score : 0,
        description: typeof d.description === 'string' ? d.description : `Segment ${d.segment}`,
      }));

    return { darts, total: data.total, confidence: data.confidence, notes: data.notes };
  } catch {
    return null;
  }
}

function clampSegment(segment: number): number {
  if (segment === 25) return 25;
  const n = Math.round(segment);
  return n >= 1 && n <= 20 ? n : 0;
}

function clampMultiplier(segment: number, multiplier: number): Multiplier {
  const m = Math.round(multiplier) || 1;
  const max = segment === 25 ? 2 : 3;
  return Math.min(Math.max(m, 1), max) as Multiplier;
}

function dartLabel(d: Dart): string {
  if (d.segment === 0) return 'MISS';
  const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : 'S';
  if (d.segment === 25) return d.multiplier === 2 ? 'DBULL' : 'BULL';
  return `${prefix}${d.segment}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  cancelBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    color: COLORS.text,
    fontFamily: FONT.regular,
    fontSize: 13,
  },
  zoomIndicator: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  zoomIndicatorText: {
    color: COLORS.accent,
    fontFamily: FONT.score,
    fontSize: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
    alignItems: 'center',
  },
  statusText: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  tiltWarnText: {
    color: COLORS.accent,
    marginTop: 4,
  },
  errorText: {
    color: COLORS.bust,
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  detectBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  detectBtnText: {
    fontFamily: FONT.score,
    fontSize: 20,
    color: COLORS.text,
    letterSpacing: 1,
  },
  resultPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
    alignItems: 'center',
  },
  resultLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONT.ui,
    fontSize: 11,
    letterSpacing: 2,
  },
  resultTotal: {
    color: COLORS.accent,
    fontFamily: FONT.score,
    fontSize: 64,
    lineHeight: 60,
    marginVertical: 4,
  },
  dartList: {
    width: '100%',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  dartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card2,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dartItemText: {
    color: COLORS.text,
    fontFamily: FONT.regular,
    fontSize: 14,
  },
  dartItemScore: {
    color: COLORS.accent,
    fontFamily: FONT.ui,
    fontSize: 14,
  },
  notesText: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  secondaryBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontFamily: FONT.ui,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: COLORS.text,
    fontFamily: FONT.ui,
    fontSize: 18,
    marginBottom: 8,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: FONT.score,
    fontSize: 18,
    color: COLORS.text,
    letterSpacing: 1,
  },
  cancelLink: {
    marginTop: 16,
    padding: 8,
  },
  cancelLinkText: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 13,
  },
  manualLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  manualLinkText: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  manualHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  manualBackText: {
    color: COLORS.accent,
    fontFamily: FONT.regular,
    fontSize: 12,
  },
  dartSlotsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginBottom: 12,
  },
  dartSlot: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dartSlotFilled: {
    backgroundColor: COLORS.card2,
    borderColor: COLORS.accent,
  },
  dartSlotText: {
    fontFamily: FONT.ui,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dartSlotTextFilled: {
    color: COLORS.text,
  },
  multiplierRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginBottom: 10,
  },
  multiplierBtn: {
    flex: 1,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  multiplierBtnActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(255,107,43,0.12)',
  },
  multiplierBtnText: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  multiplierBtnTextActive: {
    color: COLORS.accent,
  },
  numberGrid: {
    gap: 6,
    width: '100%',
    marginBottom: 10,
  },
  numberGridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  numberBtn: {
    flex: 1,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  numberBtnSpecial: {
    borderColor: 'rgba(255,107,43,0.3)',
  },
  numberBtnText: {
    fontFamily: FONT.regular,
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.text,
  },
  numberBtnTextSpecial: {
    color: COLORS.accent,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginBottom: 12,
  },
  bottomBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  bullBtn: {
    backgroundColor: 'rgba(255,107,43,0.08)',
    borderColor: 'rgba(255,107,43,0.3)',
  },
  bullBtnText: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  missBtn: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderColor: 'rgba(255,59,48,0.25)',
  },
  missBtnText: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.bust,
    letterSpacing: 2,
  },
  disabled: {
    opacity: 0.4,
  },
});
