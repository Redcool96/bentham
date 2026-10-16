// Ask before you pay: Claude judges a pasted message or screenshot.
import { checkMessage, demoCheck, hasKey, type ImageMedia } from '@/lib/claude';

const MEDIA: ImageMedia[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: string; image?: { media_type?: string; data?: string } } | null;
  const text = (body?.text ?? '').slice(0, 8000);
  const image = body?.image?.data && MEDIA.includes(body.image.media_type as ImageMedia)
    ? { media_type: body.image.media_type as ImageMedia, data: body.image.data }
    : undefined;
  if (!text.trim() && !image) return Response.json({ error: 'Paste a message or add a screenshot.' }, { status: 400 });

  if (!hasKey()) return Response.json({ result: demoCheck(text), demo: true });
  try {
    return Response.json({ result: await checkMessage(text, image), demo: false });
  } catch (e) {
    console.error('check failed', e);
    return Response.json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, { status: 502 });
  }
}
