/**
 * exercises/abdominal.js
 * Analizador biomecánico de abdominales (crunch/sit-up) en vista lateral.
 *
 * Landmarks utilizados (del lado visible):
 *   - Contracción: Hombro → Cadera → Rodilla  (cuánto se cierra el ángulo al subir)
 *   - Rodilla:     Cadera → Rodilla → Tobillo  (posición segura para la lumbar)
 *
 * Rangos óptimos (bibliografía biomecánica):
 *   - Ángulo de contracción torso–cadera en pico:  < 90°
 *   - Ángulo de rodilla:                           80°–100°
 */

/**
 * Analiza todos los frames del video y evalúa la técnica de abdominales.
 *
 * @param {Array}  frames  — landmarks por frame (MediaPipe Pose)
 * @param {Object} S       — índices del lado visible {SHOULDER, HIP, KNEE, ANKLE}
 * @returns {{score, detectedAngles, errors, positives, tips}|null}
 */
function analyzeAbdominal(frames, S) {
  const contractionAngles = [];
  const kneeAngles        = [];

  // ── Recolectar ángulos de cada frame ──
  for (const lms of frames) {
    const shoulder = lms[S.SHOULDER];
    const hip      = lms[S.HIP];
    const knee     = lms[S.KNEE];
    const ankle    = lms[S.ANKLE];

    // Cadera y rodilla deben ser visibles para que el frame sea válido
    if (!isVisible(hip) || !isVisible(knee)) continue;

    // Ángulo de contracción: qué tanto sube el tronco respecto a la cadera
    if (isVisible(shoulder)) {
      contractionAngles.push(angleBetween(shoulder, hip, knee));
    }

    // Ángulo de rodilla: posición de las piernas
    if (isVisible(ankle)) {
      kneeAngles.push(angleBetween(hip, knee, ankle));
    }
  }

  if (contractionAngles.length === 0) return null;

  // ── Calcular valores representativos ──
  const minContraction = Math.min(...contractionAngles);  // máxima contracción alcanzada
  const avgKnee        = average(kneeAngles);

  const errors    = [];
  const positives = [];
  const tips      = [];
  let score       = 100;

  // ── Evaluación: contracción abdominal ──
  if (minContraction > 120) {
    errors.push(
      `Contracción abdominal insuficiente: ángulo mínimo torso–cadera ${minContraction}°. ` +
      `El tronco no se eleva lo suficiente en ninguna repetición.`
    );
    tips.push(
      "Contrae los abdominales activamente para elevar el tronco. " +
      "No jales el cuello con las manos; el movimiento debe venir del core."
    );
    score -= 28;
  } else if (minContraction > 90) {
    errors.push(
      `Contracción moderada: ${minContraction}°. ` +
      `El tronco podría elevarse un poco más en el punto alto.`
    );
    tips.push(
      "Exhala con fuerza al subir para ayudarte a contraer más los abdominales " +
      "y alcanzar el punto alto de la repetición."
    );
    score -= 12;
  } else {
    positives.push(
      `Excelente contracción: ángulo mínimo ${minContraction}°. ` +
      `El tronco se eleva correctamente en cada repetición.`
    );
  }

  // ── Evaluación: posición de rodilla ──
  if (avgKnee !== null) {
    if (avgKnee > 150) {
      errors.push(
        `Rodillas casi extendidas: ${avgKnee}°. ` +
        `Las piernas rectas durante el abdominal aumentan el estrés en la zona lumbar.`
      );
      tips.push(
        "Flexiona las rodillas a ~90° apoyando los pies en el suelo. " +
        "Esto protege la zona lumbar y aísla mejor la musculatura abdominal."
      );
      score -= 15;
    } else if (avgKnee > 115) {
      errors.push(
        `Rodillas demasiado abiertas: ${avgKnee}°. ` +
        `Un ángulo de 80–100° ofrece mejor protección lumbar.`
      );
      tips.push(
        "Acerca los talones hacia los glúteos hasta lograr aproximadamente " +
        "90° de flexión de rodilla antes de iniciar el movimiento."
      );
      score -= 8;
    } else if (avgKnee >= 80) {
      positives.push(
        `Posición de rodilla ideal: ${avgKnee}° (rango óptimo: 80–100°). ` +
        `Correcta protección de la zona lumbar.`
      );
    } else {
      positives.push(
        `Rodillas bien flexionadas (${avgKnee}°).`
      );
    }
  }

  // ── Armar lista de ángulos detectados ──
  const detectedAngles = [
    `Contracción torso–cadera (mínimo): ${minContraction}°  |  óptimo: < 90°`,
  ];
  if (avgKnee !== null) {
    detectedAngles.push(
      `Ángulo de rodilla (promedio): ${avgKnee}°  |  óptimo: 80–100°`
    );
  }

  return {
    score: Math.max(0, score),
    detectedAngles,
    errors,
    positives,
    tips,
  };
}
