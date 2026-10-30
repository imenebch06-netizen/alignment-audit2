/**
 * leaderboard.js
 * Stores every audit result (name + accuracy) in localStorage and
 * renders the list sorted by accuracy, highest first.
 */
const KEY = 'alignment-audit:leaderboard';

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ } };

/** Highest accuracy first; on a tie, whoever got there first ranks higher. */
const sorted = () => load().sort((a, b) => b.accuracy - a.accuracy || a.date.localeCompare(b.date));

export function addEntry(name, accuracy) {
  const list = load();
  list.push({ name, accuracy, date: new Date().toISOString() });
  save(list);
}

export function renderLeaderboard() {
  const ol = document.getElementById('lb-list');
  ol.replaceChildren();
  const rows = sorted();

  if (!rows.length) {
    const li = document.createElement('li');
    li.className = 'text-sm text-slate-500';
    li.textContent = 'No results yet.';
    ol.append(li);
    return;
  }

  rows.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = 'item-card flex items-center gap-3';

    const rank = document.createElement('span');
    rank.className = 'badge badge-info';
    rank.textContent = `#${i + 1}`;

    const name = document.createElement('span');
    name.className = 'flex-1 font-medium text-slate-900 truncate';
    name.textContent = r.name;                       // textContent: no HTML injection

    const score = document.createElement('span');
    score.className = 'font-bold text-brand-700';
    score.textContent = `${r.accuracy}%`;

    li.append(rank, name, score);
    ol.append(li);
  });
}

function exportCsv() {
  const lines = ['rank,name,accuracy,date',
    ...sorted().map((r, i) => `${i + 1},"${r.name.replace(/"/g, '""')}",${r.accuracy},${r.date}`)];
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