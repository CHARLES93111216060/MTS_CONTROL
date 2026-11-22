/*
 * Pantalla de tratamiento:
 *  - ajuste de parámetros (slider, botones +/- con pulsación mantenida)
 *  - verificación de seguridad antes de emitir
 *  - simulación de la sesión: conteo de pulsos, tiempo, forma de onda,
 *    pausa / parada y resumen final
 */
(function () {
  "use strict";
  const { $, $$, setStatus, addShots, beep, fmtInt } = window.MTS;

  const root = $("#treatment");
  if (!root) return;

  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const fmtTime = (sec) => {
    sec = Math.max(0, Math.round(sec));
    return sec >= 3600
      ? `${Math.floor(sec / 3600)}:${pad((sec % 3600) / 60)}:${pad(sec % 60)}`
      : `${pad(sec / 60)}:${pad(sec % 60)}`;
  };

  // ======================================================================
  // Parámetros
  // ======================================================================
  const params = $$(".param", root).map((el) => {
    const slider = $(".param-slider", el);
    return {
      el, slider,
      key: el.dataset.key,
      label: el.dataset.label,
      unit: el.dataset.unit,
      scale: parseFloat(el.dataset.scale),
      decimals: parseInt(el.dataset.decimals, 10),
      def: parseInt(el.dataset.default, 10),
      min: parseInt(slider.min, 10),
      max: parseInt(slider.max, 10),
      step: parseInt(slider.step, 10) || 1,
      out: $(".param-value", el),
      flag: $(".param-flag", el),
      get raw() { return parseInt(slider.value, 10); },
      set raw(v) { slider.value = Math.min(this.max, Math.max(this.min, v)); },
      get value() { return this.raw * this.scale; },
      text(raw = this.raw) { return (raw * this.scale).toFixed(this.decimals); },
    };
  });
  const byKey = Object.fromEntries(params.map((p) => [p.key, p]));
  const doseParam = byKey.energy || byKey.intensity;

  const warnBox = $("#paramWarning");
  const warnText = $("#paramWarningText");
  const estDuration = $("#estDuration");
  const btnStart = $("#btnStart");

  function render(p) {
    p.out.textContent = p.text();
    const pct = ((p.raw - p.min) / (p.max - p.min || 1)) * 100;
    p.slider.style.setProperty("--p", `${pct}%`);
    const modified = p.raw !== p.def;
    p.el.classList.toggle("modified", modified);
    p.flag.hidden = !modified;
  }

  function validate() {
    const msgs = [];
    params.forEach((p) => p.el.classList.remove("invalid"));
    params.forEach((p) => {
      if (p.raw <= 0) { msgs.push(`${p.label}: el valor debe ser mayor que cero.`); p.el.classList.add("invalid"); }
    });
    if (doseParam && doseParam.raw > doseParam.def * 1.5) {
      msgs.push(`${doseParam.label} superior en más de un 50 % al valor recomendado (${doseParam.text(doseParam.def)} ${doseParam.unit}). Verifique la indicación.`);
    }
    const blocking = params.some((p) => p.raw <= 0);
    warnBox.hidden = msgs.length === 0;
    warnText.textContent = msgs.join(" ");
    btnStart.disabled = blocking;

    const f = byKey.frequency ? byKey.frequency.value : 0;
    const n = byKey.pulses ? byKey.pulses.value : 0;
    estDuration.textContent = f > 0 ? fmtTime(n / f) : "--:--";
  }

  function refresh() { params.forEach(render); validate(); }

  params.forEach((p) => {
    p.slider.addEventListener("input", () => { render(p); validate(); });

    $$(".step", p.el).forEach((btn) => {
      const dir = parseInt(btn.dataset.dir, 10);
      let delay = null, repeat = null, count = 0;
      const once = () => {
        // Acelera al mantener pulsado
        const mult = count > 25 ? 10 : count > 10 ? 4 : 1;
        p.raw = p.raw + dir * p.step * mult;
        count++;
        render(p); validate();
      };
      const stop = () => { clearTimeout(delay); clearInterval(repeat); delay = repeat = null; count = 0; };
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        once();
        delay = setTimeout(() => { repeat = setInterval(once, 70); }, 380);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, stop));
    });
  });

  $("#btnReset").addEventListener("click", () => {
    params.forEach((p) => { p.raw = p.def; });
    refresh();
  });

  refresh();

  // ======================================================================
  // Modales
  // ======================================================================
  function openModal(m) { m.hidden = false; }
  function closeModal(m) { m.hidden = true; }
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => {
    const m = b.closest(".overlay");
    if (m.id === "stopModal") resumeAfterStopCancel();
    else closeModal(m);
  }));

  // ---------- Verificación de seguridad ----------
  const safety = $("#safetyModal");
  const checks = $$('.checklist input', safety);
  const btnConfirm = $("#btnConfirm");

  function paramBoxes(target, tag = "div") {
    target.innerHTML = "";
    params.forEach((p) => {
      const box = document.createElement(tag);
      const small = document.createElement("small");
      small.textContent = p.label;
      const strong = document.createElement("strong");
      strong.textContent = p.key === "pulses" ? fmtInt(p.value) : p.text();
      const em = document.createElement("em");
      em.textContent = p.key === "pulses" ? "" : p.unit;
      box.append(small, strong, em);
      target.appendChild(box);
    });
  }

  btnStart.addEventListener("click", () => {
    if (btnStart.disabled) return;
    checks.forEach((c) => { c.checked = false; });
    btnConfirm.disabled = true;
    paramBoxes($("#safetySummary"));
    openModal(safety);
  });
  checks.forEach((c) => c.addEventListener("change", () => {
    btnConfirm.disabled = !checks.every((x) => x.checked);
  }));
  btnConfirm.addEventListener("click", () => {
    closeModal(safety);
    startSession();
  });

  // ======================================================================
  // Sesión simulada
  // ======================================================================
  const overlay = $("#session");
  const sessionEl = $(".session", overlay);
  const ringFill = $("#ringFill");
  const RING = 2 * Math.PI * 90;
  const emitter = $("#emitter");
  const elCount = $("#pulseCount");
  const elTotal = $("#pulseTotal");
  const elPct = $("#pulsePct");
  const elElapsed = $("#tElapsed");
  const elRemaining = $("#tRemaining");
  const elState = $("#sessionState");
  const btnPause = $("#btnPause");
  const stopModal = $("#stopModal");
  const summary = $("#summary");
  const canvas = $("#scope");
  const ctx = canvas.getContext("2d");

  const S = {
    active: false, running: false, total: 0, freq: 1, amp: 1,
    elapsed: 0, delivered: 0, speed: 1, last: 0, timer: 0, wasRunning: false,
  };

  function buildSessionParams() {
    const wrap = $("#sessionParams");
    wrap.innerHTML = "";
    params.filter((p) => p.key !== "pulses").forEach((p) => {
      const d = document.createElement("div");
      d.className = "stat";
      d.innerHTML = "<small></small><strong></strong><em></em>";
      d.querySelector("small").textContent = p.label;
      d.querySelector("strong").textContent = p.text();
      d.querySelector("em").textContent = p.unit;
      wrap.appendChild(d);
    });
  }

  function startSession() {
    S.total = Math.round(byKey.pulses.value);
    S.freq = byKey.frequency.value;
    S.amp = doseParam ? Math.max(0.35, doseParam.raw / doseParam.max) : 0.8;
    S.elapsed = 0;
    S.delivered = 0;
    S.active = true;

    elTotal.textContent = fmtInt(S.total);
    buildSessionParams();
    summary.hidden = true;
    overlay.classList.remove("ended");
    overlay.hidden = false;
    document.body.classList.add("in-session");
    beep(660, 120, 1);
    setRunning(true);
    S.last = performance.now();
    clearInterval(S.timer);
    // Temporizador por reloj real: sigue contando aunque la pestaña quede en segundo plano.
    S.timer = setInterval(loop, 33);
  }

  function setRunning(on) {
    S.running = on;
    sessionEl.classList.toggle("paused", !on);
    emitter.classList.toggle("on", on);
    btnPause.querySelector("span").textContent = on ? "Pausar" : "Reanudar";
    elState.textContent = on ? "Terapia en curso" : "Terapia en pausa";
    setStatus(on ? "running" : "paused");
    updatePulseAnim();
  }

  function updatePulseAnim() {
    const dur = Math.max(0.28, 1 / (S.freq * S.speed));
    emitter.style.setProperty("--pulse-dur", `${dur}s`);
  }

  function loop() {
    const now = performance.now();
    const dt = Math.max(0, (now - S.last) / 1000);
    S.last = now;
    if (S.running) {
      S.elapsed += dt * S.speed;
      S.delivered = Math.min(S.total, S.elapsed * S.freq);
    }
    draw();
    if (S.running && S.delivered >= S.total) finish("done");
  }

  function draw() {
    const n = Math.floor(S.delivered);
    const frac = S.total ? S.delivered / S.total : 0;
    elCount.textContent = fmtInt(n);
    elPct.textContent = `${Math.floor(frac * 100)} %`;
    ringFill.style.strokeDashoffset = String(RING * (1 - frac));
    elElapsed.textContent = fmtTime(S.elapsed);
    elRemaining.textContent = fmtTime((S.total - S.delivered) / S.freq);
    drawScope();
  }

  // Forma de onda de presión de una onda de choque (normalizada a un periodo):
  // frente abrupto positivo seguido de una fase de tracción negativa amortiguada.
  function shape(u) {
    const rise = 0.015;
    if (u < rise) return u / rise;
    const x = u - rise;
    return Math.exp(-x / 0.045) * Math.cos(x * 2 * Math.PI * 5.5);
  }

  function drawScope() {
    const W = canvas.width, H = canvas.height, mid = H * 0.58;
    ctx.clearRect(0, 0, W, H);

    // retícula
    ctx.strokeStyle = "rgba(125,190,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += W / 12) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += H / 4) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = "rgba(125,190,255,0.2)";
    ctx.beginPath(); ctx.moveTo(0, mid + 0.5); ctx.lineTo(W, mid + 0.5); ctx.stroke();

    // traza: ventana de 3 periodos que termina en el instante actual
    const win = 3 / S.freq;
    const paused = !S.running;
    ctx.strokeStyle = paused ? "#fbbf24" : "#2ee6ff";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const t = S.elapsed - (1 - x / W) * win;
      let v = 0;
      if (t >= 0) {
        const pos = t * S.freq;
        const k = Math.floor(pos);
        if (k < S.total) v = shape(pos - k) * S.amp;
      }
      v += (Math.random() - 0.5) * 0.025;
      const y = mid - v * H * 0.5;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  btnPause.addEventListener("click", () => {
    if (!S.active) return;
    setRunning(!S.running);
  });

  // Detener: la emisión se pausa de inmediato y luego se pide confirmación.
  $("#btnStop").addEventListener("click", () => {
    if (!S.active) return;
    S.wasRunning = S.running;
    if (S.running) setRunning(false);
    openModal(stopModal);
  });
  function resumeAfterStopCancel() {
    closeModal(stopModal);
    if (S.wasRunning) setRunning(true);
  }
  $("#btnStopConfirm").addEventListener("click", () => {
    closeModal(stopModal);
    finish("stopped");
  });

  $$(".speed button").forEach((b) => b.addEventListener("click", () => {
    $$(".speed button").forEach((x) => x.classList.toggle("on", x === b));
    S.speed = parseInt(b.dataset.speed, 10);
    updatePulseAnim();
  }));

  function finish(state) {
    S.active = false;
    S.running = false;
    clearInterval(S.timer);
    draw();
    emitter.classList.remove("on");
    sessionEl.classList.add("paused");
    setStatus("ready");
    document.body.classList.remove("in-session");

    const delivered = Math.floor(S.delivered);
    addShots(delivered);

    const done = state === "done";
    const icon = $("#summaryIcon");
    icon.classList.toggle("warn", !done);
    const stateEl = $("#summaryState");
    stateEl.textContent = done ? "Tratamiento completado" : "Tratamiento interrumpido";
    stateEl.classList.toggle("warn", !done);

    const grid = $("#summaryGrid");
    grid.innerHTML = "";
    const add = (label, value, unit = "") => {
      const d = document.createElement("div");
      d.innerHTML = "<dt></dt><dd></dd>";
      d.querySelector("dt").textContent = label;
      d.querySelector("dd").textContent = value;
      if (unit) {
        const em = document.createElement("em");
        em.textContent = unit;
        d.querySelector("dd").appendChild(em);
      }
      grid.appendChild(d);
    };
    add("Pulsos aplicados", fmtInt(delivered), `/ ${fmtInt(S.total)}`);
    add("Duración", fmtTime(S.elapsed));
    params.filter((p) => p.key !== "pulses").forEach((p) => add(p.label, p.text(), p.unit));
    if (root.dataset.applicator) add("Aplicador", root.dataset.applicator);
    add("Hora", new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }));

    overlay.classList.add("ended");
    summary.hidden = false;
    if (done) beep(988, 140, 3); else beep(330, 260, 1);
  }

  $("#btnRepeat").addEventListener("click", () => {
    overlay.hidden = true;
    summary.hidden = true;
    btnStart.click();
  });

  // ---------- Teclado ----------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!stopModal.hidden) resumeAfterStopCancel();
      else if (!safety.hidden) closeModal(safety);
    }
    if (e.code === "Space" && S.active && stopModal.hidden) {
      e.preventDefault();
      setRunning(!S.running);
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (S.active) { e.preventDefault(); e.returnValue = ""; }
  });
})();
