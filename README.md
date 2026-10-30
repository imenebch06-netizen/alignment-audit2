# Alignment Audit

An open-source teaching tool for student developers. Drop in a design mockup (Image A) and a screenshot
of your coded page (Image B); a vision model scores the match, lists the layout errors and suggests the
HTML/CSS changes to fix them.

No build step, no backend, no hardcoded endpoint.

## Run it

Browsers block ES modules from `file://`, so serve the folder:

```bash
cd alignment-audit
python3 -m http.server 8080      # then open http://localhost:8080
```

## Connect a vision model

Open **Playroom Settings** and fill in the three (initially empty) fields:

| Field | Local Ollama | Cloud / proxy |
|---|---|---|
| API Base URL / Endpoint | `http://localhost:11434/v1` | your provider's OpenAI-compatible base URL |
| Model Identifier String | `llama3.2-vision`, `qwen2.5-vl` | the provider's model id |
| API Access Key / Bearer Token | leave empty | your key |

Any server exposing `POST {base}/chat/completions` with image input works.

### Ollama and CORS

The page is served from a different origin than Ollama, so allow it:

```bash
OLLAMA_ORIGINS="http://localhost:8080" ollama serve
```

## Project layout

```
index.html        UI structure (Tailwind classes)
css/theme.css     light-blue design system, soft shadows, gauge, badges
js/config.js      settings panel; persistence is opt-in
js/api.js         engine-agnostic streaming client (SSE + JSON fallback)
js/prompt.js      system prompt and message builder (edit to change tone/report shape)
js/parser.js      tolerant JSON recovery and normalization
js/upload.js      dropzones, instant thumbnails, image downscaling
js/render.js      gauge, errors, fixes (textContent only, no innerHTML)
js/app.js         orchestrator
```

## Notes

- Keys stay in the page unless the user ticks "Remember", which stores them in this browser's localStorage.
  Do not use shared computers for that option.
- Accuracy is a model estimate, not a pixel diff. Small local models vary a lot; try several.
- To add a new engine, nothing in the code changes: just paste a different URL and model id.
- Replace the dashed logo box in `index.html` (`#club-logo`) with an `<img>` when your logo is ready.
