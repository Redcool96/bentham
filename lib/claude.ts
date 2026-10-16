// Everything that talks to Claude. Server-only: imported by the API routes.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

export const MODEL = 'claude-opus-5-5';

/** No key on this machine means the app runs on canned demo answers instead. */
export const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

const VOICE = `You are Bentham (named after Jeremy Bentham, UCL's founding spirit), a calm, careful money friend for UK university students (mostly UCL, London).
Tone: warm, plain English, short sentences, no jargon, no emojis, never preachy or shaming. Talk like a sensible older friend, not a bank.
Principle: you are the app that tells people to slow down. When in doubt, be careful.
UK specifics you can rely on: Student Finance England pays the maintenance loan in three instalments (start of each term).
Scam texts can be forwarded free to 7726. Calling 159 connects you safely to your own bank's fraud team.
Money mule recruitment ("get paid to receive money into your account") is a crime and targets students; it can get your bank account closed and a fraud marker.`;

// ── Ask before you pay: scam check ──────────────────────────────────────────

export const CheckSchema = z.object({
  verdict: z.enum(['looks_ok', 'be_careful', 'stop']),
  category: z.enum([
    'money_mule', 'crypto_or_investment', 'fake_landlord_or_rental', 'fake_job', 'phishing',
    'ticket_or_marketplace', 'impersonation', 'loan_or_debt', 'none', 'other',
  ]),
  headline: z.string().describe('One sentence, max 14 words, the verdict in plain English.'),
  red_flags: z.array(z.object({
    quote: z.string().describe('A short exact phrase from the message (or what is visible in the image) that is the warning sign. Empty if none.'),
    why: z.string().describe('One sentence on why this is a warning sign.'),
  })).describe('0 to 5 red flags, most serious first.'),
  next_steps: z.array(z.string()).describe('2 to 4 concrete next steps, each one short imperative sentence.'),
  safe_reply: z.string().describe('A short message the student could send back, or empty string if they should not reply at all.'),
});
export type CheckResult = z.infer<typeof CheckSchema>;

const CHECK_SYSTEM = `${VOICE}

Task: a student pastes a message, post, job offer, listing or screenshot and asks "is this OK?". Judge it.
- "stop": clear scam or illegal (money mule, guaranteed returns, upfront deposit for a flat never viewed, asks for bank login/codes).
- "be_careful": some warning signs or not enough information; tell them exactly what to verify.
- "looks_ok": ordinary and low risk. Still mention one sensible check if relevant.
Base red flags on what is actually in the content. Do not invent details. If the content is not about money, people or offers at all, return looks_ok with category none.`;

export type ImageMedia = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

export async function checkMessage(text: string, image?: { media_type: ImageMedia; data: string }): Promise<CheckResult> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } });
  content.push({ type: 'text', text: text.trim() ? `Is this OK?\n\n<content>\n${text}\n</content>` : 'Is this OK? (See the screenshot.)' });

  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(CheckSchema) },
    system: CHECK_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error('Claude could not judge this one.');
  return res.parsed_output;
}

// ── Can I afford it? ───────────────────────────────────────────────────────

export const AskSchema = z.object({
  amount_gbp: z.number().nullable().describe('The cost in pounds the question is about, or null if no cost is mentioned or implied.'),
  recurring_weekly: z.boolean().describe('True if the cost repeats every week (e.g. a weekly habit or subscription per week).'),
  verdict: z.enum(['yes', 'yes_if', 'not_now', 'no']),
  headline: z.string().describe('One sentence, max 14 words.'),
  reasoning: z.array(z.string()).describe("2 to 4 short points using the student's real numbers."),
  try_instead: z.string().describe('One cheaper or safer alternative, or empty string.'),
});
export type AskResult = z.infer<typeof AskSchema>;

const ASK_SYSTEM = `${VOICE}

Task: the student asks whether they can afford something. You are given their runway: what they can safely spend each week until the next instalment, already worked out by the app.
Rules:
- Use their real numbers. The app separately shows the exact new weekly figure after this purchase, so do not compute or state the new weekly figure yourself.
- A one-off cost under about half of one week's safe-to-spend is usually fine ("yes").
- If it eats several weeks of safe-to-spend, say "yes_if" with a concrete condition (e.g. cutting something specific), or "not_now".
- "no" if it would make them run short before the next instalment, or it is not money they can lose.
- Investing (crypto, stocks, "trading"): only money they can afford to lose completely, only after a buffer exists, never borrowed money. Speculative crypto with rent money is "no". Be kind about it.
- Never recommend specific coins, stocks, lenders or credit. Never suggest overdrafts, BNPL or credit cards as the way to afford something.`;

