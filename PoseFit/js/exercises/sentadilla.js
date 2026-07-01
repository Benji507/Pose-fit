/**
 * exercises/sentadilla.js
 * Analizador biomecánico de sentadilla en vista lateral.
 *
 * Landmarks utilizados (del lado visible):
 *   - Rodilla:  Cadera → Rodilla → Tobillo
 *   - Cadera:   Hombro → Cadera → Rodilla
 *   - Torso:    ángulo del segmento Cadera→Hombro respecto a la vertical
 *
 * Rangos óptimos (bibliografía biomecánica):
 *   - Ángulo de rodilla en punto más bajo:  70°–100°
 *   - Ángulo de cadera en punto más bajo:   55°–100°
 *   - Inclinación del torso:                0°–30°
 */

/**
 * Analiza todos los frames del video y evalúa la técnica de sentadilla.
 *
 * @param {Array}  frames  — landmarks por frame (MediaPipe Pose)
 * @param {Object} S       — índices del lado visible {SHOULDER, HIP, KNEE, ANKLE}
 * @returns {{score, detectedAngles, errors, positives, tips}|null}
 */
function analyzeSentadilla(frames, S) {
  const kneeAngles  = [];
  const hipAngles   = [];
  const torsoAngles = [];

  // ── Recolectar ángulos de cada frame ──
  for (const lms of frames) {
    const shoulder = lms[S.SHOULDER];
    const hip      = lms[S.HIP];
    const knee     = lms[S.KNEE];
    const ankle    = lms[S.ANKLE];

    // Rodilla y cadera deben ser visibles para el frame sea válido
    if (!isVisible(knee) || !isVisible(hip) || !isVisible(ankle)) continue;

    kneeAngles.push(angleBetween(hip, knee, ankle));

    if (isVisible(shoulder)) {
      hipAngles.push(angleBetween(shoulder, hip, knee));
      torsoAngles.push(angleToVertical(hip, shoulder));
    }
  }

  if (kneeAngles.length === 0) return null;

  // ── Calcular valores representativos ──
  const minKnee  = Math.min(...kneeAngles);   // profundidad máxima alcanzada
  const avgHip   = average(hipAngles);
  const avgTorso = average(torsoAngles);

  const errors    = [];
  const positives = [];
  const tips      = [];
  let score       = 100;

  // ── Evaluación: ángulo de rodilla ──
  if (minKnee > 115) {
    errors.push(
      `Profundidad insuficiente: ángulo de rodilla en el punto más bajo ${minKnee}°. ` +
      `La sentadilla no alcanzó el paralelo.`
    );
    tips.push(
      "Desciende hasta que el muslo quede paralelo al suelo (rodilla ~90°). " +
      "Trabaja la movilidad de tobillo y cadera con estiramientos previos."
    );
    score -= 28;
  } else if (minKnee > 100) {
    errors.push(
      `Profundidad moderada: rodilla a ${minKnee}°. Cerca del paralelo pero sin alcanzarlo.`
    );
    tips.push(
      "Intenta descender un poco más, controlando que la rodilla apunte hacia afuera " +
      "para alcanzar los 90°."
    );
    score -= 12;
  } else if (minKnee >= 70) {
    positives.push(
      `Excelente profundidad: rodilla en ${minKnee}° en el punto más bajo ` +
      `(rango óptimo: 70–100°).`
    );
  } else {
    positives.push(
      `Sentadilla profunda: rodilla en ${minKnee}°, por debajo del paralelo. ` +
      `Muy buen rango de movimiento.`
    );
  }

  // ── Evaluación: ángulo de cadera ──
  if (avgHip !== null) {
    if (avgHip > 130) {
      errors.push(
        `Poca flexión de cadera: ángulo promedio ${avgHip}°. ` +
        `Las caderas no se proyectan suficientemente hacia atrás.`
      );
      tips.push(
        "Empuja las caderas hacia atrás al iniciar el descenso, " +
        "como si fueras a sentarte en una silla que está lejos de ti."
      );
      score -= 15;
    } else if (avgHip >= 100) {
      positives.push(
        `Flexión de cadera aceptable: ${avgHip}°. ` +
        `Puedes mejorar empujando más las caderas hacia atrás.`
      );
    } else {
      positives.push(
        `Buena flexión de cadera: ${avgHip}° (rango recomendado: 55–100°).`
      );
    }
  }

  // ── Evaluación: inclinación del torso ──
  if (avgTorso !== null) {
    if (avgTorso > 40) {
      errors.push(
        `Torso muy inclinado hacia adelante: ${avgTorso}° respecto a la vertical. ` +
        `Aumenta la carga sobre la zona lumbar.`
      );
      tips.push(
        "Mantén el pecho erguido y la mirada al frente. " +
        "Mejorar la dorsiflexión de tobillo reduce significativamente esta inclinación."
      );
      score -= 15;
    } else if (avgTorso > 25) {
      errors.push(
        `Ligera inclinación del torso: ${avgTorso}°. Está en el límite aceptable.`
      );
      tips.push(
        "Trabaja la movilidad de tobillo con estiramientos de gemelos y sóleo " +
        "antes de cada sesión de sentadillas."
      );
      score -= 7;
    } else {
      positives.push(
        `Torso bien erguido: inclinación de ${avgTorso}° respecto a la vertical. ` +
        `Postura excelente.`
      );
    }
  }

  // ── Armar lista de ángulos detectados ──
  const detectedAngles = [
    `Rodilla (mínimo): ${minKnee}°  |  óptimo: 70–100°`,
  ];
  if (avgHip   !== null) detectedAngles.push(`Cadera (promedio): ${avgHip}°  |  óptimo: 55–100°`);
  if (avgTorso !== null) detectedAngles.push(`Inclinación de torso: ${avgTorso}°  |  óptimo: < 30°`);

  return {
    score: Math.max(0, score),
    detectedAngles,
    errors,
    positives,
    tips,
  };
}
