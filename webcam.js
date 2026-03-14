export async function initWebcam(videoEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn("[Webcam] getUserMedia is not supported in this browser.");
    videoEl.style.display = "none";
    throw new Error("getUserMedia not supported");
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });
    console.log("[Webcam] Stream acquired");
    videoEl.srcObject = stream;

    // Wait for metadata so videoWidth / videoHeight are valid.
    await new Promise((resolve) => {
      if (videoEl.readyState >= 1) {
        resolve();
        return;
      }
      videoEl.onloadedmetadata = () => {
        console.log("[Webcam] Metadata loaded", videoEl.videoWidth, "x", videoEl.videoHeight);
        resolve();
      };
    });

    await videoEl.play();
    console.log("[Webcam] Video playing");

    if (!videoEl.videoWidth || !videoEl.videoHeight) {
      throw new Error("Webcam video has invalid dimensions");
    }

    return;
  } catch (err) {
    console.warn("[Webcam] Could not access webcam:", err?.name || err);
    videoEl.style.display = "none";
    throw err;
  }
}

