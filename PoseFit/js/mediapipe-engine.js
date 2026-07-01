/**
 * mediapipe-engine.js
 * Motor de procesamiento de video con MediaPipe Pose.
 *
 * Responsabilidades:
 *   1. Inicializar y configurar la instancia de MediaPipe Pose.
 *   2. Leer el video frame a frame usando un canvas oculto.
 *   3. Enviar cada frame a MediaPipe y recoger los landmarks.
 *   4. Al finalizar, detectar el lado visible y llamar al
 *      analizador correspondiente según el ejercicio.
 *   5. Resolver la Promise con el resultado o rechazarla con un error claro.
 *
 * Depende de (deben cargarse antes en el HTML):
 *   - landmarks.js      → constante LM
 *   - geometry.js       → angleBetween, angleToVertical, isVisible, average
 *   - side-detector.js  → detectSide, getSideIndices, sideLabel
 *   - exercises/sentadilla.js → analyzeSentadilla
 *   - exercises/flexion.js   → analyzeFlexion
 *   - exercises/abdominal.js → analyzeAbdominal
 */

/** Máximo de frames a procesar por video (≈8 s a 15 fps de muestreo). */
const MAX_FRAMES = 120;

/** Salto de tiempo en segundos entre frames muestreados. */
const FRAME_STEP = 1 / 15;

/**
 * Inicializa MediaPipe Pose con los parámetros recomendados para
 * análisis de ejercicios grabados (no tiempo real).
 *
 * @returns {Pose} instancia configurada
 */
function createPoseInstance() {
  const pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity:        1,      // 0=rápido, 1=balanceado, 2=preciso
    smoothLandmarks:        true,   // reduce el ruido entre frames
    enableSegmentation:     false,  // no necesitamos máscara de silueta
    minDetectionConfidence: 0.5,
    minTrackingConfidence:  0.5,
  });

  return pose;
}

/**
 * Dibuja un frame del video en el canvas oculto y lo envía a MediaPipe.
 *
 * @param {HTMLVideoElement}     videoEl
 * @param {HTMLCanvasElement}    canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {Pose}                 pose
 */
async function sendCurrentFrame(videoEl, canvas, ctx, pose) {
  canvas.width  = videoEl.videoWidth  || 640;
  canvas.height = videoEl.videoHeight || 480;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const bitmap = await createImageBitmap(canvas);
  await pose.send({ image: bitmap });
}

/**
 * Selecciona y ejecuta el analizador correcto según el ejercicio.
 *
 * @param {string} exerciseType — "sentadilla" | "flexion" | "abdominal"
 * @param {Array}  frames       — landmarks recolectados
 * @param {Object} S            — índices del lado visible
 * @returns {Object|null}
 */
function runExerciseAnalyzer(exerciseType, frames, S) {
  switch (exerciseType) {
    case "sentadilla": return analyzeSentadilla(frames, S);
    case "flexion":    return analyzeFlexion(frames, S);
    case "abdominal":  return analyzeAbdominal(frames, S);
    default:           return null;
  }
}

/**
 * Procesa el video completo y devuelve el análisis biomecánico.
 *
 * @param {HTMLVideoElement} videoEl      — elemento <video> con el archivo cargado
 * @param {string}           exerciseType — "sentadilla" | "flexion" | "abdominal"
 * @param {Function}         onProgress   — callback(porcentaje: number, mensaje: string)
 * @returns {Promise<{score, detectedAngles, errors, positives, tips, sideDetected}>}
 */
function runAnalysis(videoEl, exerciseType, onProgress) {
  return new Promise((resolve, reject) => {
    const collectedFrames = [];
    let frameCount        = 0;
    let processedCount    = 0;

    const pose   = createPoseInstance();
    const canvas = document.getElementById("poseCanvas");
    const ctx    = canvas.getContext("2d");

    // ── Callback de MediaPipe: se ejecuta por cada frame procesado ──
    pose.onResults((results) => {
      processedCount++;

      if (results.poseLandmarks) {
        collectedFrames.push(results.poseLandmarks);
      }

      const pct = Math.min(98, Math.round((processedCount / MAX_FRAMES) * 100));
      onProgress(pct, `Procesando frame ${processedCount} de ${MAX_FRAMES}…`);

      // Avanzar al siguiente frame o finalizar
      const hasMoreFrames = frameCount < MAX_FRAMES && !videoEl.ended;
      if (hasMoreFrames) {
        videoEl.currentTime += FRAME_STEP;
      } else {
        onProgress(99, "Calculando ángulos y puntuación…");
        pose.close();
        finalize();
      }
    });

    // ── Evento del video: se dispara cada vez que currentTime cambia ──
    videoEl.onseeked = async () => {
      try {
        await sendCurrentFrame(videoEl, canvas, ctx, pose);
        frameCount++;
      } catch {
        // Frame corrupto o no disponible — saltar al siguiente
        videoEl.currentTime += FRAME_STEP;
      }
    };

    // ── Análisis final tras recopilar todos los frames ──
    function finalize() {
      if (collectedFrames.length < 5) {
        reject(new Error(
          "No se detectó suficiente información corporal en el video. " +
          "Graba en vista LATERAL con buena iluminación y el cuerpo completo visible."
        ));
        return;
      }

      const side   = detectSide(collectedFrames);
      const S      = getSideIndices(side);
      const result = runExerciseAnalyzer(exerciseType, collectedFrames, S);

      if (!result) {
        reject(new Error(
          "No se pudieron extraer ángulos del ejercicio. " +
          "Verifica que todo el cuerpo sea visible durante el movimiento."
        ));
        return;
      }

      result.sideDetected = sideLabel(side);
      onProgress(100, "¡Análisis completo!");
      resolve(result);
    }

    // ── Iniciar ──
    pose.initialize()
      .then(() => {
        onProgress(5, "Modelo cargado. Iniciando procesamiento…");
        videoEl.currentTime = 0;
      })
      .catch(reject);
  });
}

// Exponer al resto de la aplicación
window.PoseEngine = { runAnalysis };
