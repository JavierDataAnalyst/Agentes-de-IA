/* Agentes de IA · guía paso a paso — interacción de la página */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Almacenamiento local seguro (puede no estar disponible).
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };

  /* ---------- Tema ---------- */
  const root = document.documentElement;
  const savedTheme = store.get("ag-theme", null);
  if (savedTheme) root.dataset.theme = savedTheme;
  const themeBtn = $("#theme-btn");
  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paintThemeIcon() { themeBtn.textContent = currentTheme() === "dark" ? "☀️" : "🌙"; }
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
    store.set("ag-theme", root.dataset.theme);
    paintThemeIcon();
  });
  paintThemeIcon();

  /* ---------- Menú móvil ---------- */
  $("#menu-btn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $$(".sidebar a").forEach(a => a.addEventListener("click", () => document.body.classList.remove("nav-open")));

  /* ---------- Barra de lectura y sección activa ---------- */
  const bar = $(".scroll-bar");
  const links = $$(".nav-link");
  const sections = links.map(l => $(l.getAttribute("href"))).filter(Boolean);
  function onScroll() {
    const h = document.documentElement;
    const pct = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.width = (pct * 100).toFixed(1) + "%";
    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top < 140) current = s;
    links.forEach(l => l.classList.toggle("active", current && l.getAttribute("href") === "#" + current.id));
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Progreso por módulo ---------- */
  const done = new Set(store.get("ag-done", []));
  const moduleIds = $$(".module[data-step]").map(m => m.id);
  function paintProgress() {
    const n = moduleIds.filter(id => done.has(id)).length;
    $(".progress-fill").style.width = (n / moduleIds.length * 100) + "%";
    $("#progress-label").textContent = n + "/" + moduleIds.length;
    links.forEach(l => l.classList.toggle("done", done.has(l.getAttribute("href").slice(1))));
    $$(".done-btn").forEach(b => {
      const on = done.has(b.closest(".module").id);
      b.setAttribute("aria-pressed", on);
      b.textContent = on ? "✓ Paso completado" : "Marcar como completado";
    });
  }
  $$(".done-btn").forEach(b => b.addEventListener("click", () => {
    const id = b.closest(".module").id;
    done.has(id) ? done.delete(id) : done.add(id);
    store.set("ag-done", Array.from(done));
    paintProgress();
  }));
  paintProgress();

  /* ---------- Pestañas genéricas ---------- */
  $$("[data-tabs]").forEach(group => {
    const buttons = $$("button", group);
    const show = btn => {
      buttons.forEach(b => {
        const on = b === btn;
        b.setAttribute("aria-selected", on);
        const p = $("#" + b.dataset.panel);
        if (p) p.hidden = !on;
      });
    };
    buttons.forEach(b => b.addEventListener("click", () => show(b)));
    show(buttons.find(b => b.getAttribute("aria-selected") === "true") || buttons[0]);
  });

  /* ---------- Niveles de agencia ---------- */
  const LEVELS = [
    { t: "Nivel 0 · Sin agencia", d: "Responde con lo que aprendió en su entrenamiento o ejecuta tareas predefinidas. No decide pasos ni usa herramientas.", e: "Un chatbot sin herramientas; un flujo de automatización fijo.", a: "Un auto sin ayudas: tú haces todo." },
    { t: "Nivel 1 · Asignación básica", d: "Clasifica o enruta situaciones dentro de un flujo que diseñó una persona.", e: "En atención al cliente, el modelo lee un ticket y lo envía al área correcta.", a: "El auto que te avisa si te sales del carril." },
    { t: "Nivel 2 · Usa herramientas", d: "Llama a herramientas externas para consultar datos o actuar en otros sistemas.", e: "Un asistente de viajes que busca y reserva vuelos.", a: "El control de crucero que frena solo." },
    { t: "Nivel 3 · Autónomo", d: "Encadena varios pasos por sí mismo: planifica, ejecuta, evalúa y corrige hasta cumplir el objetivo.", e: "Herramientas de investigación profunda que buscan, leen, contrastan fuentes y redactan un informe.", a: "El auto que te lleva de A a B mientras tú supervisas." }
  ];
  const lvlBtns = $$("#levels button");
  function showLevel(i) {
    lvlBtns.forEach((b, j) => b.setAttribute("aria-selected", i === j));
    $$("#level-meter span").forEach((s, j) => s.classList.toggle("on", j <= i));
    const L = LEVELS[i];
    $("#level-panel").innerHTML =
      "<h4>" + L.t + "</h4><p>" + L.d + "</p><p><b>Ejemplo:</b> " + L.e + "</p><p class='muted'>🚗 " + L.a + "</p>";
  }
  lvlBtns.forEach((b, i) => b.addEventListener("click", () => showLevel(i)));
  if (lvlBtns.length) showLevel(0);

  /* ---------- ¿Necesito un agente? ---------- */
  const answers = {};
  $$(".decider .q-row").forEach(row => {
    $$("button", row).forEach(b => b.addEventListener("click", () => {
      $$("button", row).forEach(x => x.setAttribute("aria-pressed", x === b));
      answers[row.dataset.q] = b.dataset.v === "si";
      decide();
    }));
  });
  function decide() {
    const out = $("#verdict");
    const crit = ["datos", "decision", "contexto"];
    if (crit.some(k => !(k in answers))) {
      out.innerHTML = "<strong>Responde las tres primeras preguntas</strong>Con eso sabremos si el caso justifica un agente.";
      return;
    }
    const n = crit.filter(k => answers[k]).length;
    if (n === 0) {
      out.innerHTML = "<strong>🤖 Un chatbot o una automatización tradicional</strong>El caso no necesita razonar sobre datos variados ni decidir caso a caso. Un agente sería sobreingeniería y gasto extra.";
      return;
    }
    if (!("madura" in answers)) {
      out.innerHTML = "<strong>Vas bien: el caso puede justificar un agente</strong>Responde las dos últimas preguntas para saber si conviene comprarlo o construirlo.";
      return;
    }
    if (answers.madura) {
      out.innerHTML = "<strong>🛒 Usa una herramienta lista para usar</strong>Ya existe una solución madura: menos mantenimiento y resultados más rápidos.";
      return;
    }
    if (!("propio" in answers)) {
      out.innerHTML = "<strong>Falta una respuesta</strong>¿Hay sistemas propios, datos confidenciales o requisitos muy especializados?";
      return;
    }
    out.innerHTML = answers.propio
      ? "<strong>🛠️ Construye con un framework de agentes</strong>Sistemas propios o datos sensibles justifican el control total (p. ej., LangGraph, CrewAI o la API de un modelo)."
      : "<strong>🧩 Usa una plataforma low-code</strong>Personalizas sin programar todo desde cero y te integras rápido con lo que ya tienes (p. ej., n8n, Zapier).";
  }
  if ($("#verdict")) decide();

  /* ---------- Stepper del ciclo TAO ---------- */
  const TAO = [
    { t: "Primero, ¿qué mesas hay mañana a las 7 p. m.?", a: "Consultar capacidad para 6 en el sistema de reservas.", o: "Libres: mesa 12 (bar), mesa 5 (rincón tranquilo), mesa 8 (segundo piso)." },
    { t: "¿Cuáles son accesibles para silla de ruedas?", a: "Revisar las características de accesibilidad de esas mesas.", o: "Solo la 5 es accesible; la 8 tiene escaleras y la 12, escalones." },
    { t: "La 5 es accesible y tranquila. La reservo.", a: "Reservar la mesa 5 para 6 personas con nota de accesibilidad.", o: "Reserva confirmada: R-7891." },
    { t: "Falta la torta de cumpleaños.", a: "Pedir la torta a la pastelería.", o: "Torta de chocolate “Feliz cumpleaños, mamá”, lista a las 6:30 p. m." },
    { t: "Todo listo. Confirmo los detalles con el cliente.", a: "Enviar un mensaje de confirmación completo.", o: "El cliente recibe: mesa 5 (tranquila y accesible), 7 p. m., torta encargada. ✅" }
  ];
  let cycle = 0, phase = -1; // fase: 0 pensamiento, 1 acción, 2 observación
  const tao = $("#tao");
  function paintTao() {
    if (!tao) return;
    const c = TAO[cycle];
    $("#tao-t").textContent = c.t;
    $("#tao-a").textContent = c.a;
    $("#tao-o").textContent = c.o;
    $$(".tao-step", tao).forEach((s, i) => s.classList.toggle("on", i <= phase));
    $$(".tao-ring .node", tao).forEach((n, i) => n.classList.toggle("on", i === phase));
    $("#tao-count").textContent = "Ciclo " + (cycle + 1) + " de " + TAO.length;
    const last = cycle === TAO.length - 1 && phase === 2;
    $("#tao-next").textContent = phase < 2 ? "Siguiente paso →" : (last ? "Reiniciar ↺" : "Siguiente ciclo →");
  }
  if (tao) {
    $("#tao-next").addEventListener("click", () => {
      if (phase < 2) phase++;
      else if (cycle < TAO.length - 1) { cycle++; phase = 0; }
      else { cycle = 0; phase = -1; }
      paintTao();
    });
    $("#tao-prev").addEventListener("click", () => {
      if (phase > 0) phase--;
      else if (cycle > 0) { cycle--; phase = 2; }
      else phase = -1;
      paintTao();
    });
    paintTao();
  }

  /* ---------- Quizzes ---------- */
  $$(".quiz").forEach(q => {
    $$(".opts button", q).forEach(b => b.addEventListener("click", () => {
      $$(".opts button", q).forEach(x => x.classList.remove("correct", "wrong"));
      const ok = b.hasAttribute("data-ok");
      b.classList.add(ok ? "correct" : "wrong");
      $(".feedback", q).textContent = b.dataset.why || (ok ? "¡Correcto!" : "Revisa de nuevo la sección.");
    }));
  });

  /* ---------- Checklist de construcción ---------- */
  const checks = store.get("ag-build", {});
  $$(".build-steps input[type=checkbox]").forEach((c, i) => {
    c.checked = !!checks[i];
    c.addEventListener("change", () => { checks[i] = c.checked; store.set("ag-build", checks); });
  });

  /* ---------- Código: carga, resaltado y copiar ---------- */
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const PY = /(#[^\n]*)|("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(def|return|for|in|if|not|import|from|try|except|as|and|or|None|True|False|while|else|elif|lambda|with|class)\b|\b(\d+)\b/g;
  function highlight(code) {
    return esc(code).replace(PY, (m, c, s, k, n) =>
      c ? "<span class='tok-c'>" + c + "</span>" :
      s ? "<span class='tok-s'>" + s + "</span>" :
      k ? "<span class='tok-k'>" + k + "</span>" :
      "<span class='tok-n'>" + n + "</span>");
  }
  $$("pre.py").forEach(pre => { pre.dataset.raw = pre.textContent; pre.innerHTML = highlight(pre.textContent); });
  $$(".copy-btn").forEach(b => b.addEventListener("click", () => {
    const pre = $("pre", b.closest(".code-block"));
    const text = pre.dataset.raw || pre.textContent;
    const ok = () => { b.textContent = "Copiado ✓"; setTimeout(() => (b.textContent = "Copiar"), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => {});
  }));

  /* ---------- Tarjetas de repaso (tipo Anki) ----------
     Orden aleatorio en cada visita; las tarjetas marcadas “Repasar”
     o nunca vistas salen antes que las que ya sabías. */
  const known = store.get("ag-cards", {});
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  $$(".module[data-step]").forEach(mod => {
    const cards = (window.FLASHCARDS || {})[mod.id];
    if (!cards || !cards.length) return;
    const ids = cards.map((_, i) => mod.id + "-" + i);
    const pending = shuffle(ids.filter(id => !known[id]));
    const learned = shuffle(ids.filter(id => known[id]));
    let queue = pending.concat(learned);
    let flipped = false;

    const box = document.createElement("div");
    box.className = "flash";
    box.innerHTML =
      "<div class='flash-head'><b>🃏 Tarjetas de repaso</b><span class='flash-meta'></span></div>" +
      "<button class='flash-card' type='button' aria-label='Voltear la tarjeta'><div class='flash-inner'>" +
      "<div class='face front'><small class='flash-type'></small><p class='flash-q'></p><span class='flash-hint'>Toca para ver la respuesta</span></div>" +
      "<div class='face back' aria-live='polite'><small>Respuesta</small><p class='flash-a'></p></div>" +
      "</div></button>" +
      "<div class='flash-actions'>" +
      "<button class='btn small flash-skip' type='button'>Otra tarjeta ↻</button>" +
      "<button class='btn small flash-again' type='button'>😕 Repasar</button>" +
      "<button class='btn small primary flash-ok' type='button'>✅ La sabía</button>" +
      "</div>";
    mod.insertBefore(box, $(".module-foot", mod));

    const card = $(".flash-card", box);
    function render() {
      const id = queue[0];
      const c = cards[ids.indexOf(id)];
      flipped = false;
      card.classList.remove("flipped");
      $(".flash-type", box).textContent = c.tipo;
      $(".flash-q", box).textContent = c.q;
      $(".flash-a", box).textContent = c.a;
      const n = ids.filter(x => known[x]).length;
      $(".flash-meta", box).textContent = "Dominadas " + n + "/" + ids.length;
      box.classList.toggle("is-flipped", false);
    }
    function flip() {
      flipped = !flipped;
      card.classList.toggle("flipped", flipped);
      box.classList.toggle("is-flipped", flipped);
    }
    function next(mark) {
      const id = queue.shift();
      if (mark === "ok") { known[id] = 1; queue.push(id); }
      else if (mark === "again") { delete known[id]; queue.splice(Math.min(2, queue.length), 0, id); }
      else queue.push(id);
      store.set("ag-cards", known);
      render();
    }
    card.addEventListener("click", flip);
    $(".flash-skip", box).addEventListener("click", () => next());
    $(".flash-again", box).addEventListener("click", () => next("again"));
    $(".flash-ok", box).addEventListener("click", () => next("ok"));
    render();
  });

  /* ---------- Glosario ---------- */
  const search = $("#gloss-search");
  if (search) search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    $$(".gloss div").forEach(d => { d.hidden = q && !d.textContent.toLowerCase().includes(q); });
  });
})();
