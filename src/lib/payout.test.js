import { describe, expect, it } from 'vitest';
import {
  calcOdds,
  calcPayouts,
  calcPoolFromPredictions,
  calcPoolTotal,
  normalizePool,
  toPointNumber,
} from './payout';

describe('payout utilities', () => {
  it('normalizes invalid point values to zero', () => {
    expect(toPointNumber('120')).toBe(120);
    expect(toPointNumber(0)).toBe(0);
    expect(toPointNumber(-10)).toBe(0);
    expect(toPointNumber('abc')).toBe(0);
  });

  it('calculates pool totals and odds from numeric strings', () => {
    const pool = normalizePool({ home: '1000', draw: '300', away: '700' });

    expect(calcPoolTotal(pool)).toBe(2000);
    expect(calcOdds(pool, 'home')).toBe(2);
    expect(calcOdds(pool, 'draw')).toBeCloseTo(2000 / 300, 6);
    expect(calcOdds(pool, 'away')).toBeCloseTo(2000 / 700, 6);
  });

  it('returns null odds when a choice has no points or is invalid', () => {
    expect(calcOdds({ home: 100, draw: 0, away: 50 }, 'draw')).toBeNull();
    expect(calcOdds({ home: 100, draw: 0, away: 50 }, 'invalid')).toBeNull();
  });

  it('builds a pool from predictions and ignores invalid choices', () => {
    expect(
      calcPoolFromPredictions([
        { choice: 'home', points: '100' },
        { choice: 'draw', points: 40 },
        { choice: 'away', points: 60 },
        { choice: 'later', points: 999 },
      ]),
    ).toEqual({ home: 100, draw: 40, away: 60, count: 3 });
  });

  it('splits payouts proportionally among winning predictions', () => {
    const payouts = calcPayouts(
      [
        { id: 'p1', choice: 'home', points: 100 },
        { id: 'p2', choice: 'home', points: 300 },
        { id: 'p3', choice: 'away', points: 600 },
      ],
      'home',
    );

    expect(payouts).toEqual({ p1: 250, p2: 750 });
  });

  it('returns no payouts when there are no winners', () => {
    expect(
      calcPayouts([{ id: 'p1', choice: 'away', points: 100 }], 'draw'),
    ).toEqual({});
  });
});
