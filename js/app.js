/**
 * app.js
 * ---------------------------------------------------------------
 * Orchestrator. Wires the modules together and owns the audit flow:
 *   settings -> images -> prompt -> streamed API call -> parse -> render
 */

import { initSettingsPanel, readConfig, validateConfig } from './config.js';
import { initDropzones, hasBothImages, getEncodedImages } from './upload.js';
import { buildMessages } from './prompt.js';
import { streamChat } from './api.js';
import { parseReport } from './parser.js';
import { renderReport } from './render.js';
import { addEntry, initLeaderboard, renderLeaderboard, EMAIL_RE } from './leaderboard.js';
import { initStepper } from './stepper.js';

const $ = (id) => document.getElementById(id);
const runBtn = $('run-btn');
const cancelBtn = $('cancel-btn');
const statusEl = $('status');
const streamSection = $('stream-section');
const streamOut = $('stream-out');

let controller = null; // AbortController for the in-flight request

const settings = initSettingsPanel();
initDropzones();
initLeaderboard();
initStepper();

runBtn.addEventListener('click', runAudit);
cancelBtn.addEventListener('click', () => controller?.abort());

function setBusy(busy) {
  runBtn.disabled = busy;
  runBtn.classList.toggle('is-loading', busy);
  cancelBtn.classList.toggle('hidden', !busy);
  streamSection.classList.toggle('hidden', !busy);
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = `status-line ${isError ? 'is-error' : ''}`;
}

async function runAudit() {
  // 1. Validate inputs in workflow order (01 identity, 02 assets, then config).
  const name = $('participant-name').value.trim();
  if (!name) return setStatus('Please enter your display name first.', true);
  const email = $('participant-email').value.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return setStatus('Please enter a valid email address (e.g. you@university.edu).', true);
  if (!hasBothImages()) {
    return setStatus('Please add both Image A (mockup) and Image B (your output).', true);
  }
  const config = readConfig();
  const configError = validateConfig(config);
  if (configError) {
    settings.open();
    return setStatus(configError, true);
  }

  controller = new AbortController();
  setBusy(true);
  streamOut.textContent = '';
  setStatus('Preparing images...');

  try {
    // 2. Encode images and build the request.
    const { a, b } = await getEncodedImages();
    const messages = buildMessages(a, b);

    // 3. Call whichever engine the user configured, streaming tokens into the live box.
    setStatus('Waiting for the model...');
    const fullText = await streamChat({
      config,
      messages,
      signal: controller.signal,
      onToken: (_chunk, full) => {
        setStatus('Model is responding...');
        streamOut.textContent = full;
        streamOut.scrollTop = streamOut.scrollHeight;
      },
    });

    // 4. Parse and render.
    setStatus('Building report...');
    const report = parseReport(fullText);
renderReport(report, { a, b });
addEntry(name, email, report.accuracy);
renderLeaderboard();
$('participant-name').value = '';    // forces the next participant to enter their own identity
$('participant-email').value = '';
    setStatus('Audit complete.');
  } catch (err) {
    if (err.name === 'AbortError') setStatus('Audit cancelled.');
    else setStatus(err.message || 'Something went wrong.', true);
  } finally {
    setBusy(false);
    controller = null;
  }
}
