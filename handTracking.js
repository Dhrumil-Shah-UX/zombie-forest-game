import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

// All MediaPipe WASM assets are loaded from this CDN root.
const TASKS_VERSION = "0.10.32";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;

// The hand model is loaded from the official Google-hosted model bucket.
// Previous 404s happened because the model file is NOT shipped inside the
// @mediapipe/tasks-vision npm package path we hardcoded on jsDelivr.
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

// Toggle this to true for verbose per-frame logs.
const DEBUG = false;

/**
 * Initialize MediaPipe Hands on top of an existing webcam video element.
 *
 * Returns an object with:
 *   - getHandLandmarks(): latest landmark array for the first detected hand, or null.
 *
 * The onStatus callback receives "no hand" or "hand detected" when the detection state changes.
 */
export async function initHandTracking(videoEl, { onStatus } = {}) {
  let lastStatus = "no hand";
  function setStatus(status) {
    if (status === lastStatus) return;
    lastStatus = status;
    if (onStatus) onStatus(status);
  }

  try {
    console.log("[HandTracking] Loading vision WASM assets from", WASM_ROOT);
    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
    console.log("[HandTracking] Vision WASM loaded");

    let handLandmarker;
    try {
      console.log("[HandTracking] Loading hand landmarker model from", HAND_MODEL_URL);
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL,
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.45,
        minHandPresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
      console.log("[HandTracking] Hand model loaded");
    } catch (modelErr) {
      console.error("[HandTracking] Hand model load failure:", modelErr);
      setStatus("no hand");
      throw modelErr;
    }

    let latestLandmarks = null;
    let lastVideoTime = -1;
    let rawPointer = null;
    let filteredPointer = null; // low-pass stage before final smoothing
    let smoothPointer = null;

    // Hand presence / stability
    let handPresent = false;
    let handStable = false;
    let lastHandSeenTime = 0;
    let consecutivePresentFrames = 0;
    const HAND_GRACE_MS = 250;

    // Pinch detection state
    let isPinching = false;
    const pinchHistory = [];
    const PINCH_HISTORY_MAX = 3;
    let pinchOnFrames = 0;
    let pinchOffFrames = 0;
    const PINCH_ON = 0.48;
    const PINCH_OFF = 0.62;

    // Detection rate limiting
    const DETECT_FPS = 30;
    const DETECT_INTERVAL_MS = 1000 / DETECT_FPS;
    let lastDetectTime = 0;

    function detectForFrame(nowMs) {
      if (videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

      const currentTime = videoEl.currentTime;
      if (currentTime === lastVideoTime) return;
      lastVideoTime = currentTime;

      try {
        if (DEBUG) console.log("[HandTracking] Processing frame");
        const results = handLandmarker.detectForVideo(videoEl, nowMs);

        if (results.landmarks && results.landmarks.length > 0) {
          latestLandmarks = results.landmarks[0];
          if (DEBUG) console.log("[HandTracking] Landmarks found");

          // Update presence / stability timers.
          handPresent = true;
          lastHandSeenTime = nowMs;
          consecutivePresentFrames += 1;
          handStable = consecutivePresentFrames >= 3;

          // Robust pinch: thumb tip (4) vs index tip (8), DIP (7), PIP (6).
          // Hand scale = average of dist(0,5), dist(5,9), dist(0,17) when available.
          const thumbTip = latestLandmarks[4];
          const indexTip = latestLandmarks[8];
          const indexDip = latestLandmarks[7];
          const indexPip = latestLandmarks[6];
          const wrist = latestLandmarks[0];
          const indexMcp = latestLandmarks[5];
          const midMcp = latestLandmarks[9];
          const pinkyMcp = latestLandmarks[17];

          function dist2(a, b) {
            if (!a || !b) return 0;
            return Math.hypot(a.x - b.x, a.y - b.y);
          }

          if (thumbTip && indexTip && indexDip && indexPip) {
            const dTip = dist2(thumbTip, indexTip);
            const dDip = dist2(thumbTip, indexDip);
            const dPip = dist2(thumbTip, indexPip);
            const pinchCandidate = Math.min(dTip, dDip * 0.95, dPip * 1.05);

            const scaleDists = [];
            if (wrist && indexMcp) scaleDists.push(dist2(wrist, indexMcp));
            if (indexMcp && midMcp) scaleDists.push(dist2(indexMcp, midMcp));
            if (wrist && pinkyMcp) scaleDists.push(dist2(wrist, pinkyMcp));
            const refDist =
              scaleDists.length > 0
                ? scaleDists.reduce((s, d) => s + d, 0) / scaleDists.length
                : 0;

            if (refDist > 1e-3) {
              const norm = pinchCandidate / refDist;

              pinchHistory.push(norm);
              if (pinchHistory.length > PINCH_HISTORY_MAX) pinchHistory.shift();

              const avgNorm =
                pinchHistory.reduce((sum, v) => sum + v, 0) / pinchHistory.length;

              if (avgNorm < PINCH_ON) {
                pinchOnFrames += 1;
                pinchOffFrames = 0;
                if (!isPinching && pinchOnFrames >= 2) {
                  isPinching = true;
                  console.log("[HandTracking] Pinch detected");
                }
              } else if (avgNorm > PINCH_OFF) {
                pinchOffFrames += 1;
                pinchOnFrames = 0;
                if (isPinching && pinchOffFrames >= 2) {
                  isPinching = false;
                  console.log("[HandTracking] Pinch released");
                }
              } else {
                pinchOnFrames = 0;
                pinchOffFrames = 0;
              }
            }
          }

          // Pointer computation: usable box -> low-pass -> movement-tier smoothing -> center deadband.
          if (indexTip) {
            let px = 1 - indexTip.x;
            let py = indexTip.y;
            px = Math.min(Math.max(px, 0), 1);
            py = Math.min(Math.max(py, 0), 1);

            // Clamp into smaller usable box to reduce unstable edge behavior; map to [0,1].
            const X_MIN = 0.12, X_MAX = 0.88, Y_MIN = 0.10, Y_MAX = 0.82;
            const pxBox = (px - X_MIN) / (X_MAX - X_MIN);
            const pyBox = (py - Y_MIN) / (Y_MAX - Y_MIN);
            const clampedX = Math.min(Math.max(pxBox, 0), 1);
            const clampedY = Math.min(Math.max(pyBox, 0), 1);

            rawPointer = { x: clampedX, y: clampedY };

            // Stage 1: light low-pass to absorb micro-jitter.
            const filterAlpha = 0.28;
            if (!filteredPointer) {
              filteredPointer = { x: clampedX, y: clampedY };
            } else {
              filteredPointer = {
                x: filteredPointer.x + (clampedX - filteredPointer.x) * filterAlpha,
                y: filteredPointer.y + (clampedY - filteredPointer.y) * filterAlpha,
              };
            }

            // Stage 2: movement-based smoothing tiers (reduced twitch).
            if (!smoothPointer) {
              smoothPointer = { x: filteredPointer.x, y: filteredPointer.y };
            } else {
              const dx = filteredPointer.x - smoothPointer.x;
              const dy = filteredPointer.y - smoothPointer.y;
              const movement = Math.hypot(dx, dy);
              let alpha;
              if (movement < 0.012) alpha = 0.10;
              else if (movement < 0.035) alpha = 0.18;
              else alpha = Math.min(0.42, 0.32 + movement * 2);
              smoothPointer = {
                x: smoothPointer.x + dx * alpha,
                y: smoothPointer.y + dy * alpha,
              };
            }

            // Center deadband: when very close to center, pull toward (0.5, 0.5) for steadier idle.
            const toCenter = Math.hypot(smoothPointer.x - 0.5, smoothPointer.y - 0.5);
            const deadbandRadius = 0.055;
            if (toCenter < deadbandRadius && toCenter > 1e-5) {
              const pull = 1 - (toCenter / deadbandRadius) * 0.6; // blend toward center
              smoothPointer.x = 0.5 + (smoothPointer.x - 0.5) * (1 - pull);
              smoothPointer.y = 0.5 + (smoothPointer.y - 0.5) * (1 - pull);
            }
          }

          // Determine status based on stability and pinch state.
          if (isPinching) {
            setStatus("pinch detected");
          } else if (handStable) {
            setStatus("hand detected");
          } else {
            setStatus("unstable hand");
          }
        } else {
          if (DEBUG) console.log("[HandTracking] No landmarks found");
          // Grace period before considering the hand completely gone.
          const sinceSeen = nowMs - lastHandSeenTime;
          if (sinceSeen > HAND_GRACE_MS) {
            latestLandmarks = null;
            handPresent = false;
            handStable = false;
            consecutivePresentFrames = 0;
            pinchHistory.length = 0;
            pinchOnFrames = 0;
            pinchOffFrames = 0;
            isPinching = false;
            rawPointer = null;
            filteredPointer = null;
            smoothPointer = null;
            setStatus("no hand");
          } else {
            // Recently seen: treat as unstable but still present.
            handPresent = true;
            handStable = false;
            setStatus("unstable hand");
          }
        }
      } catch (runtimeErr) {
        console.error("[HandTracking] Runtime detection failure:", runtimeErr);
        latestLandmarks = null;
        handPresent = false;
        handStable = false;
        isPinching = false;
        pinchHistory.length = 0;
        pinchOnFrames = 0;
        pinchOffFrames = 0;
        rawPointer = null;
        filteredPointer = null;
        smoothPointer = null;
        setStatus("no hand");
      }
    }

    function loop() {
      const nowMs = performance.now();
      if (nowMs - lastDetectTime >= DETECT_INTERVAL_MS) {
        lastDetectTime = nowMs;
        detectForFrame(nowMs);
      }
      requestAnimationFrame(loop);
    }

    loop();

    return {
      getHandLandmarks() {
        return latestLandmarks;
      },
      getPointer() {
        return smoothPointer;
      },
      getRawPointer() {
        return rawPointer;
      },
      getIsPinching() {
        return isPinching;
      },
      getHandPresent() {
        return handPresent;
      },
      getHandStable() {
        return handStable;
      },
    };
  } catch (wasmErr) {
    console.error("[HandTracking] WASM or initialization failure:", wasmErr);
    setStatus("no hand");
    throw wasmErr;
  }
}