export async function askAfford(question: string, runwayFacts: string): Promise<AskResult> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(AskSchema) },
    system: ASK_SYSTEM,
    messages: [{ role: 'user', content: `My runway:\n${runwayFacts}\n\nMy question: ${question}` }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error('Claude could not answer this one.');
  return res.parsed_output;
}

// ── Demo answers, used only when there is no API key ─────────────────────────

/** Quote a phrase only if it really is in the message, so demo answers never invent text. */
const quoted = (text: string, phrase: string) => (text.toLowerCase().includes(phrase.toLowerCase()) ? phrase : '');

export function demoCheck(text: string): CheckResult {
  if (/(deposit|keys|viewing|pcm|landlord|studio|flat)/i.test(text)) {
    return {
      verdict: 'stop', category: 'fake_landlord_or_rental',
      headline: 'Classic fake landlord. Never pay for a flat you have not seen.',
      red_flags: [
        { quote: quoted(text, 'can’t show it in person'), why: 'Scammers are always "abroad" so you can never view the place.' },
        { quote: quoted(text, 'by bank transfer today'), why: 'A bank transfer to a stranger is almost impossible to get back.' },
        { quote: quoted(text, 'need to decide fast'), why: 'Rushing you is how they stop you checking.' },
      ],
      next_steps: ['Do not send any money.', 'Only rent after an in-person viewing, and check the landlord through UCL Accommodation or a known agent.', 'Report the listing to the site it was posted on.'],
      safe_reply: 'I only pay after an in-person viewing and a signed contract.',
    };
  }
  if (/(guaranteed|returns|usdt|crypto|trading bot|vip)/i.test(text)) {
    return {
      verdict: 'stop', category: 'crypto_or_investment',
      headline: 'Guaranteed returns do not exist. This is an investment scam.',
      red_flags: [
        { quote: quoted(text, 'Guaranteed 30% weekly returns'), why: 'No real investment can promise returns, let alone 30% a week.' },
        { quote: quoted(text, 'send £250 in USDT'), why: 'Crypto payments to a stranger cannot be reversed.' },
        { quote: quoted(text, 'Only 10 spots left'), why: 'Fake scarcity is there to rush you.' },
      ],
      next_steps: ['Do not send anything.', 'Block and report the account.', 'Forward any scam texts to 7726.'],
      safe_reply: '',
    };
  }
  if (/(receive payments|transfer them|sort code|account number|keep 10%)/i.test(text)) {
    return {
      verdict: 'stop', category: 'money_mule',
      headline: 'This is money mule recruitment. Do not reply or share details.',
      red_flags: [
        { quote: quoted(text, 'receive payments from our clients into your account'), why: 'Real jobs never pay you to move money through your own bank account.' },
        { quote: quoted(text, 'keep 10% for yourself'), why: 'A cut for passing payments on is how criminals launder stolen money. It is a crime.' },
        { quote: quoted(text, 'sort code + account number'), why: 'Never share bank details with someone you met in your DMs.' },
      ],
      next_steps: ['Do not reply or send any bank details.', 'Screenshot it, then block and report the account.', 'If you already shared details, call 159 to reach your bank now.'],
      safe_reply: '',
    };
  }
  return {
    verdict: 'looks_ok', category: 'none',
    headline: 'This looks like a normal message. Nothing suspicious here.',
    red_flags: [],
    next_steps: ['Buy tickets only through the official website.', 'If a link looks odd, go to the site yourself instead of clicking it.'],
    safe_reply: '',
  };
}

export function demoAsk(question: string): AskResult {
  const amount = Number(question.match(/£\s?(\d+(?:\.\d+)?)/)?.[1] ?? 0) || null;
  return /(bitcoin|crypto|btc|eth|coin|trading|invest)/i.test(question)
    ? {
        amount_gbp: amount, recurring_weekly: false, verdict: 'not_now',
        headline: 'Not with this term’s loan. Build a buffer first.',
        reasoning: ['That money is covering rent and food until January.', 'Crypto can halve in a month. Only invest what you could lose completely.', 'Once you have a few hundred pounds that is truly spare, start small.'],
        try_instead: 'Put £10 a week into an easy-access savings account and revisit in January.',
      }
    : {
        amount_gbp: amount, recurring_weekly: false, verdict: 'yes_if',
        headline: 'Yes, if you go a bit easier for the next few weeks.',
        reasoning: ['It is more than one week of your safe-to-spend.', 'Your rent and essentials are already covered.', 'Spreading it means a few quieter weeks, not a crisis.'],
        try_instead: 'Look for a student discount or split the cost with friends.',
      };
}
