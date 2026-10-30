/**
 * stepper.js
 * ---------------------------------------------------------------
 * Tracks the 3-step workflow (details -> images -> audit) purely
 * from the DOM: participant input events plus a MutationObserver
 * on class/hidden changes, so no other module has to notify us.
 */

import { EMAIL_RE } from './leaderboard.js';

const CONDITIONS = {
  1: () => {
    const name = document.getElementById('participant-name')?.value.trim() ?? '';
    const email = document.getElementById('participant-email')?.value.trim() ?? '';
    return name.length > 0 && EMAIL_RE.test(email);
  },
  2: () => {
    const zones = document.querySelectorAll('.dropzone');
    const filled = document.querySelectorAll('.dropzone.has-file');
    return zones.length > 0 && filled.length === zones.length;
  },
  3: () => {
    const results = document.getElementById('results');
    return Boolean(results && !results.classList.contains('hidden'));
  },
};

export function initStepper() {
  const steps = [1, 2, 3].map((n) => document.getElementById(`step-${n}`)).filter(Boolean);
  if (!steps.length) return;

  function update() {
    let reached = 0;                 // highest satisfied step (0 = none)
    for (const n of [1, 2, 3]) if (CONDITIONS[n]()) reached = n;

    steps.forEach((li) => {
      const index = Number(li.id.at(-1));
      li.dataset.state =
        index <= reached ? 'done' :
        index <= reached + 1 ? 'active' : 'upcoming';
    });
  }

  // Retype in any text field (participant name).
  document.addEventListener('input', update);

  // Dropzones toggle "has-file"; results toggles "hidden"/children.
  const observer = new MutationObserver(update);
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  const results = document.getElementById('results');
  if (results) {
    new MutationObserver(update).observe(results, { childList: true });
  }

  update();
}
