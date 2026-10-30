/**
 * config.js
 * ---------------------------------------------------------------
 * Reads/writes the "Playroom" settings. Nothing is hardcoded:
 * every value comes from the three inputs in the settings drawer.
 *
 * Persistence is OPT-IN. By default the panel always starts empty
 * and secrets live only in the DOM. If the user ticks "Remember",
 * values go to localStorage on this device only.
 */

const STORAGE_KEY = 'alignment-audit:settings';

/** @typedef {{ baseUrl: string, model: string, apiKey: string }} EngineConfig */

const els = {
  baseUrl:  () => document.getElementById('cfg-baseUrl'),
  model:    () => document.getElementById('cfg-model'),
  apiKey:   () => document.getElementById('cfg-apiKey'),
  remember: () => document.getElementById('cfg-remember'),
};

/** Current values straight from the form (trimmed). */
export function readConfig() {
  return {
    baseUrl: els.baseUrl().value.trim(),
    model:   els.model().value.trim(),
    apiKey:  els.apiKey().value.trim(),
  };
}

/** Returns an error string if the config can't be used, else null. */
export function validateConfig(cfg) {
  if (!cfg.baseUrl) return 'Open Playroom Settings and enter an API Base URL / Endpoint.';
  try { new URL(cfg.baseUrl); } catch { return 'The API Base URL is not a valid URL.'; }
  if (!cfg.model) return 'Open Playroom Settings and enter a Model Identifier String.';
  return null;
}

/** Called on every input event; saves only if "Remember" is ticked. */
export function persistIfEnabled() {
  updateChip();
  try {
    if (els.remember().checked) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readConfig(), remember: true }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage may be blocked; settings simply won't persist */ }
}

/** Restores saved settings ONLY if the user previously opted in. */
export function restoreIfOptedIn() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved?.remember) return;
    els.baseUrl().value = saved.baseUrl || '';
    els.model().value = saved.model || '';
    els.apiKey().value = saved.apiKey || '';
    els.remember().checked = true;
  } catch { /* ignore corrupt storage */ }
}

/** Empties every field and removes anything stored. */
export function clearConfig() {
  els.baseUrl().value = '';
  els.model().value = '';
  els.apiKey().value = '';
  els.remember().checked = false;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** Wires drawer toggle + persistence listeners. */
export function initSettingsPanel() {
  const toggle = document.getElementById('settings-toggle');
  const panel = document.getElementById('settings-panel');

  toggle.addEventListener('click', () => setPanelOpen(!panel.classList.contains('hidden') ? false : true));
  document.getElementById('settings-form').addEventListener('input', persistIfEnabled);
  document.getElementById('settings-form').addEventListener('submit', (e) => e.preventDefault());
  document.getElementById('cfg-clear').addEventListener('click', () => { clearConfig(); updateChip(); });

  restoreIfOptedIn();
  updateChip();

  function setPanelOpen(open) {
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  return { open: () => setPanelOpen(true) };
}

/** Keeps the top-bar engine chip in sync with the configured endpoint. */
export function updateChip() {
  const chip = document.getElementById('model-chip');
  if (!chip) return;
  const { baseUrl, model } = readConfig();
  const ready = Boolean(baseUrl && model);
  chip.textContent = ready ? `${model}` : 'no model configured';
  chip.dataset.state = ready ? 'ready' : 'idle';
}
