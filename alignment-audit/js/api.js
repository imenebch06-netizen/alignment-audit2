/**
 * api.js
 * ---------------------------------------------------------------
 * Engine-agnostic client for any OpenAI-compatible vision endpoint
 * (Ollama /v1, vLLM, LM Studio, OpenRouter, custom proxies...).
 *
 * It knows NOTHING about specific URLs or models: everything is
 * passed in via `config`. Responses are streamed (SSE) when the
 * server supports it, with automatic fallback to a plain JSON body.
 */

/** Strip trailing slashes so `${base}/chat/completions` is always well-formed. */
function buildEndpoint(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

/**
 * Sends a chat completion request and streams tokens back.
 *
 * @param {object}   opts
 * @param {{baseUrl:string, model:string, apiKey?:string}} opts.config
 * @param {Array}    opts.messages  OpenAI-format messages (may contain image_url parts)
 * @param {(chunk:string, fullText:string)=>void} [opts.onToken]  called for every text delta
 * @param {AbortSignal} [opts.signal]  allows the UI to cancel
 * @returns {Promise<string>} the complete response text
 */
export async function streamChat({ config, messages, onToken, signal }) {
  const headers = { 'Content-Type': 'application/json' };
  // Local servers (Ollama) need no key, so the header is only sent when provided.
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  let response;
  try {
    response = await fetch(buildEndpoint(config.baseUrl), {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
        temperature: 0.2, // low temperature = more consistent, parseable output
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // fetch() only throws on network/CORS failures, so give a useful hint.
    throw new Error(
      'Could not reach the endpoint. Check the URL, that the server is running, and CORS ' +
      '(for Ollama set OLLAMA_ORIGINS to allow this page). Details: ' + err.message
    );
  }

  if (!response.ok) {
    const detail = await safeText(response);
    throw new Error(`Endpoint returned ${response.status} ${response.statusText}. ${detail}`.trim());
  }

  const contentType = response.headers.get('content-type') || '';

  // Fallback: server ignored stream:true and sent one JSON document.
  if (contentType.includes('application/json')) {
    const json = await response.json();
    const text = extractText(json);
    onToken?.(text, text);
    return text;
  }

  return readEventStream(response, onToken);
}

/** Parses a Server-Sent-Events body, tolerating partial lines across chunks. */
async function readEventStream(response, onToken) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // last element may be an incomplete line; keep it

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const delta = extractText(JSON.parse(payload), true);
        if (delta) {
          full += delta;
          onToken?.(delta, full);
        }
      } catch {
        // Ignore keep-alives or malformed fragments instead of killing the stream.
      }
    }
  }
  return full;
}

/** Pulls text out of either a streaming delta or a full completion object. */
function extractText(json, streaming = false) {
  const choice = json?.choices?.[0];
  if (!choice) return '';
  if (streaming) return choice.delta?.content ?? '';
  return choice.message?.content ?? choice.delta?.content ?? '';
}

async function safeText(response) {
  try { return (await response.text()).slice(0, 300); } catch { return ''; }
}
