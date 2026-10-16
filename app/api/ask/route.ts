// Can I afford it? Claude reads the question; the runway engine owns the numbers.
import { askAfford, demoAsk, hasKey } from '@/lib/claude';
import { computeRunway, describeRunway, withPurchase, type RunwayInput } from '@/lib/runway';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { question?: string; runway?: RunwayInput } | null;
  const question = (body?.question ?? '').trim().slice(0, 1000);
  const input = body?.runway;
  if (!question || !input) return Response.json({ error: 'Ask a question first.' }, { status: 400 });

  const before = computeRunway(input);
  try {
    const demo = !hasKey();
    const result = demo ? demoAsk(question) : await askAfford(question, describeRunway(input, before));
    const after = result.amount_gbp ? withPurchase(before, result.amount_gbp, result.recurring_weekly) : null;
    return Response.json({ result, before, after, demo });
  } catch (e) {
    console.error('ask failed', e);
    return Response.json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, { status: 502 });
  }
}
