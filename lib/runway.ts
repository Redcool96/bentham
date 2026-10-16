// The runway engine: how much a student can safely spend each week until the next loan
// instalment lands. Pure arithmetic, no AI. Claude explains these numbers; it never sets them.

export interface Bill {
  label: string;
  /** Still to pay before the next instalment, in pounds. */
  amount: number;
}

export interface RunwayInput {
  /** What is in the account today, in pounds. */
  balance: number;
  /** ISO date (YYYY-MM-DD) the next maintenance loan instalment (or other money) lands. */
  nextMoneyDate: string;
  /** Food, travel, phone: the things you spend every week, in pounds. */
  weeklyEssentials: number;
  /** One-off bills still due before the next instalment (rent, deposits, course costs). */
  bills: Bill[];
  /** Kept back for emergencies and never counted as spendable. */
  buffer: number;
}

export type RunwayStatus = 'comfortable' | 'tight' | 'short';

export interface Runway {
  daysLeft: number;
  weeksLeft: number;
  billsTotal: number;
  essentialsTotal: number;
  /** Money left for everything else after bills, essentials and the buffer. */
  freePool: number;
  /** freePool spread over the weeks left. Negative means the money runs out first. */
  safePerWeek: number;
  status: RunwayStatus;
  /** If short: roughly when the money runs out (ISO date), counting the buffer as spendable. */
  runsOutOn: string | null;
}

/** Below this, a week of "fun money" is a coffee and a bus fare. */
export const TIGHT_PER_WEEK = 25;

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function startOfDay(d: Date) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function statusOf(safePerWeek: number): RunwayStatus {
  return safePerWeek < 0 ? 'short' : safePerWeek < TIGHT_PER_WEEK ? 'tight' : 'comfortable';
}

export function computeRunway(input: RunwayInput, today: Date = new Date()): Runway {
  const [y, m, d] = input.nextMoneyDate.split('-').map(Number);
  const daysLeft = Math.max(1, Math.round((Date.UTC(y, m - 1, d) - startOfDay(today)) / DAY));
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));

  const billsTotal = round2(input.bills.reduce((s, b) => s + Math.max(0, b.amount), 0));
  const essentialsTotal = round2(Math.max(0, input.weeklyEssentials) * (daysLeft / 7));
  const freePool = round2(input.balance - billsTotal - essentialsTotal - Math.max(0, input.buffer));
  const safePerWeek = round2(freePool / weeksLeft);
  const status = statusOf(safePerWeek);

  let runsOutOn: string | null = null;
  if (status === 'short') {
    // Bills are due up front; essentials burn daily. Find the day the balance hits zero.
    const afterBills = input.balance - billsTotal;
    const perDay = Math.max(0.01, input.weeklyEssentials / 7);
    const days = Math.max(0, Math.floor(afterBills / perDay));
    runsOutOn = new Date(startOfDay(today) + days * DAY).toISOString().slice(0, 10);
  }

  return { daysLeft, weeksLeft, billsTotal, essentialsTotal, freePool, safePerWeek, status, runsOutOn };
}

/** What a purchase does to the weekly number: a one-off comes off the pool now,
 *  a weekly habit comes off every remaining week. */
export function withPurchase(r: Runway, amount: number, recurringWeekly: boolean): Runway {
  const cost = recurringWeekly ? amount * r.weeksLeft : amount;
  const freePool = round2(r.freePool - cost);
  const safePerWeek = round2(freePool / r.weeksLeft);
  const status = statusOf(safePerWeek);
  return { ...r, freePool, safePerWeek, status, runsOutOn: status === 'short' ? r.runsOutOn : null };
}

/** The facts Claude is given about the student's money, as plain lines. */
export function describeRunway(input: RunwayInput, r: Runway): string {
  return [
    `Balance today: £${input.balance.toFixed(2)}`,
    `Next money lands: ${input.nextMoneyDate} (${r.daysLeft} days, ${r.weeksLeft} weeks)`,
    `Bills still due before then: £${r.billsTotal.toFixed(2)} (${input.bills.map((b) => `${b.label} £${b.amount}`).join(', ') || 'none'})`,
    `Weekly essentials: £${input.weeklyEssentials.toFixed(2)}/week, £${r.essentialsTotal.toFixed(2)} in total`,
    `Emergency buffer kept back: £${input.buffer.toFixed(2)}`,
    `Free to spend until then: £${r.freePool.toFixed(2)}, which is £${r.safePerWeek.toFixed(2)} per week`,
    `Status: ${r.status}`,
  ].join('\n');
}

/** A believable UCL first-year in mid-October: the loan landed in late September. */
export const DEMO_INPUT: RunwayInput = {
  balance: 2640,
  nextMoneyDate: '2027-01-11',
  weeklyEssentials: 55,
  bills: [
    { label: 'Rent (rest of term 1)', amount: 1150 },
    { label: 'Oyster top-up', amount: 60 },
  ],
  buffer: 150,
};
