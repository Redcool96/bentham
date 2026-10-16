import { describe, expect, it } from 'vitest';
import { computeRunway, withPurchase, type RunwayInput } from './runway';

const today = new Date(2026, 9, 16); // 16 Oct 2026

const base: RunwayInput = {
  balance: 1000,
  nextMoneyDate: '2026-11-13', // 28 days
  weeklyEssentials: 50,
  bills: [{ label: 'Rent', amount: 400 }],
  buffer: 100,
};

describe('computeRunway', () => {
  it('spreads what is left after bills, essentials and buffer over the weeks', () => {
    const r = computeRunway(base, today);
    expect(r.daysLeft).toBe(28);
    expect(r.weeksLeft).toBe(4);
    expect(r.essentialsTotal).toBe(200);
    expect(r.freePool).toBe(300);
    expect(r.safePerWeek).toBe(75);
    expect(r.status).toBe('comfortable');
    expect(r.runsOutOn).toBeNull();
  });

  it('flags tight when the weekly number is small', () => {
    expect(computeRunway({ ...base, balance: 760 }, today).status).toBe('tight');
  });

  it('flags short and says when the money runs out', () => {
    const r = computeRunway({ ...base, balance: 500 }, today);
    expect(r.status).toBe('short');
    // £100 left after rent at £50/week is 14 days
    expect(r.runsOutOn).toBe('2026-10-30');
  });

  it('never divides by zero weeks', () => {
    expect(computeRunway({ ...base, nextMoneyDate: '2026-10-16' }, today).weeksLeft).toBe(1);
  });
});

describe('withPurchase', () => {
  it('takes a one-off from the pool', () => {
    expect(withPurchase(computeRunway(base, today), 100, false).safePerWeek).toBe(50);
  });

  it('takes a weekly habit from every remaining week', () => {
    expect(withPurchase(computeRunway(base, today), 20, true).safePerWeek).toBe(55);
  });

  it('can turn a comfortable runway short', () => {
    expect(withPurchase(computeRunway(base, today), 400, false).status).toBe('short');
  });
});
