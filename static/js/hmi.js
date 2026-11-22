/*
 * Mini intérprete de los eventos Nextion usados en el proyecto:
 *   page <nombre>          -> navegar a otra página
 *   <obj>.val=<número>     -> asignar valor
 *   <obj>.val=<obj2>.val   -> copiar valor entre componentes
 */
(function () {
  const screen = document.getElementById("screen");

  // ---- Escalar la pantalla 1024x600 al tamaño de la ventana ----
  function fit() {
    const s = Math.min(window.innerWidth / screen.offsetWidth,
                       window.innerHeight / screen.offsetHeight);
    screen.style.transform = `scale(${s})`;
  }
  window.addEventListener("resize", fit);
  fit();

  // ---- Lectura / escritura de .val ----
  function getVal(name) {
    const el = document.getElementById(name);
    if (!el) return 0;
    if (el.classList.contains("hmi-slider")) return parseInt(el.value, 10);
    return parseInt(el.dataset.value || "0", 10);
  }

  function setVal(name, value) {
    const el = document.getElementById(name);
    if (!el) return;
    if (el.classList.contains("hmi-slider")) {
      el.value = value;
    } else if (el.classList.contains("hmi-number")) {
      el.dataset.value = value;
      const dec = parseInt(el.dataset.decimals || "0", 10);
      el.textContent = dec ? (value / Math.pow(10, dec)).toFixed(dec) : String(value);
    }
  }

  // ---- Ejecutar líneas de código ----
  function run(lines) {
    for (const raw of lines || []) {
      const line = raw.split("//")[0].trim();
      if (!line) continue;

      let m = line.match(/^page\s+(\w+)$/);
      if (m) {
        window.location.href = window.PAGE_URL.replace("__NAME__", m[1]);
        return;
      }
      m = line.match(/^(\w+)\.val\s*=\s*(.+)$/);
      if (m) {
        const rhs = m[2].trim();
        const ref = rhs.match(/^(\w+)\.val$/);
        setVal(m[1], ref ? getVal(ref[1]) : parseInt(rhs, 10));
      }
    }
  }

  const events = (el) => JSON.parse(el.dataset.events || "{}");

  // Eventos de la página (preinitialize / postinitialize)
  const pageEv = events(screen);
  run(pageEv.load);
  run(pageEv.loadend);

  // Botones: "Touch Press" (down) y "Touch Release" (up)
  document.querySelectorAll(".hmi-button").forEach((btn) => {
    const ev = events(btn);
    btn.addEventListener("pointerdown", () => run(ev.down));
    btn.addEventListener("click", () => run(ev.up));
  });

  // Sliders: evento "slide" al moverlos
  document.querySelectorAll(".hmi-slider").forEach((sl) => {
    const ev = events(sl);
    sl.addEventListener("input", () => run(ev.slide));
  });

  // Video de inicio: al terminar ejecuta "playend"
  document.querySelectorAll(".hmi-video").forEach((v) => {
    const ev = events(v);
    setTimeout(() => run(ev.playend), 3000);
  });
})();
