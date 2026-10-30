/**
 * render.js
 * ---------------------------------------------------------------
 * Pure presentation: turns a parsed report into DOM nodes.
 * Everything from the model goes through textContent, never
 * innerHTML, so a malicious or buggy response can't inject markup.
 */

const CIRCUMFERENCE = 2 * Math.PI * 54; // matches r="54" in index.html

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

/** Left column: errors with color-coded severity badges. */
export function renderErrors(errors) {
  const list = document.getElementById('errors-list');
  list.replaceChildren();

  if (!errors.length) {
    list.append(el('li', 'text-sm text-slate-500', 'No differences detected. Nice work!'));
    return;
  }
  for (const e of errors) {
    const li = el('li', 'item-card');
    const head = el('div', 'flex items-center gap-2 mb-1');
    head.append(el('span', `badge badge-${e.severity}`, e.severity), el('h3', 'text-sm font-semibold text-slate-900', e.title));
    li.append(head, el('p', 'text-sm text-slate-600', e.description));
    list.append(li);
  }
}

/** Right column: concrete HTML/CSS fixes with copyable code. */
export function renderFixes(fixes) {
  const list = document.getElementById('fixes-list');
  list.replaceChildren();

  if (!fixes.length) {
    list.append(el('li', 'text-sm text-slate-500', 'No modifications suggested.'));
    return;
  }
  for (const f of fixes) {
    const li = el('li', 'item-card');
    const head = el('div', 'flex items-center gap-2 mb-1');
    head.append(el('span', 'badge badge-info', f.language), el('h3', 'text-sm font-semibold text-slate-900', f.title));
    li.append(head);
    if (f.explanation) li.append(el('p', 'text-sm text-slate-600', f.explanation));
    if (f.code) li.append(el('pre', 'code-block', f.code));
    list.append(li);
  }
}

/** Renders the whole dashboard and reveals it. */
export function renderReport(report) {
  document.getElementById('summary').textContent = report.summary;
  renderErrors(report.errors);
  renderFixes(report.fixes);
  const results = document.getElementById('results');
  results.classList.remove('hidden');
  renderGauge(report.accuracy);
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
