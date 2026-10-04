// Interactive figures for the course website. Each widget is a function that fills a container.
(function () {
  const D = window.WIDGET_DATA;
  const sig = (z) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  const logit = (p) => Math.log(p / (1 - p));
  function erf(x) { // Abramowitz & Stegun 7.1.26
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#333";

  // coolwarm-like colour scale: blue (0) -> light grey (0.5) -> red (1)
  function coolwarm(p) {
    const a = [59, 76, 192], m = [221, 221, 221], b = [180, 4, 38];
    const [c0, c1, t] = p < 0.5 ? [a, m, p / 0.5] : [m, b, (p - 0.5) / 0.5];
    return c0.map((v, i) => Math.round(v + (c1[i] - v) * t));
  }
  const RED = "rgb(200,40,50)", BLUE = "rgb(50,90,200)";
  const SERIES = ["#2a78c4", "#e07b1a", "#2e9e5a", "#c43c3c", "#8a5cc7"];

  // ---------------------------------------------------------------- small plotting helper
  class Plot {
    constructor(parent, opts) {
      this.o = Object.assign({ w: 520, h: 320, pad: [14, 16, 42, 50], xr: [0, 1], yr: [0, 1] }, opts);
      this.canvas = document.createElement("canvas");
      this.canvas.className = "wcanvas";
      parent.appendChild(this.canvas);
      this.resize();
    }
    resize() {
      const dpr = window.devicePixelRatio || 1;
      const maxW = Math.min(this.o.w, (this.canvas.parentElement.clientWidth || this.o.w) - 4);
      this.W = Math.max(260, maxW);
      this.H = Math.round(this.o.h * this.W / this.o.w);
      this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
      this.canvas.style.width = this.W + "px"; this.canvas.style.height = this.H + "px";
      this.ctx = this.canvas.getContext("2d");
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    get L() { return this.o.pad[3]; } get R() { return this.W - this.o.pad[1]; }
    get T() { return this.o.pad[0]; } get B() { return this.H - this.o.pad[2]; }
    X(x) { const [a, b] = this.o.xr; return this.L + (x - a) / (b - a) * (this.R - this.L); }
    Y(y) { const [a, b] = this.o.yr; return this.B - (y - a) / (b - a) * (this.B - this.T); }
    invX(px) { const [a, b] = this.o.xr; return a + (px - this.L) / (this.R - this.L) * (b - a); }
    invY(py) { const [a, b] = this.o.yr; return a + (this.B - py) / (this.B - this.T) * (b - a); }
    clear() { this.ctx.clearRect(0, 0, this.W, this.H); }
    ticks([a, b], n = 5) {
      const step0 = (b - a) / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || mag * 10;
      const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
      return out;
    }
    axes(xlabel, ylabel, opts = {}) {
      const c = this.ctx, fg = css("--muted"), grid = css("--grid");
      c.save(); c.font = "12px system-ui, sans-serif"; c.fillStyle = fg; c.strokeStyle = grid; c.lineWidth = 1;
      const xt = opts.xticks || this.ticks(this.o.xr), yt = opts.yticks || this.ticks(this.o.yr);
      c.textAlign = "center"; c.textBaseline = "top";
      for (const v of xt) { const x = this.X(v); c.beginPath(); c.moveTo(x, this.T); c.lineTo(x, this.B); c.stroke(); c.fillText(opts.xfmt ? opts.xfmt(v) : v, x, this.B + 5); }
      c.textAlign = "right"; c.textBaseline = "middle";
      for (const v of yt) { const y = this.Y(v); c.beginPath(); c.moveTo(this.L, y); c.lineTo(this.R, y); c.stroke(); c.fillText(v, this.L - 6, y); }
      c.strokeStyle = fg; c.strokeRect(this.L, this.T, this.R - this.L, this.B - this.T);
      c.textAlign = "center"; c.textBaseline = "bottom"; c.fillText(xlabel || "", (this.L + this.R) / 2, this.H - 4);
      c.save(); c.translate(13, (this.T + this.B) / 2); c.rotate(-Math.PI / 2); c.textBaseline = "middle"; c.fillText(ylabel || "", 0, 0); c.restore();
      c.restore();
    }
    clip(fn) { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.L, this.T, this.R - this.L, this.B - this.T); c.clip(); fn(c); c.restore(); }
    curve(f, color, width = 2.5, dash) {
      this.clip((c) => {
        c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash || []); c.beginPath();
        const n = 400;
        for (let i = 0; i <= n; i++) { const x = this.o.xr[0] + (this.o.xr[1] - this.o.xr[0]) * i / n; const y = f(x); i ? c.lineTo(this.X(x), this.Y(y)) : c.moveTo(this.X(x), this.Y(y)); }
        c.stroke();
      });
    }
    polyline(xs, ys, color, width = 2) {
      this.clip((c) => { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); xs.forEach((x, i) => (i ? c.lineTo(this.X(x), this.Y(ys[i])) : c.moveTo(this.X(x), this.Y(ys[i])))); c.stroke(); });
    }
    segment(x1, y1, x2, y2, color, width = 2, dash) {
      this.clip((c) => { c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash || []); c.beginPath(); c.moveTo(this.X(x1), this.Y(y1)); c.lineTo(this.X(x2), this.Y(y2)); c.stroke(); });
    }
    points(xs, ys, colors, r = 4) {
      const c = this.ctx; c.save(); c.strokeStyle = "rgba(0,0,0,0.7)"; c.lineWidth = 0.8;
      xs.forEach((x, i) => { c.fillStyle = Array.isArray(colors) ? colors[i] : colors; c.beginPath(); c.arc(this.X(x), this.Y(ys[i]), r, 0, 2 * Math.PI); c.fill(); c.stroke(); });
      c.restore();
    }
    dot(x, y, color, r = 6) { this.points([x], [y], color, r); }
    heat(prob, alpha = 0.8) { // colour the plot area by prob(x, y) in [0, 1]
      const c = this.ctx, step = 4;
      for (let px = this.L; px < this.R; px += step) for (let py = this.T; py < this.B; py += step) {
        const p = prob(this.invX(px + step / 2), this.invY(py + step / 2));
        const [r, g, b] = coolwarm(p); c.fillStyle = `rgba(${r},${g},${b},${alpha})`; c.fillRect(px, py, step, step);
      }
    }
    // the line w1 x + w2 y + b = level, clipped to the plot
    lineWB(w1, w2, b, level, color, width = 2, dash) {
      const [x0, x1] = this.o.xr, [y0, y1] = this.o.yr;
      if (Math.abs(w2) > 1e-9) this.segment(x0, (level - b - w1 * x0) / w2, x1, (level - b - w1 * x1) / w2, color, width, dash);
      else if (Math.abs(w1) > 1e-9) this.segment((level - b) / w1, y0, (level - b) / w1, y1, color, width, dash);
    }
    text(str, x, y, color, align = "left", font = "13px system-ui, sans-serif") {
      const c = this.ctx; c.save(); c.fillStyle = color || css("--fg"); c.font = font; c.textAlign = align; c.fillText(str, x, y); c.restore();
    }
  }

  // ---------------------------------------------------------------- UI helpers
  function controls(box) { const d = document.createElement("div"); d.className = "wcontrols"; box.appendChild(d); return d; }
  function slider(parent, label, { min, max, step, value, fmt, onInput }) {
    const wrap = document.createElement("label"); wrap.className = "wslider";
    const span = document.createElement("span"); span.className = "wlabel";
    const input = document.createElement("input"); input.type = "range"; Object.assign(input, { min, max, step, value });
    const out = document.createElement("span"); out.className = "wvalue";
    const upd = () => { out.textContent = fmt ? fmt(+input.value) : input.value; onInput(+input.value); };
    input.addEventListener("input", upd);
    span.textContent = label; wrap.append(span, input, out); parent.appendChild(wrap);
    setTimeout(upd, 0);
    return input;
  }
  function button(parent, label, onClick, cls = "btn small") {
    const b = document.createElement("button"); b.className = cls; b.textContent = label; b.onclick = onClick; parent.appendChild(b); return b;
  }
  function select(parent, label, options, onChange) {
    const wrap = document.createElement("label"); wrap.className = "wselect";
    const span = document.createElement("span"); span.className = "wlabel"; span.textContent = label;
    const s = document.createElement("select");
    options.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; s.appendChild(o); });
    s.onchange = () => onChange(s.value); wrap.append(span, s); parent.appendChild(wrap); return s;
  }
  function readout(box) { const d = document.createElement("div"); d.className = "wreadout"; box.appendChild(d); return d; }
  function caption(box, text) { const d = document.createElement("div"); d.className = "wcaption"; d.innerHTML = text; box.appendChild(d); }
  function row(box) { const d = document.createElement("div"); d.className = "wrow"; box.appendChild(d); return d; }
  function title(box, t) { const d = document.createElement("div"); d.className = "wtitle"; d.textContent = t; box.appendChild(d); }

  const W = {};

  // 1. sigmoid zoom -------------------------------------------------------------------
  W["sigmoid-zoom"] = (box) => {
    title(box, "Interactive: zoom in and out of the logistic function");
    const p = new Plot(box, { w: 560, h: 300 });
    const draw = (a) => {
      p.o.xr = [-a, a]; p.o.yr = [-0.05, 1.05]; p.clear();
      p.axes("z", "σ(z)", { yticks: [0, 0.25, 0.5, 0.75, 1] });
      p.segment(-a, 0.5, a, 0.5, css("--muted"), 1, [4, 4]);
      p.curve(sig, SERIES[0], 3);
    };
    const c = controls(box);
    slider(c, "range a", { min: -1, max: Math.log10(50), step: 0.01, value: Math.log10(6),
      fmt: (v) => "z ∈ [−" + (10 ** v).toPrecision(2) + ", " + (10 ** v).toPrecision(2) + "]", onInput: (v) => draw(10 ** v) });
    caption(box, "Small range: almost a straight line. Medium: the S-shape. Large: a step (the perceptron).");
  };

  // 2. four sigmoids -------------------------------------------------------------------
  W["four-sigmoids"] = (box) => {
    title(box, "Interactive: four squashing functions");
    const fs = [["logistic", sig], ["probit", (z) => 0.5 * (1 + erf(z / Math.SQRT2))],
      ["algebraic", (z) => 0.5 * (z / Math.sqrt(1 + z * z) + 1)], ["tanh (rescaled)", (z) => 0.5 * (Math.tanh(z) + 1)]];
    const p = new Plot(box, { w: 560, h: 300 });
    const draw = (a) => {
      p.o.xr = [-a, a]; p.o.yr = [-0.05, 1.05]; p.clear(); p.axes("z", "f(z)", { yticks: [0, 0.5, 1] });
      fs.forEach(([n, f], i) => p.curve(f, SERIES[i], 2.5));
      fs.forEach(([n], i) => { p.ctx.fillStyle = SERIES[i]; p.ctx.fillRect(p.L + 12, p.T + 10 + 18 * i, 14, 4); p.text(n, p.L + 32, p.T + 16 + 18 * i); });
    };
    slider(controls(box), "range", { min: 1, max: 25, step: 0.5, value: 6, fmt: (v) => "±" + v, onInput: draw });
    caption(box, "Zoom out and look at the tails: the algebraic sigmoid approaches 0 and 1 much more slowly than the others.");
  };

  // 3. hypothesis on the exam data --------------------------------------------------------
  W["hypothesis-1d"] = (box) => {
    title(box, "Interactive: fit h(x) = σ(wx + b) to the exam data by hand");
    const { x, y } = D.exam;
    const p = new Plot(box, { w: 560, h: 320, xr: [0, 10], yr: [-0.1, 1.1] });
    const ro = readout(box);
    let w = 1, b = -5;
    const draw = () => {
      p.clear(); p.axes("hours studied", "P(pass)", { yticks: [0, 0.5, 1] });
      p.curve((t) => sig(w * t + b), "rgb(40,150,70)", 3);
      if (Math.abs(w) > 1e-6 && -b / w > 0 && -b / w < 10) p.segment(-b / w, -0.1, -b / w, 1.1, css("--muted"), 1.5, [5, 4]);
      p.points(x, y, y.map((v) => (v ? RED : BLUE)), 5);
      let L = 0; x.forEach((xi, i) => { const h = Math.min(Math.max(sig(w * xi + b), 1e-12), 1 - 1e-12); L -= y[i] ? Math.log(h) : Math.log(1 - h); });
      ro.innerHTML = `log-loss on the 40 students: <b>${(L / x.length).toFixed(3)}</b>` +
        (Math.abs(w) > 1e-6 ? ` &nbsp;·&nbsp; boundary at x = ${(-b / w).toFixed(2)}` : "") +
        ` &nbsp;·&nbsp; <span class="muted">best possible ≈ 0.306</span>`;
    };
    const c = controls(box);
    slider(c, "w", { min: -3, max: 5, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { w = v; draw(); } });
    slider(c, "b", { min: -25, max: 10, step: 0.25, value: -5, fmt: (v) => v.toFixed(2), onInput: (v) => { b = v; draw(); } });
    caption(box, "Try to get the log-loss as low as you can. (Gradient descent finds w ≈ 1.12, b ≈ −5.96.)");
  };

  // 4. per-example loss ----------------------------------------------------------------
  W["loss-per-example"] = (box) => {
    title(box, "Interactive: how much does one example cost?");
    const p = new Plot(box, { w: 560, h: 300, xr: [0, 1], yr: [0, 5] });
    const ro = readout(box);
    let h = 0.3, yv = 1;
    const draw = () => {
      p.clear(); p.axes("predicted probability h", "loss for this example");
      const sq = (t) => (yv ? (1 - t) ** 2 : t * t), lg = (t) => (yv ? -Math.log(Math.max(t, 1e-9)) : -Math.log(Math.max(1 - t, 1e-9)));
      p.curve(sq, SERIES[0], 2.5); p.curve(lg, SERIES[1], 2.5);
      p.dot(h, Math.min(sq(h), 5), SERIES[0], 6); p.dot(h, Math.min(lg(h), 5), SERIES[1], 6);
      p.text("squared error", p.R - 10, p.T + 18, SERIES[0], "right"); p.text("log-loss", p.R - 10, p.T + 36, SERIES[1], "right");
      ro.innerHTML = `true label y = ${yv}, prediction h = ${h.toFixed(3)}: &nbsp; squared error = <b>${sq(h).toFixed(3)}</b>, &nbsp; log-loss = <b>${lg(h).toFixed(3)}</b>`;
    };
    const c = controls(box);
    slider(c, "h", { min: 0.001, max: 0.999, step: 0.001, value: 0.3, fmt: (v) => v.toFixed(3), onInput: (v) => { h = v; draw(); } });
    select(c, "true label", [["1", "y = 1"], ["0", "y = 0"]], (v) => { yv = +v; draw(); });
    caption(box, "Make the model confidently wrong: squared error never exceeds 1, but log-loss grows without limit.");
  };

  // 5. gradient descent animation ---------------------------------------------------------
  W["gd-animation"] = (box) => {
    title(box, "Interactive: watch gradient descent train the model");
    const { x, y } = D.exam, N = x.length;
    const r = row(box);
    const pd = new Plot(r, { w: 370, h: 280, xr: [0, 10], yr: [-0.1, 1.1] });
    const pl = new Plot(r, { w: 350, h: 280, xr: [0, 3000], yr: [0, 1.5] });
    const ro = readout(box);
    let loss = "log", start = [0, 0], w, b, step, hist, timer = null;
    const lossOf = (w, b) => { let L = 0; for (let i = 0; i < N; i++) { const h = Math.min(Math.max(sig(w * x[i] + b), 1e-12), 1 - 1e-12); L += loss === "log" ? -(y[i] ? Math.log(h) : Math.log(1 - h)) : (h - y[i]) ** 2; } return L / N; };
    const reset = () => { [w, b] = start; step = 0; hist = [lossOf(w, b)]; draw(); };
    const gdStep = () => {
      const eta = loss === "log" ? 0.1 : 0.5; let gw = 0, gb = 0;
      for (let i = 0; i < N; i++) { const h = sig(w * x[i] + b); const g = loss === "log" ? h - y[i] : 2 * (h - y[i]) * h * (1 - h); gw += g * x[i]; gb += g; }
      w -= eta * gw / N; b -= eta * gb / N; step++;
    };
    const draw = () => {
      pd.clear(); pd.axes("hours studied", "P(pass)", { yticks: [0, 0.5, 1] });
      pd.curve((t) => sig(w * t + b), "rgb(40,150,70)", 3); pd.points(x, y, y.map((v) => (v ? RED : BLUE)), 4.5);
      pl.o.yr = [0, loss === "log" ? 1.5 : 0.6]; pl.clear(); pl.axes("step", loss === "log" ? "log-loss" : "squared error");
      pl.polyline(hist.map((_, i) => i * 10), hist, SERIES[1], 2);
      let acc = 0; for (let i = 0; i < N; i++) acc += (sig(w * x[i] + b) >= 0.5) === (y[i] === 1);
      ro.innerHTML = `step ${step} &nbsp;·&nbsp; w = ${w.toFixed(3)}, b = ${b.toFixed(3)} &nbsp;·&nbsp; loss = <b>${hist[hist.length - 1].toFixed(4)}</b> &nbsp;·&nbsp; training accuracy = ${(acc / N).toFixed(3)}`;
    };
    const play = () => {
      if (timer) { clearInterval(timer); timer = null; pb.textContent = "▶ Play"; return; }
      pb.textContent = "⏸ Pause";
      timer = setInterval(() => {
        for (let k = 0; k < 10; k++) gdStep();
        hist.push(lossOf(w, b)); draw();
        if (step >= 3000) { clearInterval(timer); timer = null; pb.textContent = "▶ Play"; }
      }, 16);
    };
    const c = controls(box);
    const pb = button(c, "▶ Play", play, "btn small primary");
    button(c, "↺ Reset", () => { if (timer) play(); reset(); });
    select(c, "loss", [["log", "log-loss (η = 0.1)"], ["sq", "squared error (η = 0.5)"]], (v) => { loss = v === "log" ? "log" : "sq"; if (timer) play(); reset(); });
    select(c, "start", [["0,0", "w = 0, b = 0"], ["-2,0", "w = −2, b = 0"]], (v) => { start = v.split(",").map(Number); if (timer) play(); reset(); });
    caption(box, "Try: squared error starting from w = −2. It gets stuck on the plateau (section 4.2). Log-loss from the same start finds the minimum.");
    reset();
  };

  // shared: the clinic data (01b)
  const clinic = D.clinic;
  const clinicPlot = (parent, opts = {}) => new Plot(parent, Object.assign({ w: 520, h: 420, xr: [-1, 11], yr: [-3, 10] }, opts));
  const clinicColors = (ys) => ys.map((v) => (v ? RED : BLUE));

  // 6. drag the line -----------------------------------------------------------------------
  W["drag-line"] = (box) => {
    title(box, "Interactive: draw your own decision boundary");
    const { x1, x2, y } = clinic.train, N = y.length;
    const p = clinicPlot(box);
    const ro = readout(box);
    let P = [2, 8], Q = [8, 0], flip = true, sharp = 1.5, drag = null;
    const params = () => { // line through P and Q; w perpendicular, scaled by `sharp`
      let n = [Q[1] - P[1], -(Q[0] - P[0])]; const len = Math.hypot(n[0], n[1]) || 1; n = [n[0] / len * sharp, n[1] / len * sharp];
      if (flip) n = [-n[0], -n[1]]; return [n[0], n[1], -(n[0] * P[0] + n[1] * P[1])];
    };
    const draw = () => {
      const [w1, w2, b] = params();
      p.clear(); p.heat((u, v) => sig(w1 * u + w2 * v + b), 0.7); p.axes("test A (x1)", "test B (x2)");
      p.lineWB(w1, w2, b, 0, "#111", 2.5); p.points(x1, x2, clinicColors(y), 4);
      [P, Q].forEach((pt) => { p.dot(pt[0], pt[1], "#ffd400", 8); });
      let L = 0, acc = 0;
      for (let i = 0; i < N; i++) { const h = Math.min(Math.max(sig(w1 * x1[i] + w2 * x2[i] + b), 1e-12), 1 - 1e-12); L -= y[i] ? Math.log(h) : Math.log(1 - h); acc += (h >= 0.5) === (y[i] === 1); }
      ro.innerHTML = `your line: log-loss = <b>${(L / N).toFixed(3)}</b>, accuracy = <b>${(acc / N).toFixed(3)}</b> &nbsp;·&nbsp; <span class="muted">sklearn's fit: log-loss ≈ ${bestLoss.toFixed(3)}</span>`;
    };
    // sklearn's loss, for reference
    let bestLoss = 0; { const [sw1, sw2] = clinic.w, sb = clinic.b; for (let i = 0; i < N; i++) { const h = Math.min(Math.max(sig(sw1 * x1[i] + sw2 * x2[i] + sb), 1e-12), 1 - 1e-12); bestLoss -= y[i] ? Math.log(h) : Math.log(1 - h); } bestLoss /= N; }
    const pos = (e) => { const r = p.canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [p.invX(t.clientX - r.left), p.invY(t.clientY - r.top)]; };
    const near = (a, bb) => Math.hypot(p.X(a[0]) - p.X(bb[0]), p.Y(a[1]) - p.Y(bb[1])) < 22;
    const down = (e) => { const m = pos(e); drag = near(m, P) ? P : near(m, Q) ? Q : null; if (drag) e.preventDefault(); };
    const move = (e) => { if (!drag) return; const m = pos(e); drag[0] = Math.min(Math.max(m[0], p.o.xr[0]), p.o.xr[1]); drag[1] = Math.min(Math.max(m[1], p.o.yr[0]), p.o.yr[1]); draw(); e.preventDefault(); };
    const up = () => { drag = null; };
    p.canvas.addEventListener("mousedown", down); window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    p.canvas.addEventListener("touchstart", down, { passive: false }); p.canvas.addEventListener("touchmove", move, { passive: false }); p.canvas.addEventListener("touchend", up);
    const c = controls(box);
    slider(c, "‖w‖ (sharpness)", { min: 0.1, max: 5, step: 0.05, value: 1.5, fmt: (v) => v.toFixed(2), onInput: (v) => { sharp = v; draw(); } });
    button(c, "⇄ Swap the sides", () => { flip = !flip; draw(); });
    caption(box, "Drag the two yellow points to move the line. Can you get close to sklearn's log-loss? Notice that the sharpness changes the loss even when the line stays put.");
  };

  // 7. sharpness (01b section 2) ----------------------------------------------------------
  W["sharpness"] = (box) => {
    title(box, "Interactive: multiply w and b by c");
    const { x1, x2, y } = clinic.train, [w1, w2] = clinic.w, b = clinic.b;
    const p = clinicPlot(box);
    const draw = (c) => {
      p.clear(); p.heat((u, v) => sig(c * (w1 * u + w2 * v + b)), 0.75); p.axes("test A (x1)", "test B (x2)");
      [[0.1, 1], [0.9, 1]].forEach(([lvl]) => p.lineWB(c * w1, c * w2, c * b, logit(lvl), "#222", 1.2, [5, 4]));
      p.lineWB(c * w1, c * w2, c * b, 0, "#111", 2.5); p.points(x1, x2, clinicColors(y), 4);
    };
    slider(controls(box), "c", { min: -1, max: 1, step: 0.01, value: 0, fmt: (v) => "c = " + (10 ** v).toFixed(2), onInput: (v) => draw(10 ** v) });
    caption(box, "The boundary (thick line) never moves; the 0.1 and 0.9 lines (dashed) move closer together as c grows: the model becomes more confident.");
  };

  // 8. threshold + ROC (01b section 4.4) -------------------------------------------------
  W["threshold-roc"] = (box) => {
    title(box, "Interactive: move the threshold");
    const { x1, x2, y } = clinic.test, [w1, w2] = clinic.w, b = clinic.b, N = y.length;
    const prob = x1.map((u, i) => sig(w1 * u + w2 * x2[i] + b));
    // ROC curve
    const order = prob.map((p, i) => i).sort((a, c) => prob[c] - prob[a]);
    const P = y.filter((v) => v).length, Nn = N - P; const roc = [[0, 0]]; let tp = 0, fp = 0;
    order.forEach((i) => { if (y[i]) tp++; else fp++; roc.push([fp / Nn, tp / P]); });
    const r = row(box);
    const pm = clinicPlot(r, { w: 380, h: 330 });
    const pr = new Plot(r, { w: 330, h: 330, xr: [0, 1], yr: [0, 1] });
    const ro = readout(box);
    const draw = (t) => {
      pm.clear(); pm.heat((u, v) => sig(w1 * u + w2 * v + b), 0.7); pm.axes("test A", "test B");
      pm.lineWB(w1, w2, b, logit(t), "#111", 2.5); pm.points(x1, x2, clinicColors(y), 4);
      let TP = 0, FP = 0, FN = 0, TN = 0;
      prob.forEach((p, i) => { const pred = p >= t; if (pred && y[i]) TP++; else if (pred) FP++; else if (y[i]) FN++; else TN++; });
      pr.clear(); pr.axes("false positive rate", "true positive rate (recall)");
      pr.segment(0, 0, 1, 1, css("--muted"), 1, [4, 4]);
      pr.polyline(roc.map((q) => q[0]), roc.map((q) => q[1]), SERIES[0], 2.5);
      pr.dot(FP / Nn, TP / P, "#e0322d", 7);
      const prec = TP + FP ? TP / (TP + FP) : NaN;
      ro.innerHTML = `<table class="cm"><tr><td></td><th>predicted healthy</th><th>predicted sick</th></tr>
        <tr><th>healthy</th><td>TN = ${TN}</td><td>FP = ${FP}</td></tr><tr><th>sick</th><td>FN = ${FN}</td><td>TP = ${TP}</td></tr></table>
        accuracy = <b>${((TP + TN) / N).toFixed(3)}</b> &nbsp;·&nbsp; precision = <b>${isNaN(prec) ? "—" : prec.toFixed(3)}</b> &nbsp;·&nbsp; recall = <b>${(TP / P).toFixed(3)}</b>`;
    };
    slider(controls(box), "threshold t", { min: 0.02, max: 0.98, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2), onInput: draw });
    caption(box, "200 new (test) patients. Lower the threshold: more sick patients caught (recall up), more false alarms, and the red dot climbs the ROC curve.");
  };

  // 9. C slider (03b section 5.1) -------------------------------------------------------
  W["c-slider"] = (box) => {
    title(box, "Interactive: the regularization strength C");
    const S = D.clinic_scaled, fits = S.fits;
    const p = new Plot(box, { w: 520, h: 440, xr: [-3, 3.2], yr: [-4, 3.2] });
    const ro = readout(box);
    const draw = (k) => {
      const f = fits[k], [w1, w2] = f.w, b = f.b;
      p.clear(); p.heat((u, v) => sig(w1 * u + w2 * v + b), 0.75); p.axes("test A (scaled)", "test B (scaled)");
      p.lineWB(w1, w2, b, 0, "#111", 2.5); p.points(S.x1, S.x2, clinicColors(S.y), 3.5);
      ro.innerHTML = `C = <b>${(10 ** f.log10C).toPrecision(2)}</b> &nbsp;·&nbsp; ‖w‖ = <b>${Math.hypot(w1, w2).toFixed(2)}</b> &nbsp;·&nbsp; w = (${w1.toFixed(2)}, ${w2.toFixed(2)})`;
    };
    slider(controls(box), "log₁₀ C", { min: 0, max: fits.length - 1, step: 1, value: fits.findIndex((f) => f.log10C === 0),
      fmt: (k) => fits[k].log10C.toFixed(2), onInput: draw });
    caption(box, "Small C (left) = strong regularization: tiny weights, washed-out probabilities. Large C: sharper, and above about C = 1 hardly any change, because this data overlaps.");
  };

  window.WIDGETS = W;
})();
