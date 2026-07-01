/**
 * exercises/flexion.js
 * Analizador biomecánico de flexión de brazos (push-up) en vista lateral.
 *
 * Landmarks utilizados (del lado visible):
 *   - Codo:           Hombro → Codo → Muñeca
 *   - Alineación:     Hombro → Cadera → Tobillo (cuerpo recto como tabla)
 *
 * Rangos óptimos (bibliografía biomecánica):
 *   - Ángulo de codo en punto más bajo:  ≤ 95°
 *   - Alineación hombro–cadera–tobillo:  165°–180°
 */

/**
 * Analiza todos los frames del video y evalúa la técnica de flexión de brazos.
 *
 * @param {Array}  frames  — landmarks por frame (MediaPipe Pose)
 * @param {Object} S       — índices del lado visible {SHOULDER, ELBOW, WRIST, HIP, ANKLE}
 * @returns {{score, detectedAngles, errors, positives, tips}|null}
 */
function analyzeFlexion(frames, S) {
  const elbowAngles = [];
  const bodyAngles  = [];

  // ── Recolectar ángulos de cada frame ──
  for (const lms of frames) {
    const shoulder = lms[S.SHOULDER];
    const elbow    = lms[S.ELBOW];
    const wrist    = lms[S.WRIST];
    const hip      = lms[S.HIP];
    const ankle    = lms[S.ANKLE];

    // El codo debe ser visible para que el frame sea válido
    if (!isVisible(elbow) || !isVisible(shoulder) || !isVisible(wrist)) continue;

    elbowAngles.push(angleBetween(shoulder, elbow, wrist));

    // Alineación del cuerpo completo (requiere tobillo y cadera)
    if (isVisible(hip) && isVisible(ankle)) {
      bodyAngles.push(angleBetween(shoulder, hip, ankle));
    }
  }

  if (elbowAngles.length === 0) return null;

  // ── Calcular valores representativos ──
  const minElbow = Math.min(...elbowAngles);  // profundidad máxima de flexión
  const avgBody  = average(bodyAngles);       // alineación media del cuerpo

  const errors    = [];
  const positives = [];
  const tips      = [];
  let score       = 100;

  // ── Evaluación: rango de movimiento del codo ──
  if (minElbow > 110) {
    errors.push(
      `Descenso insuficiente: ángulo mínimo de codo ${minElbow}°. ` +
      `El pecho no baja lo suficiente hacia el suelo.`
    );
    tips.push(
      "Baja el cuerpo hasta que el pecho casi roce el suelo (codo ~90°). " +
      "Controla el descenso en 2 segundos para mayor activación muscular."
    );
    score -= 28;
  } else if (minElbow > 95) {
    errors.push(
      `Descenso moderado: codo en ${minElbow}°. Cerca del rango óptimo pero no suficiente.`
    );
    tips.push(
      "Intenta bajar un poco más para alcanzar los 90° de codo " +
      "y activar mejor el pectoral en toda su amplitud."
    );
    score -= 12;
  } else {
    positives.push(
      `Excelente rango de codo: ${minElbow}° en el punto más bajo. ` +
      `El pecho llega cerca del suelo correctamente.`
    );
  }

  // ── Evaluación: alineación corporal ──
  if (avgBody !== null) {
    const deviation = Math.abs(avgBody - 180);

    if (deviation > 25) {
      if (avgBody < 155) {
        errors.push(
          `Cadera caída o glúteos elevados: ángulo hombro–cadera–tobillo ${avgBody}° ` +
          `(desviación de ${deviation}° respecto a la línea recta).`
        );
      } else {
        errors.push(
          `Desalineación corporal notable: ${avgBody}°. ` +
          `El cuerpo no mantiene la línea recta durante el movimiento.`
        );
      }
      tips.push(
        "Activa el core y los glúteos durante toda la flexión. " +
        "Imagina que tu cuerpo es una tabla rígida de la cabeza a los talones."
      );
      score -= 20;
    } else if (deviation > 12) {
      errors.push(
        `Alineación mejorable: ${avgBody}° hombro–cadera–tobillo. ` +
        `Hay una pequeña desviación de la línea recta ideal.`
      );
      tips.push(
        "Mantén la tensión abdominal constante: contrae el core desde el inicio " +
        "hasta el final de cada repetición sin relajarlo en el punto alto."
      );
      score -= 8;
    } else {
      positives.push(
        `Alineación corporal excelente: ${avgBody}°. ` +
        `El cuerpo se mantiene recto como una tabla durante todo el movimiento.`
      );
    }
  }

  // ── Armar lista de ángulos detectados ──
  const detectedAngles = [
    `Codo (mínimo): ${minElbow}°  |  óptimo: ≤ 95°`,
  ];
  if (avgBody !== null) {
    detectedAngles.push(
      `Alineación hombro–cadera–tobillo: ${avgBody}°  |  óptimo: 165–180°`
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
