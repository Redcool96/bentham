# Bentham

**Your loan lands in September. We make sure it's still there in December.**

Claude Hackathon · UCL · Track: Better Student Life

A careful money friend for UCL students: the money app that tells you to slow down. It is named after Jeremy Bentham, UCL's spiritual father, who tried to calculate happiness with arithmetic (the *felicific calculus*) and still sits in the Student Centre keeping an eye on everyone. Bentham grew out of Quolin (`quolin-app`), our careful-crypto engine for banks. It keeps Quolin's core idea: **the code sets the numbers, and Claude explains them.**

## The problem

- The maintenance loan arrives in three lump sums. Week 3 feels rich; week 9 is beans on toast.
- Students are the main target of money-mule "jobs", fake landlords and crypto "mentors" on Instagram and TikTok.
- "Can I afford this?" usually goes to no one.

## What it does

| Tab | What | How |
|---|---|---|
| **Runway** | Safe-to-spend per week until the next loan instalment, after rent, essentials and an emergency buffer | Deterministic engine (`lib/runway.ts`), unit-tested, no AI |
| **Check** (Ask before you pay) | Paste a DM, job offer or listing, or upload a screenshot. You get **Looks OK / Be careful / Stop**, red flags quoted from the message, next steps (7726, 159) and a safe reply | Claude Opus 5.5 with vision and structured outputs (Zod schema) |
| **Ask** (Can I afford it?) | "Can I go to Barcelona for £220?" "Should I put £300 into Bitcoin?" | Claude pulls the amount and the verdict out of the question; the runway engine recalculates the weekly number shown on screen |

## Connects to your bank app

- **Open Banking:** students link their current account and Bentham reads the balance, Student Finance payments and upcoming direct debits automatically. Nothing to type in, and the runway stays up to date.
- **Inside the bank:** Bentham can also ship as a feature inside a bank's own app for its student accounts. This is the same route to market as Quolin, our engine for banks: the bank supplies the trust and the customers, and we supply the careful experience.

In the demo the numbers are entered by hand; the bank connection is shown as "coming soon".

## Run it

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local   # without a key the app runs on labelled demo answers
npm run dev                                        # http://localhost:3000
npm test                                           # runway engine tests
```

## 2-minute demo script

1. **Runway** (20s): "Meet a UCL first-year in mid-October. £2,640 in the bank, rent still due. Bentham says **£46 a week** is safe until the January loan. Plain arithmetic, nothing to hallucinate. Next step: it connects to your bank app, so you never type these in."
2. **Check** (45s): tap *Instagram job DM*, then **Check it**. Claude returns **Stop: money mule**, quoting "receive payments into your account" and explaining that it's a crime. Then tap *Flat near Euston* for **Stop: fake landlord**. Then *Normal SU message* for **Looks OK**: it isn't paranoid. Optional: upload a screenshot.
3. **Ask** (40s): tap *Barcelona £220* for **Yes, if…**, with the weekly number going £46 → £29. Then *£300 into Bitcoin* for **Not right now**, kindly: "only invest what you could lose completely."
4. **Close** (15s): "Bentham tried to calculate happiness 200 years ago, here at UCL. We finally did it, one week at a time. It grew out of Quolin, our careful-crypto engine for banks: the friend who tells you to slow down."

## Stack

Next.js 16 · React 19 · `@anthropic-ai/sdk` (`claude-opus-5-5`, `beta.messages.parse` + `betaZodOutputFormat`, server-side refusal fallback) · Zod · Vitest.
