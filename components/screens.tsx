'use client';

import { useState } from 'react';
import { computeRunway, type Runway, type RunwayInput } from '@/lib/runway';
import type { AskResult, CheckResult } from '@/lib/claude';

const gbp = (n: number, dp = 0) =>
  `${n < 0 ? '−' : ''}£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const STATUS = {
  comfortable: { cls: 'ok', label: 'On track' },
  tight: { cls: 'care', label: 'Tight' },
  short: { cls: 'stop', label: 'Runs out early' },
} as const;

function Thinking({ text }: { text: string }) {
  return <div className="thinking"><span className="dot" /> {text}</div>;
}

function DemoNote() {
  return <div className="demo-note">Demo answer. Add an ANTHROPIC_API_KEY to get Claude’s real judgement.</div>;
}

// ── Runway ─────────────────────────────────────────────────────────────────

export function RunwayScreen({ input, setInput }: { input: RunwayInput; setInput: (r: RunwayInput) => void }) {
  const r = computeRunway(input);
  const [editing, setEditing] = useState(false);
  const s = STATUS[r.status];
  const parts = [
    { label: 'Bills', value: r.billsTotal, color: 'var(--steel)' },
    { label: 'Essentials', value: r.essentialsTotal, color: 'var(--faint)' },
    { label: 'Buffer', value: input.buffer, color: 'var(--ink-2)' },
    { label: 'Free to spend', value: Math.max(0, r.freePool), color: 'var(--bronze)' },
  ];
  const total = Math.max(1, parts.reduce((t, p) => t + p.value, 0));
  const set = (patch: Partial<RunwayInput>) => setInput({ ...input, ...patch });

  return (
    <div>
      <div className="card">
        <div className="row">
          <span className="faint">Safe to spend</span>
          <span className={`pill ${s.cls}`}>{s.label}</span>
        </div>
        <div className="big" style={{ marginTop: 8 }}>
          {gbp(r.safePerWeek)}<span className="muted" style={{ fontSize: 18, fontFamily: 'var(--sans)', fontWeight: 400 }}> / week</span>
        </div>
        <p className="muted" style={{ margin: '8px 0 0' }}>
          {r.status === 'short' && r.runsOutOn
            ? <>At this rate your money runs out around <b>{longDate(r.runsOutOn)}</b>, before your next loan.</>
            : <>For the next <b>{r.weeksLeft} weeks</b>, until your loan lands on <b>{longDate(input.nextMoneyDate)}</b>. Rent, food and a {gbp(input.buffer)} buffer are already set aside.</>}
        </p>
        <div className="bar" aria-hidden>
          {parts.map((p) => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
        </div>
        <div className="legend">
          {parts.map((p) => <span key={p.label}><i style={{ background: p.color }} />{p.label} {gbp(p.value)}</span>)}
        </div>
      </div>

      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>Your money</h3>
          <button className="linkbtn" onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</button>
        </div>
        {!editing ? (
          <div className="stack" style={{ marginTop: 10, fontSize: 14 }}>
            <div className="row"><span className="muted">In your account</span><b>{gbp(input.balance)}</b></div>
            <div className="row"><span className="muted">Next loan instalment</span><b>{longDate(input.nextMoneyDate)} · {r.daysLeft} days</b></div>
            {input.bills.map((b) => <div className="row" key={b.label}><span className="muted">{b.label}</span><b>{gbp(b.amount)}</b></div>)}
            <div className="row"><span className="muted">Food, travel, phone</span><b>{gbp(input.weeklyEssentials)} / week</b></div>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 10 }}>
            <div className="grid2">
              <label className="field">In your account
                <span className="money"><input className="input" type="number" value={input.balance} onChange={(e) => set({ balance: Number(e.target.value) })} /></span>
              </label>
              <label className="field">Next loan lands
                <input className="input" type="date" value={input.nextMoneyDate} onChange={(e) => e.target.value && set({ nextMoneyDate: e.target.value })} />
              </label>
              <label className="field">Essentials / week
                <span className="money"><input className="input" type="number" value={input.weeklyEssentials} onChange={(e) => set({ weeklyEssentials: Number(e.target.value) })} /></span>
              </label>
              <label className="field">Keep back
                <span className="money"><input className="input" type="number" value={input.buffer} onChange={(e) => set({ buffer: Number(e.target.value) })} /></span>
              </label>
            </div>
            <div className="faint">Bills still due before then</div>
            {input.bills.map((b, i) => (
              <div className="grid2" key={i} style={{ gridTemplateColumns: '1fr 110px auto' }}>
                <input className="input" value={b.label} aria-label="Bill name"
                  onChange={(e) => set({ bills: input.bills.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <span className="money"><input className="input" type="number" value={b.amount} aria-label="Bill amount"
                  onChange={(e) => set({ bills: input.bills.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} /></span>
                <button className="btn ghost" aria-label={`Remove ${b.label}`} onClick={() => set({ bills: input.bills.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button className="btn ghost" onClick={() => set({ bills: [...input.bills, { label: 'New bill', amount: 0 }] })}>+ Add a bill</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>Connect your bank app</h3>
          <span className="pill care">Coming soon</span>
        </div>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
          Link your student account with Open Banking and Bentham fills this in for you: your balance, your loan payments and the bills still to come out.
        </p>
      </div>

      <p className="faint" style={{ padding: '0 4px' }}>
        Worked out on your phone with simple arithmetic, not AI. Claude only explains it.
      </p>
    </div>
  );
}

// ── Ask before you pay ─────────────────────────────────────────────────────

const CHECK_SAMPLES = [
  {
    label: 'Instagram job DM',
    text: 'Hey hun 👋 we’re hiring UCL students for a remote finance assistant role. £400/week, no experience needed! You just receive payments from our clients into your account and transfer them on to our suppliers, keep 10% for yourself. DM me your sort code + account number to start today 💸',
  },
  {
    label: 'Flat near Euston',
    text: 'Studio near Euston, £850 pcm all bills included. I’m working abroad at the moment so can’t show it in person, but if you send the £1,200 deposit by bank transfer today I’ll post you the keys. Lots of interest so need to decide fast.',
  },
  {
    label: 'Crypto “mentor”',
    text: 'I turned £250 into £4,000 in 3 weeks with my AI trading bot 🚀 Guaranteed 30% weekly returns. Only 10 spots left for UCL students, send £250 in USDT to join my VIP group.',
  },
  {
    label: 'Normal SU message',
    text: 'Hi! Reminder that the Film Society social is this Thursday 7pm at the Students’ Union bar. Tickets are £5 on the SU website, members get a free drink.',
  },
];

const VERDICT = {
  looks_ok: { cls: 'v-ok', label: 'Looks OK' },
  be_careful: { cls: 'v-care', label: 'Be careful' },
  stop: { cls: 'v-stop', label: 'Stop' },
} as const;

type Img = { media_type: string; data: string; url: string };

export function CheckScreen() {
  const [text, setText] = useState('');
  const [img, setImg] = useState<Img | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<{ result: CheckResult; demo: boolean } | null>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 4_500_000) { setErr('That image is too big. Try a screenshot under 4 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setImg({ media_type: f.type, data: url.split(',')[1], url });
    };
    reader.readAsDataURL(f);
  };

  const run = async () => {
    setBusy(true); setErr(''); setRes(null);
    try {
      const r = await fetch('/api/check', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, image: img ? { media_type: img.media_type, data: img.data } : undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRes(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally { setBusy(false); }
  };

  const v = res && VERDICT[res.result.verdict];
  return (
    <div>
      <h2 className="serif" style={{ margin: '0 0 4px', fontSize: 24 }}>Ask before you pay</h2>
      <p className="muted" style={{ margin: '0 0 10px' }}>Got a DM, job offer or listing that feels off? Paste it or add a screenshot.</p>
      <div className="chips">
        {CHECK_SAMPLES.map((s) => <button key={s.label} className="chip" onClick={() => { setText(s.text); setImg(null); setRes(null); }}>{s.label}</button>)}
      </div>
      <textarea className="input" placeholder="Paste the message here…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row" style={{ margin: '8px 0 12px' }}>
        <label className="linkbtn" style={{ cursor: 'pointer' }}>
          {img ? 'Change screenshot' : '+ Add a screenshot'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {img && <button className="linkbtn" onClick={() => setImg(null)}>Remove</button>}
      </div>
      {img && <img className="thumb" src={img.url} alt="Your screenshot" style={{ marginBottom: 12 }} />}
      <button className="btn" disabled={busy || (!text.trim() && !img)} onClick={run}>Check it</button>
      {err && <div className="error">{err}</div>}
      {busy && <Thinking text="Claude is reading it carefully…" />}

      {res && v && (
        <div style={{ marginTop: 16 }}>
          {res.demo && <DemoNote />}
          <div className={`verdict ${v.cls}`}>
            <div className="label">{v.label}</div>
            <div className="headline">{res.result.headline}</div>
          </div>
          {res.result.red_flags.length > 0 && (
            <div className="card">
              <h3>Warning signs</h3>
              <ul className="flags">
                {res.result.red_flags.map((f, i) => (
                  <li key={i}>{f.quote && <><q>{f.quote}</q><br /></>}<span className="muted">{f.why}</span></li>
                ))}
              </ul>
            </div>
          )}
          <div className="card">
            <h3>What to do</h3>
            <ol className="steps">{res.result.next_steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
          {res.result.safe_reply && (
            <div className="card">
              <h3>If you want to reply</h3>
              <p style={{ margin: 0 }} className="muted">“{res.result.safe_reply}”</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Can I afford it? ───────────────────────────────────────────────────────

const ASK_SAMPLES = [
  'Can I go to Barcelona with my flatmates? Flights and hostel are about £220.',
  'Should I put £300 of my loan into Bitcoin?',
  'I get a £4.50 Pret coffee every weekday. Is that OK?',
  'Can I buy a £35 hoodie from the UCL shop?',
];

const ASK_VERDICT = {
  yes: { cls: 'v-ok', label: 'Yes' },
  yes_if: { cls: 'v-care', label: 'Yes, if…' },
  not_now: { cls: 'v-care', label: 'Not right now' },
  no: { cls: 'v-stop', label: 'No' },
} as const;

export function AskScreen({ input }: { input: RunwayInput }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<{ result: AskResult; before: Runway; after: Runway | null; demo: boolean } | null>(null);

  const run = async (question = q) => {
    if (!question.trim()) return;
    setQ(question); setBusy(true); setErr(''); setRes(null);
    try {
      const r = await fetch('/api/ask', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, runway: input }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRes(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally { setBusy(false); }
  };

  const v = res && ASK_VERDICT[res.result.verdict];
  return (
    <div>
      <h2 className="serif" style={{ margin: '0 0 4px', fontSize: 24 }}>Can I afford it?</h2>
      <p className="muted" style={{ margin: '0 0 10px' }}>An honest answer, using your real runway.</p>
      <div className="chips">
        {ASK_SAMPLES.map((s) => <button key={s} className="chip" onClick={() => run(s)}>{s.length > 38 ? `${s.slice(0, 36)}…` : s}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="stack">
        <textarea className="input" style={{ minHeight: 70 }} placeholder="e.g. Can I get tickets to see Raye for £85?" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" disabled={busy || !q.trim()}>Ask</button>
      </form>
      {err && <div className="error">{err}</div>}
      {busy && <Thinking text="Claude is checking your runway…" />}

      {res && v && (
        <div style={{ marginTop: 16 }}>
          {res.demo && <DemoNote />}
          <div className={`verdict ${v.cls}`}>
            <div className="label">{v.label}</div>
            <div className="headline">{res.result.headline}</div>
          </div>
          {res.after && (
            <div className="card">
              <div className="faint" style={{ marginBottom: 8 }}>
                Safe to spend per week{res.result.amount_gbp ? `, after ${gbp(res.result.amount_gbp, 2)}${res.result.recurring_weekly ? ' a week' : ''}` : ''}
              </div>
              <div className="compare">
                <div><div className="n">{gbp(res.before.safePerWeek)}</div><div className="faint">now</div></div>
                <div className="muted">→</div>
                <div><div className="n" style={{ color: res.after.status === 'short' ? 'var(--stop)' : res.after.status === 'tight' ? 'var(--care)' : 'var(--ok)' }}>{gbp(res.after.safePerWeek)}</div><div className="faint">after</div></div>
              </div>
            </div>
          )}
          <div className="card">
            <ul style={{ margin: 0, paddingLeft: 18 }}>{res.result.reasoning.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}</ul>
          </div>
          {res.result.try_instead && (
            <div className="card">
              <h3>Try instead</h3>
              <p className="muted" style={{ margin: 0 }}>{res.result.try_instead}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
