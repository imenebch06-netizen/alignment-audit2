/**
 * parser.js
 * ---------------------------------------------------------------
 * Small vision models often wrap JSON in prose or code fences, or
 * produce slightly off shapes. This module recovers what it can and
 * normalizes the result so the renderer never has to guess.
 */

const SEVERITIES = ['critical', 'major', 'minor'];

/** Extracts the first top-level JSON object from messy model text. */
function extractJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found in the model response.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * @param {string} rawText full model response
 * @returns {{accuracy:number, summary:string, errors:Array, fixes:Array}}
 */
export function parseReport(rawText) {
  let data;
  try {
    data = extractJson(rawText);
  } catch (err) {
    throw new Error(
      'The model did not return valid JSON. Try a stronger vision model or retry. (' + err.message + ')'
    );
  }

  const accuracy = Math.max(0, Math.min(100, Math.round(Number(data.accuracy) || 0)));

  const errors = (Array.isArray(data.errors) ? data.errors : []).map((e) => ({
    severity: SEVERITIES.includes(String(e.severity).toLowerCase()) ? String(e.severity).toLowerCase() : 'minor',
    title: String(e.title ?? 'Untitled issue'),
    description: String(e.description ?? ''),
  }));

  // Most severe first, regardless of what order the model chose.
  errors.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));

  const fixes = (Array.isArray(data.fixes) ? data.fixes : []).map((f) => ({
    title: String(f.title ?? 'Suggested change'),
    language: String(f.language ?? 'css').toLowerCase() === 'html' ? 'html' : 'css',
    code: String(f.code ?? ''),
    explanation: String(f.explanation ?? ''),
  }));

  return { accuracy, summary: String(data.summary ?? ''), errors, fixes };
}
