// Renders one notebook page (section) at a time, with Next / Previous navigation.
(function () {
  const sections = JSON.parse(document.getElementById("sections").textContent);
  const NB = window.NB;
  const page = document.getElementById("page");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const counter = document.getElementById("page-count");
  const bar = document.getElementById("progress-bar");
  const tocLinks = Array.from(document.querySelectorAll(".toc a"));

  // ---- markdown + math -------------------------------------------------------------------
  // Math is cut out before markdown parsing (so markdown doesn't mangle _ and \), then rendered
  // with KaTeX and put back.
  function renderMarkdown(src) {
    const math = [];
    const keep = (tex, display) => { math.push([tex, display]); return "\u0001" + (math.length - 1) + "\u0001"; };
    src = src.replace(/\$\$([\s\S]+?)\$\$/g, (m, t) => keep(t, true));
    // inline math may wrap onto the next line, but never across a blank line (a paragraph break)
    src = src.replace(/(^|[^\\$])\$(?!\s)([^$]+?)\$/g, (m, pre, t) => (/\n\s*\n/.test(t) ? m : pre + keep(t, false)));
    let out = marked.parse(src, { mangle: false, headerIds: false });
    out = out.replace(/\u0001(\d+)\u0001/g, (m, i) => {
      const [tex, display] = math[+i];
      try {
        return katex.renderToString(tex, { displayMode: display, throwOnError: false });
      } catch (e) {
        return tex;
      }
    });
    return out;
  }

  function el(tag, cls, htmlText) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (htmlText !== undefined) e.innerHTML = htmlText;
    return e;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderSection(i) {
    const s = sections[i];
    page.innerHTML = "";
    for (const b of s.blocks) {
      if (b.t === "md") {
        page.appendChild(el("div", "md", renderMarkdown(b.text)));
      } else if (b.t === "code") {
        const wrap = el("div", "cell");
        const toggle = el("button", "copy", "copy");
        toggle.title = "Copy code";
        toggle.onclick = () => {
          const text = wrap.querySelector("pre").innerText;
          navigator.clipboard && navigator.clipboard.writeText(text);
          toggle.textContent = "copied"; setTimeout(() => (toggle.textContent = "copy"), 1200);
        };
        wrap.appendChild(toggle);
        wrap.appendChild(el("pre", "code", b.html));
        page.appendChild(wrap);
      } else if (b.t === "out") {
        page.appendChild(el("pre", "output", escapeHtml(b.text)));
      } else if (b.t === "html") {
        page.appendChild(el("div", "output html-out", b.html));
      } else if (b.t === "img") {
        const fig = el("div", "figure");
        const img = document.createElement("img");
        img.src = b.src; img.alt = "figure"; img.loading = "lazy";
        fig.appendChild(img);
        page.appendChild(fig);
      } else if (b.t === "widget") {
        const box = el("div", "widget");
        page.appendChild(box);
        if (window.WIDGETS && window.WIDGETS[b.id]) {
          try { window.WIDGETS[b.id](box); } catch (e) { box.textContent = "(interactive figure failed to load)"; console.error(e); }
        }
      }
    }
    // navigation state
    const n = sections.length;
    counter.textContent = `${i + 1} / ${n}`;
    bar.style.width = `${((i + 1) / n) * 100}%`;
    tocLinks.forEach((a, k) => a.classList.toggle("active", k === i));
    prevBtn.disabled = i === 0 && !NB.prev;
    nextBtn.disabled = i === n - 1 && !NB.next;
    prevBtn.textContent = i === 0 && NB.prev ? "← Previous notebook" : "← Previous";
    nextBtn.textContent = i === n - 1 && NB.next ? "Next notebook →" : "Next →";
    document.title = `${s.nav} · ${NB.title}`;
    window.scrollTo(0, 0);
    document.body.classList.remove("nav-open");
  }

  function current() {
    const k = parseInt((location.hash || "#1").slice(1), 10);
    return isNaN(k) ? 0 : Math.min(Math.max(k - 1, 0), sections.length - 1);
  }
  function go(i) {
    if (i < 0) { if (NB.prev) location.href = NB.prev.href + "#last"; return; }
    if (i >= sections.length) { if (NB.next) location.href = NB.next.href; return; }
    location.hash = "#" + (i + 1);
  }
  prevBtn.onclick = () => go(current() - 1);
  nextBtn.onclick = () => go(current() + 1);
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") go(current() + 1);
    if (e.key === "ArrowLeft") go(current() - 1);
  });
  window.addEventListener("hashchange", () => renderSection(current()));
  if (location.hash === "#last") history.replaceState(null, "", "#" + sections.length);
  renderSection(current());
})();
