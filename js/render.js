/**
 * render.js
 * ---------------------------------------------------------------
 * Pure presentation: turns a parsed report into DOM nodes.
 * Everything from the model goes through textContent, never
 * innerHTML, so a malicious or buggy response can't inject markup.
 */

const CIRCUMFERENCE = 2 * Math.PI * 54; // matches r="54" in index.html

const SEVERITY_ICONS = { critical: '✕', major: '!', minor: '•', info: 'i' };

/** Tiny element factory to keep the code readable. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Animates the radial gauge and the numeric label together. */
export function renderGauge(percent) {
  const arc = document.getElementById('gauge-arc');
  const label = document.getElementById('gauge-value');

  // Reset first so the transition replays on repeated audits.
  arc.style.transition = 'none';
  arc.style.strokeDashoffset = CIRCUMFERENCE;
  void arc.getBoundingClientRect(); // force reflow
  arc.style.transition = '';
  arc.style.strokeDashoffset = CIRCUMFERENCE * (1 - percent / 100);

  // Count-up for the number.
  const duration = 1100;
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    label.textContent = `${Math.round(percent * p)}%`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** "Copy" behaviour for suggested-code pre blocks. */
function attachCopy(timeoutMs = 1600) {
  const btn = el('button', 'copy-btn', 'Copy');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Copy code to clipboard');
  btn.addEventListener('click', async () => {
    const code = btn.closest('.item-card')?.querySelector('.code-block')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = 'Copied ✓';
      btn.classList.add('is-copied');
    } catch {
      btn.textContent = 'Copy blocked';
    }
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-copied'); }, timeoutMs);
  });
  return btn;
}

/** Left column: errors with color-coded severity badges + accent cards. */
export function renderErrors(errors) {
  const list = document.getElementById('errors-list');
  list.replaceChildren();

  if (!errors.length) {
    list.append(el('li', 'text-sm text-slate-400', 'No differences detected. Nice work!'));
    return;
  }  for (const e of errors) {
    const li = el('li', `item-card accent-${e.severity}`);
    const head = el('div', 'flex items-center gap-2.5 mb-1.5');
    head.append(
      el('span', `sev-ico sev-${e.severity}`, SEVERITY_ICONS[e.severity] ?? 'i'),
      el('span', `badge badge-${e.severity}`, e.severity),
      el('h3', 'text-sm font-semibold text-slate-100 min-w-0', e.title),
    );
    li.append(head, el('p', 'text-sm text-slate-400 leading-relaxed', e.description));
    list.append(li);
  }
}

/** Right column: concrete HTML/CSS fixes with copyable code. */
export function renderFixes(fixes) {
  const list = document.getElementById('fixes-list');
  list.replaceChildren();

  if (!fixes.length) {
    list.append(el('li', 'text-sm text-slate-400', 'No modifications suggested.'));
    return;
  }  for (const f of fixes) {
    const li = el('li', 'item-card accent-info');
    const head = el('div', 'flex items-center gap-2.5 mb-1 flex-wrap');
    head.append(
      el('span', 'sev-ico sev-info', '</>'),
      el('span', 'badge badge-info', f.language),
      el('h3', 'text-sm font-semibold text-slate-100 min-w-0', f.title),
    );
    li.append(head);
    if (f.explanation) li.append(el('p', 'text-sm text-slate-400 leading-relaxed', f.explanation));
    if (f.code) {
      const pre = el('pre', 'code-block', f.code);
      li.append(pre, attachCopy());
    }
    list.append(li);
  }
}

/** Mockup vs build thumbnails, stacked under 480px, side-by-side above. */
export function renderCompare({ a, b }) {
  const strip = document.getElementById('compare-strip');
  const grid = document.getElementById('compare-grid');
  if (!strip || !grid || !a || !b) return;

  grid.replaceChildren();
  const slots = [
    { slot: 'A', label: 'Reference mockup', src: a },
    { slot: 'B', label: 'Your build', src: b, altChip: 'slot-chip-b' },
  ];
  for (const { slot, label, src, altChip } of slots) {
    const fig = el('figure', 'compare-fig');
    const frame = el('div', 'compare-frame');
    const img = el('img');
    img.src = src;
    img.alt = `${label} (Image ${slot})`;
    frame.append(img);
    const caption = el('figcaption', 'compare-label');
    caption.append(el('span', `slot-chip ${altChip ?? ''}`, slot), el('span', null, label));
    fig.append(frame, caption);
    grid.append(fig);
  }
  strip.classList.remove('hidden');
}

/** Renders the whole dashboard and reveals it. */
export function renderReport(report, images = {}) {
  document.getElementById('summary').textContent = report.summary;
  renderErrors(report.errors);
  renderFixes(report.fixes);
  renderCompare(images);
  const results = document.getElementById('results');
  results.classList.remove('hidden');
  renderGauge(report.accuracy);
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
