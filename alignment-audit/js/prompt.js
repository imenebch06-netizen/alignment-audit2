/**
 * prompt.js
 * ---------------------------------------------------------------
 * The only place that knows what we ask the vision model for.
 * Edit this file to change the teaching tone or the report shape.
 */

const SYSTEM_PROMPT = `You are a senior frontend mentor reviewing a student's HTML/CSS work.
You receive two images:
  IMAGE 1 = the reference design mockup (the target).
  IMAGE 2 = a screenshot of the student's coded page.

Compare them as precisely as you can: layout, spacing, alignment, typography (size, weight, family),
colors, borders, radius, shadows, image sizing and missing or extra elements.

Reply with ONE JSON object and nothing else (no markdown fences, no commentary), shaped exactly like:
{
  "accuracy": <integer 0-100, overall visual similarity>,
  "summary": "<2-3 sentences, encouraging and specific>",
  "errors": [
    { "severity": "critical" | "major" | "minor",
      "title": "<short name of the problem>",
      "description": "<what differs and where>" }
  ],
  "fixes": [
    { "title": "<short name>",
      "language": "css" | "html",
      "code": "<a concise snippet or property: value change>",
      "explanation": "<why this works, in a way a learner can understand>" }
  ]
}

Rules: sort errors from most to least severe. Never invent exact pixel values you cannot see; say
"approximately" when estimating. If the images are identical, return accuracy 100 and empty arrays.`;

/**
 * Builds OpenAI-format messages with both images attached.
 * @param {string} dataUrlA  reference mockup (data: URL)
 * @param {string} dataUrlB  student's output (data: URL)
 */
export function buildMessages(dataUrlA, dataUrlB) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'IMAGE 1 is the reference mockup. IMAGE 2 is the student\'s coded result. Audit the alignment.' },
        { type: 'image_url', image_url: { url: dataUrlA } },
        { type: 'image_url', image_url: { url: dataUrlB } },
      ],
    },
  ];
}
