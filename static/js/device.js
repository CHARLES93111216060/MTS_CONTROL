/*
 * Comportamiento común del equipo:
 *  - escala la carcasa (pantalla 1024x600 + bisel) al tamaño de la ventana
 *  - reloj y estado del sistema en la barra superior
 *  - contador de pulsos acumulados del aplicador (simulado, en localStorage)
 *  - secuencia de arranque y resaltado de zonas en el mapa corporal
 */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Escalado ----------
  const device = $("#device");
  function fit() {
    if (!device) return;
    device.style.transform = "none";
    const w = device.offsetWidth, h = device.offsetHeight;
    const s = Math.min(window.innerWidth / w, window.innerHeight / h) * 0.97;
    device.style.transform = `scale(${s})`;
  }
  window.addEventListener("resize", fit);
  fit();

  // ---------- Almacenamiento seguro ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } },
  };

  // ---------- Reloj ----------
  const clock = $("#clock");
  function tick() {
    if (!clock) return;
    const d = new Date();
    clock.textContent = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  tick();
  setInterval(tick, 10000);

  // ---------- Contador de pulsos del aplicador ----------
  const counter = $("#shotCounter");
  const fmtInt = (n) => Math.round(n).toLocaleString("es-CO");
  function getShots() { return parseInt(store.get("mts.shots", "0"), 10) || 0; }
  function addShots(n) {
    const total = getShots() + n;
    store.set("mts.shots", String(total));
    if (counter) counter.textContent = fmtInt(total);
  }
  if (counter) counter.textContent = fmtInt(getShots());

  // ---------- Estado del sistema ----------
  const status = $("#sysStatus");
  function setStatus(state) {
    if (!status) return;
    const labels = { ready: "LISTO", running: "EN TERAPIA", paused: "EN PAUSA" };
    status.classList.remove("running", "paused");
    if (state !== "ready") status.classList.add(state);
    status.querySelector("span").textContent = labels[state] || state;
  }

  // ---------- Pitido (Web Audio) ----------
  let audio = null;
  function beep(freq = 880, ms = 120, times = 1) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const t0 = audio.currentTime + i * (ms / 1000 + 0.08);
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
        osc.connect(gain).connect(audio.destination);
        osc.start(t0);
        osc.stop(t0 + ms / 1000 + 0.02);
      }
    } catch (e) { /* sin audio */ }
  }

  window.MTS = { $, $$, store, setStatus, addShots, beep, fmtInt };

  // ---------- Secuencia de arranque ----------
  const boot = $("#boot");
  if (boot) {
    const next = boot.dataset.next;
    const bar = $("#bootBar");
    const items = $$("#bootLog li");
    let gone = false;
    const go = () => { if (!gone) { gone = true; window.location.href = next; } };

    items.forEach((li, i) => {
      const t = parseInt(li.dataset.t, 10);
      setTimeout(() => {
        li.classList.add("show");
        if (bar) bar.style.width = `${((i + 0.5) / items.length) * 100}%`;
      }, t);
      setTimeout(() => {
        li.classList.add("done");
        if (bar) bar.style.width = `${((i + 1) / items.length) * 100}%`;
      }, t + 450);
    });
    const end = Math.max(...items.map((li) => parseInt(li.dataset.t, 10))) + 1100;
    setTimeout(() => { beep(1046, 90, 2); }, end - 400);
    setTimeout(go, end);
    boot.addEventListener("click", go);
  }

  // ---------- Mapa corporal: resaltar zona en figura y lista ----------
  $$("[data-zone]").forEach((el) => {
    const zone = el.dataset.zone;
    const peers = () => $$(`[data-zone="${zone}"]`);
    el.addEventListener("pointerenter", () => peers().forEach((p) => p.classList.add("hl")));
    el.addEventListener("pointerleave", () => peers().forEach((p) => p.classList.remove("hl")));
  });
})();
