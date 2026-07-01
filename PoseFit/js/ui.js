/**
 * ui.js
 * Interfaz de usuario de PoseFit.
 *
 * Responsabilidades:
 *   - Navegación y menú móvil.
 *   - Carga y vista previa del video.
 *   - Gestión de estados del panel de resultados
 *     (vacío / cargando / resultados).
 *   - Llamada al motor de análisis (mediapipe-engine.js).
 *   - Renderizado de resultados en el DOM.
 *
 * No contiene lógica de análisis ni de MediaPipe.
 */

// ── Navegación móvil ─────────────────────────────────────────

const menuButton = document.getElementById("menuButton");
const navMenu    = document.getElementById("navMenu");

menuButton?.addEventListener("click", () => {
  navMenu.classList.toggle("nav-open");
});

// ── Referencias del panel de carga ───────────────────────────

const videoInput  = document.getElementById("videoInput");
const preview     = document.getElementById("preview");
const previewBox  = document.getElementById("previewBox");
const analyzeBtn  = document.getElementById("analyze");
const clearBtn    = document.getElementById("clear");
const exerciseSel = document.getElementById("exercise");

// ── Referencias del panel de resultados ──────────────────────

const feedbackEmpty   = document.getElementById("feedbackEmpty");
const feedbackLoading = document.getElementById("feedbackLoading");
const feedbackResults = document.getElementById("feedbackResults");
const loadingText     = document.getElementById("loadingText");
const progressBar     = document.getElementById("progressBar");

/** Archivo de video actualmente cargado. */
let currentVideoFile = null;

// ── Evento: selección de video ───────────────────────────────

videoInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  currentVideoFile    = file;
  preview.src         = URL.createObjectURL(file);
  previewBox.style.display = "block";

  // Volver al estado vacío para que el usuario haga clic en Analizar
  showPanel("empty");
});

// ── Evento: botón Analizar ───────────────────────────────────

analyzeBtn.addEventListener("click", async () => {
  if (!currentVideoFile) {
    alert("Primero selecciona un video lateral.");
    return;
  }

  showPanel("loading");
  updateProgress(0, "Iniciando análisis…");

  try {
    const exercise = exerciseSel.value;

    // Delegar el trabajo al motor MediaPipe
    const result = await window.PoseEngine.runAnalysis(
      preview,
      exercise,
      updateProgress
    );

    renderResults(result);
    showPanel("results");

    // Desplazar automáticamente al panel de resultados
    document.getElementById("resultados").scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    showPanel("empty");
    document.getElementById("feedback").innerHTML =
      `<li style="border-left-color:#ef4444; color:#fca5a5;">⚠️ ${error.message}</li>`;
    console.error("[PoseFit UI]", error);
  }
});

// ── Evento: botón Limpiar ────────────────────────────────────

clearBtn.addEventListener("click", () => {
  videoInput.value              = "";
  currentVideoFile              = null;
  preview.src                   = "";
  previewBox.style.display      = "none";

  showPanel("empty");
  document.getElementById("feedback").innerHTML =
    "<li>Sube un video lateral para comenzar el análisis.</li>";
});

// ── Funciones de control de UI ───────────────────────────────

/**
 * Muestra uno de los tres estados del panel de resultados.
 *
 * @param {"empty"|"loading"|"results"} which
 */
function showPanel(which) {
  feedbackEmpty.style.display   = which === "empty"   ? "block" : "none";
  feedbackLoading.style.display = which === "loading" ? "block" : "none";
  feedbackResults.style.display = which === "results" ? "block" : "none";
}

/**
 * Actualiza la barra de progreso y el mensaje durante el análisis.
 *
 * @param {number} percent  — valor entre 0 y 100
 * @param {string} message  — texto descriptivo del paso actual
 */
function updateProgress(percent, message) {
  progressBar.style.width = percent + "%";
  loadingText.textContent  = message;
}

// ── Renderizado de resultados ─────────────────────────────────

/**
 * Muestra el resultado completo del análisis en el panel derecho.
 *
 * @param {{score, detectedAngles, errors, positives, tips, sideDetected}} result
 */
function renderResults(result) {
  renderScore(result.score);
  renderSideBadge(result.sideDetected);

  fillList("anglesList",    result.detectedAngles, "item-angle");
  fillList("errorsList",    result.errors,          "item-error",    "No se detectaron errores graves. ¡Buena técnica!");
  fillList("positivesList", result.positives,       "item-positive", "—");
  fillList("tipsList",      result.tips,            "item-tip",      "¡Sin correcciones necesarias! Sigue así.");
}

/**
 * Muestra la puntuación y cambia el color del borde según el nivel.
 *
 * @param {number} score  — 0 a 100
 */
function renderScore(score) {
  document.getElementById("scoreValue").textContent = score;

  const scoreBox = document.querySelector(".score-box");
  if      (score >= 80) scoreBox.style.borderColor = "#22c55e";   // verde
  else if (score >= 55) scoreBox.style.borderColor = "#facc15";   // amarillo
  else                   scoreBox.style.borderColor = "#ef4444";   // rojo
}

/**
 * Muestra el badge con el lado corporal detectado.
 *
 * @param {string} sideLabel  — "Lado izquierdo" | "Lado derecho"
 */
function renderSideBadge(sideLabel) {
  const badge = document.getElementById("sideDetected");
  if (!badge || !sideLabel) return;
  badge.textContent    = `Vista lateral detectada: ${sideLabel}`;
  badge.style.display  = "inline-block";
}

/**
 * Rellena una lista <ul> con items de la clase CSS indicada.
 * Si el array está vacío muestra un mensaje neutro.
 *
 * @param {string}   listId    — id del elemento <ul>
 * @param {string[]} items     — textos a mostrar
 * @param {string}   cssClass  — clase CSS para cada <li>
 * @param {string}   [emptyMsg] — mensaje si no hay items
 */
function fillList(listId, items, cssClass, emptyMsg) {
  const ul = document.getElementById(listId);
  ul.innerHTML = "";

  if (!items || items.length === 0) {
    ul.innerHTML = `<li class="item-none">${emptyMsg ?? "—"}</li>`;
    return;
  }

  for (const text of items) {
    const li       = document.createElement("li");
    li.className   = cssClass;
    li.textContent = text;
    ul.appendChild(li);
  }
}
