/**
 * leaderboard.js
 * Stores every audit result (email + accuracy) in localStorage and
 * renders the list sorted by accuracy, highest first.
 * The email is the unique participant ID: a re-audit replaces that
 * participant's previous row instead of creating a duplicate.
 */
const KEY = 'alignment-audit:leaderboard';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const load = () => {
  try {
    // Backward compatibility: older stores used `name` as the key.
    return (JSON.parse(localStorage.getItem(KEY)) || [])
      .map((r) => ({ ...r, email: r.email || r.name || '', name: r.name || (r.email || '').split('@')[0] }))
      .filter((r) => r.email);
  } catch { return []; }
};
const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ } };

/** Highest accuracy first; on a tie, whoever got there first ranks higher. */
const sorted = () => load().sort((a, b) => b.accuracy - a.accuracy || a.date.localeCompare(b.date));

/**
 * Upserts by email: same participant → update their name, accuracy and
 * date, otherwise append a new row.
 */
export function addEntry(name, email, accuracy) {
  const list = load().filter((r) => r.email !== email);
  list.push({ name, email, accuracy, date: new Date().toISOString() });
  save(list);
}

/** Tiny element factory (textContent only — no HTML injection). */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function renderLeaderboard() {
  const ol = document.getElementById('lb-list');
  ol.replaceChildren();
  const rows = sorted();

  const count = document.getElementById('lb-count');
  if (count) count.textContent = String(rows.length);

  if (!rows.length) {
    const li = document.createElement('li');
    li.className = 'text-sm text-slate-400 font-mono';
    li.textContent = 'No results yet — run your first audit!';
    ol.append(li);
    return;
  }

  rows.forEach((r, i) => {
    const li = el('li', i < 3 ? `lb-row medal-${i + 1}` : 'lb-row');

    const rank = el('span', 'lb-rank');
    rank.textContent = i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`;
    rank.setAttribute('aria-label', `Rank ${i + 1}`);

    const nameCol = el('div', 'flex-1 min-w-0');
    const name = el('span', 'block font-medium text-slate-200 truncate');
    name.textContent = r.name;                       // textContent: no HTML injection
    const email = el('span', 'block font-mono text-[0.68rem] text-slate-500 truncate');
    email.textContent = r.email;                     // textContent: no HTML injection
    nameCol.append(name, email);

    const scoreCol = el('div', 'lb-col');
    const score = el('span', 'lb-score');
    score.textContent = `${r.accuracy}%`;
    const bar = el('div', 'lb-bar');
    const fill = el('span');
    fill.style.width = `${Math.min(100, Math.max(0, r.accuracy))}%`;
    bar.append(fill);
    scoreCol.append(score, bar);

    li.append(rank, nameCol, scoreCol);
    ol.append(li);
  });
}

function exportCsv() {
  const lines = ['rank,name,email,accuracy,date',
    ...sorted().map((r, i) => `${i + 1},"${r.name.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}",${r.accuracy},${r.date}`)];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'leaderboard.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

export function initLeaderboard() {
  document.getElementById('lb-export').addEventListener('click', exportCsv);
  document.getElementById('lb-clear').addEventListener('click', () => {
    if (confirm('Delete all leaderboard entries?')) { save([]); renderLeaderboard(); }
  });
  renderLeaderboard();
}