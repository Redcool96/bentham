// Records a captioned walkthrough of the running app (npm run dev first).
// Usage: node scripts/record-walkthrough.mjs [url]  ->  walkthrough/bentham-walkthrough.mp4
import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';

const URL = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.resolve('walkthrough');
const SIZE = { width: 1440, height: 900 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT, size: SIZE } });
const page = await context.newPage();

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

async function caption(text, ms = 3500) {
  await page.evaluate((t) => {
    let el = document.getElementById('wt-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wt-caption';
      Object.assign(el.style, {
        position: 'fixed', left: '40px', bottom: '28px', zIndex: '9999', pointerEvents: 'none',
        width: '620px', padding: '14px 24px', borderRadius: '14px', background: 'rgba(15,25,34,0.92)',
        color: '#fff', font: '500 21px/1.35 Inter, -apple-system, sans-serif', textAlign: 'left',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)', transition: 'opacity 250ms',
      });
      document.body.appendChild(el);
    }
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = t; el.style.opacity = '1'; }, 200);
  }, text);
  await wait(ms);
}

const tab = (name) => page.locator('nav.tabs button', { hasText: name }).click();
const scrollScreen = (top) => page.locator('.screen').evaluate((el, y) => el.scrollTo({ top: y, behavior: 'smooth' }), top);
const scrollToVerdict = () => page.locator('.verdict').first().evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));

// 1. Intro
await caption('Meet Bentham: a careful money friend for UCL students, named after the man who tried to calculate happiness.', 4500);
await caption('The problem: your student loan lands in three lumps. Week 3 feels rich. Week 9 is beans on toast.', 4500);

// 2. Runway
await caption('Runway: £46 a week is safe to spend until the January loan. Rent, food and a buffer are already set aside.', 5000);
await caption('This number is plain arithmetic, not AI. Nothing to hallucinate.', 3500);
await scrollScreen(600);
await caption('Next step: connect your bank app with Open Banking, or ship Bentham inside a bank’s own student account.', 5000);
await scrollScreen(0);

// 3. Check
await tab('Check');
await caption('Ask before you pay: students are the number one target for money-mule “jobs”, fake landlords and crypto “mentors”.', 5000);
await page.getByRole('button', { name: 'Instagram job DM' }).click();
await caption('A DM like this lands in a fresher’s inbox. Is it OK?', 3000);
await page.getByRole('button', { name: 'Check it' }).click();
await page.locator('.verdict').waitFor({ timeout: 60000 });
await scrollToVerdict();
await caption('Claude says STOP: money mule recruitment. It quotes the warning signs and says what to do next.', 5500);

await scrollScreen(0);
await page.getByRole('button', { name: 'Flat near Euston' }).click();
await page.getByRole('button', { name: 'Check it' }).click();
await page.locator('.verdict').waitFor({ timeout: 60000 });
await scrollToVerdict();
await caption('A flat near Euston, deposit by bank transfer today, no viewing: a classic fake landlord.', 5000);

await scrollScreen(0);
await page.getByRole('button', { name: 'Normal SU message' }).click();
await page.getByRole('button', { name: 'Check it' }).click();
await page.locator('.verdict').waitFor({ timeout: 60000 });
await scrollToVerdict();
await caption('And it is not paranoid: a normal Students’ Union message looks OK. You can also upload a screenshot.', 5000);

// 4. Ask
await tab('Ask');
await caption('Can I afford it? Ask in plain English. Claude reads the question; the runway engine owns the numbers.', 4500);
await page.getByRole('button', { name: /Barcelona/ }).click();
await page.locator('.verdict').waitFor({ timeout: 60000 });
await scrollToVerdict();
await caption('Barcelona for £220: yes, if you go easier for a few weeks. Your weekly number drops from £46 to £29.', 5500);

await scrollScreen(0);
await page.getByRole('button', { name: /£300/ }).click();
await page.locator('.verdict').waitFor({ timeout: 60000 });
await scrollToVerdict();
await caption('£300 of loan money into Bitcoin: not right now. Only invest what you could lose completely.', 5500);

// 5. Close
await tab('Runway');
await caption('Bentham is the money app that tells you to slow down. Built with Claude Opus 5.5.', 4500);
await caption('Bentham. Your loan lands in September. We make sure it’s still there in December.', 5000);

await context.close();
await browser.close();

const webm = readdirSync(OUT).find((f) => f.endsWith('.webm'));
renameSync(path.join(OUT, webm), path.join(OUT, 'bentham-walkthrough.webm'));
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', path.join(OUT, 'bentham-walkthrough.webm'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', path.join(OUT, 'bentham-walkthrough.mp4')]);
console.log(`Saved ${path.join(OUT, 'bentham-walkthrough.mp4')}`);
