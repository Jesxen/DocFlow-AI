// extractor.js (ESM)
// Calls the Anthropic Messages API with tool-use to force strict structured
// JSON output (no markdown fences). Parses defensively.
//
// ESM mirror of backend/lib/extractor.js (see frontend/lib/schemas.js header).

import Anthropic from '@anthropic-ai/sdk';
import { getSchema } from './schemas.js';

// EXACT model id required by the project spec. Do not change.
const MODEL_ID = 'claude-haiku-4-5';

// Security: cap how much text we ever send to the model.
export const MAX_INPUT_CHARS = 50000;

// Sanitize user-provided text: strip control chars (except \n, \r, \t) and cap length.
export function sanitizeText(raw) {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  cleaned = cleaned.trim();
  if (cleaned.length > MAX_INPUT_CHARS) {
    cleaned = cleaned.slice(0, MAX_INPUT_CHARS);
  }
  return cleaned;
}

function buildSystemPrompt(docType) {
  return [
    'You are a precise document data-extraction engine.',
    'Extract the requested structured fields from the document the user provides.',
    `The document type is: ${docType}.`,
    'Rules:',
    '- Only extract information that is actually present in the document.',
    '- If a field is not present, use an empty string for string fields or an empty array for array fields.',
    '- Do not invent, infer beyond reason, or hallucinate values.',
    '- You MUST respond by calling the provided tool with the extracted data. Do not reply with prose.',
  ].join('\n');
}

// Returns { ok: true, data } or { ok: false, status, error }
export async function extract({ text, docType, apiKey }) {
  const schema = getSchema(docType);
  if (!schema) {
    return { ok: false, status: 400, error: `Unsupported document type: "${docType}".` };
  }

  const cleanText = sanitizeText(text);
  if (!cleanText) {
    return { ok: false, status: 400, error: 'No readable text was provided to extract.' };
  }

  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, status: 500, error: 'Server is not configured: missing ANTHROPIC_API_KEY.' };
  }

  const client = new Anthropic({ apiKey: key });

  const tool = {
    name: schema.toolName,
    description: schema.description,
    input_schema: schema.input_schema,
  };

  let response;
  try {
    response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 4096,
      system: buildSystemPrompt(docType),
      tools: [tool],
      // Force the model to call our tool -> guarantees structured JSON, no fences.
      tool_choice: { type: 'tool', name: schema.toolName },
      messages: [
        {
          role: 'user',
          content: `Extract the structured data from the following document:\n\n<document>\n${cleanText}\n</document>`,
        },
      ],
    });
  } catch (err) {
    const status = err && err.status ? err.status : 502;
    let message = 'The extraction service is temporarily unavailable. Please try again.';
    if (status === 401) message = 'The extraction service is misconfigured (authentication failed).';
    else if (status === 429) message = 'The service is busy right now. Please wait a moment and try again.';
    else if (status === 400) message = 'The document could not be processed. Try shorter or cleaner text.';
    // Never leak raw error internals / keys to the client.
    return { ok: false, status: status >= 400 && status < 600 ? status : 502, error: message };
  }

  // Defensive parsing: find the tool_use block and read its already-parsed input.
  try {
    const toolBlock = (response.content || []).find((b) => b.type === 'tool_use');
    if (!toolBlock || !toolBlock.input) {
      return { ok: false, status: 502, error: 'The service returned an unexpected response. Please try again.' };
    }
    return { ok: true, data: toolBlock.input };
  } catch (e) {
    return { ok: false, status: 502, error: 'Failed to parse the extraction result. Please try again.' };
  }
}

export { MODEL_ID };
