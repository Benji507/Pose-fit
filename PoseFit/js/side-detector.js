/**
 * side-detector.js
 * Detecta qué lado del cuerpo está orientado hacia la cámara
 * en una grabación lateral, y devuelve los índices correctos.
 *
 * Principio: en una toma lateral el lado visible tiene landmarks
 * con visibilidad alta; el lado ocluido tiene visibilidad baja.
 * Se comparan hombro + cadera + rodilla de ambos lados.
 */

/**
 * Analiza los primeros frames y decide si la cámara ve el lado
 * izquierdo o el derecho del cuerpo.
 *
 * @param {Array} frames  — array de arrays de landmarks MediaPipe
 * @returns {"left"|"right"}
 */
function detectSide(frames) {
  let leftScore  = 0;
  let rightScore = 0;

  // Limitar a los primeros 30 frames para mayor velocidad
  const sample = frames.slice(0, 30);

  for (const lms of sample) {
    const leftVisibility =
      (lms[LM.LEFT_SHOULDER]?.visibility  ?? 0) +
      (lms[LM.LEFT_HIP]?.visibility        ?? 0) +
      (lms[LM.LEFT_KNEE]?.visibility       ?? 0);

    const rightVisibility =
      (lms[LM.RIGHT_SHOULDER]?.visibility  ?? 0) +
      (lms[LM.RIGHT_HIP]?.visibility        ?? 0) +
      (lms[LM.RIGHT_KNEE]?.visibility       ?? 0);

    leftScore  += leftVisibility;
    rightScore += rightVisibility;
  }

  return leftScore >= rightScore ? "left" : "right";
}

/**
 * Devuelve un objeto con los índices de landmarks del lado visible.
 * Esto permite que los analizadores trabajen genéricamente sin
 * preocuparse por cuál lado está hacia la cámara.
 *
 * @param {"left"|"right"} side
 * @returns {{SHOULDER:number, ELBOW:number, WRIST:number, HIP:number, KNEE:number, ANKLE:number}}
 */
function getSideIndices(side) {
  if (side === "left") {
    return {
      SHOULDER: LM.LEFT_SHOULDER,
      ELBOW:    LM.LEFT_ELBOW,
      WRIST:    LM.LEFT_WRIST,
      HIP:      LM.LEFT_HIP,
      KNEE:     LM.LEFT_KNEE,
      ANKLE:    LM.LEFT_ANKLE,
    };
  }

  return {
    SHOULDER: LM.RIGHT_SHOULDER,
    ELBOW:    LM.RIGHT_ELBOW,
    WRIST:    LM.RIGHT_WRIST,
    HIP:      LM.RIGHT_HIP,
    KNEE:     LM.RIGHT_KNEE,
    ANKLE:    LM.RIGHT_ANKLE,
  };
}

/**
 * Devuelve el nombre legible del lado detectado.
 *
 * @param {"left"|"right"} side
 * @returns {string}
 */
function sideLabel(side) {
  return side === "left" ? "Lado izquierdo" : "Lado derecho";
}
