import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs'; // ensure Node runtime (not edge) since we use the OpenAI SDK

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- helpers ---
function extractText(resp: any): string {
  // New SDKs expose a convenience field; fall back gracefully.
  if (typeof resp?.output_text === 'string') return resp.output_text;

  // Fallback: concatenate any text content we can find.
  const pieces: string[] = [];
  const output = resp?.output ?? resp?.data ?? [];
  const add = (x: any) => {
    if (!x) return;
    if (typeof x === 'string') pieces.push(x);
    else if (Array.isArray(x)) x.forEach(add);
    else if (x.text) pieces.push(x.text);
    else if (x.content) add(x.content);
  };
  add(output);
  return pieces.join('\n');
}

function parseCandidates(raw: string, max = 50): string[] {
  // Try strict JSON first
  try {
    const val = JSON.parse(raw);
    if (Array.isArray(val)) {
      return val
        .filter((v) => typeof v === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max);
    }
  } catch {
    // ignore; try bracket extraction
  }

  // Fallback: extract the first JSON-like array from text
  const m = raw.match(/\[[\s\S]*?\]/);
  if (m) {
    try {
      const val = JSON.parse(m[0]);
      if (Array.isArray(val)) {
        return val
          .filter((v) => typeof v === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, max);
      }
    } catch {
      // ignore
    }
  }

  // Final fallback: split lines
  return raw
    .split(/\r?\n/)
    .map((s) => s.replace(/^[-*\d.\)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, Math.min(10, max));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  // Quick guards to avoid wasteful calls
  if (!q) return NextResponse.json({ candidates: [] }, { status: 200 });
  if (q.length < 3) return NextResponse.json({ candidates: [] }, { status: 200 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Server missing OPENAI_API_KEY', candidates: [] },
      { status: 500 }
    );
  }

  // Prompt: ask for ONLY a JSON array of official Pokémon names.
  const developerInstruction =
    'You are the AI assistant inside a Pokémon Pokédex. ' +
    'Given a user query, reply with ONLY a valid JSON array of official Pokémon names ' +
    '(no extra text, no commentary). Names should be the canonical, official forms. ' +
    'Return at most 25 items.';

  try {
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: developerInstruction }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: `Query: ${q}` }],
        },
      ],
      text: { format: { type: 'text' }, verbosity: 'low' },
      reasoning: { effort: 'low' },
      tools: [],
      // Don’t store/chat-log; we just need a quick structured answer
      store: false,
    });

    const rawText = extractText(response);
    const names = parseCandidates(rawText, 25);

    // Normalize to lowercase here if your local dex indices are lowercase:
    const candidates = Array.from(
      new Set(
        names
          .map((n) => n.trim())
          .filter(Boolean)
      )
    );

    return NextResponse.json({ candidates }, { status: 200 });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'OpenAI request failed';
    return NextResponse.json({ candidates: [], error: msg }, { status: 500 });
  }
}
