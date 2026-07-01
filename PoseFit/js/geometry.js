/**
 * geometry.js
 * Funciones matemáticas para calcular ángulos entre puntos corporales.
 * Trabaja con coordenadas normalizadas (0–1) de MediaPipe Pose.
 */

/**
 * Calcula el ángulo en grados en el vértice B,
 * formado por los segmentos A→B y C→B.
 * Utiliza el producto punto y la ley del coseno en 2D.
 *
 * @param {{x:number, y:number}} A
 * @param {{x:number, y:number}} B  — vértice central
 * @param {{x:number, y:number}} C
 * @returns {number} ángulo en grados (0–180)
 */
function angleBetween(A, B, C) {
  const AB = { x: A.x - B.x, y: A.y - B.y };
  const CB = { x: C.x - B.x, y: C.y - B.y };

  const dot   = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.hypot(AB.x, AB.y);
  const magCB = Math.hypot(CB.x, CB.y);

  if (magAB === 0 || magCB === 0) return 0;

  const cosine = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return Math.round(Math.acos(cosine) * (180 / Math.PI));
}

/**
 * Calcula el ángulo del segmento A→B respecto al eje vertical.
 * Útil para medir la inclinación del torso en vista lateral:
 *   0°  = completamente vertical (postura ideal)
 *   90° = completamente horizontal
 *
 * @param {{x:number, y:number}} A  — punto inferior (cadera)
 * @param {{x:number, y:number}} B  — punto superior (hombro)
 * @returns {number} ángulo en grados
 */
function angleToVertical(A, B) {
  const dx = B.x - A.x;
  const dy = B.y - A.y;   // Y crece hacia abajo en coordenadas canvas
  return Math.round(Math.abs(Math.atan2(dx, Math.abs(dy)) * (180 / Math.PI)));
}

/**
 * Devuelve true si el landmark tiene visibilidad suficiente.
 * MediaPipe asigna valores de 0 (oculto) a 1 (completamente visible).
 *
 * @param {{visibility?:number}} lm
 * @param {number} threshold  — mínimo aceptable (por defecto 0.45)
 */
function isVisible(lm, threshold = 0.45) {
  return lm != null && (lm.visibility ?? 1) >= threshold;
}

/**
 * Calcula el promedio de un array numérico.
 * Devuelve null si el array está vacío.
 *
 * @param {number[]} arr
 * @returns {number|null}
 */
function average(arr) {
  if (!arr || arr.length === 0) return null;
  return Math.round(arr.reduce((sum, v) => sum + v, 0) / arr.length);
}
