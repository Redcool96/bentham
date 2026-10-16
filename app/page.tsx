'use client';

import { useEffect, useState } from 'react';
import { AskScreen, CheckScreen, RunwayScreen } from '@/components/screens';
import { DEMO_INPUT, type RunwayInput } from '@/lib/runway';

type Tab = 'runway' | 'check' | 'ask';
const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'runway', label: 'Runway', ico: '◔' },
  { id: 'check', label: 'Check', ico: '⛨' },
  { id: 'ask', label: 'Ask', ico: '?' },
];
const KEY = 'qc-runway';

export default function Home() {
  const [tab, setTab] = useState<Tab>('runway');
  const [input, setInput] = useState<RunwayInput>(DEMO_INPUT);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setInput(JSON.parse(saved));
    } catch { /* no storage: keep the demo student */ }
  }, []);
  const save = (r: RunwayInput) => {
    setInput(r);
    try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ }
  };

  return (
    <main className="stage">
      <aside className="guide">
        <div className="eyebrow">Claude Hackathon · Better Student Life</div>
        <h1>Your loan lands in September. We make sure it’s still there in December.</h1>
        <p>Bentham is a careful money friend for UCL students, named after the philosopher who tried to calculate happiness (and who still sits in the Student Centre, keeping an eye on you). It is the money app that tells you to slow down.</p>
        <ol>
          <li><b>Runway</b>: what you can safely spend each week until your next loan instalment. Plain arithmetic, not AI.</li>
          <li><b>Check</b>: paste a DM, job offer or flat listing, or add a screenshot. Claude spots money mules, fake landlords and crypto “mentors”.</li>
          <li><b>Ask</b>: “Can I afford Barcelona?” Claude reads the question; the runway engine shows what it does to your week.</li>
        </ol>
        <p><b>Connects to your bank app.</b> Through Open Banking, Bentham can read your balance, loan payments and upcoming direct debits, so there is nothing to type in. It can also live inside a bank’s own app as a feature for its student accounts, like Quolin, our engine for banks.</p>
        <p className="small">Built with Claude Opus 5.5 (structured outputs and vision). Grown out of Quolin, our careful-crypto engine for banks: the code sets the numbers, and Claude explains them.</p>
        <button className="linkbtn" onClick={() => save(DEMO_INPUT)}>Reset demo student</button>
      </aside>

      <div className="phone">
        <header className="topbar">
          <div className="brand">Bentham<span>.</span></div>
          <span className="faint">UCL</span>
        </header>
        <section className="screen">
          {tab === 'runway' && <RunwayScreen input={input} setInput={save} />}
          {tab === 'check' && <CheckScreen />}
          {tab === 'ask' && <AskScreen input={input} />}
        </section>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <span className="ico" aria-hidden>{t.ico}</span>{t.label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
