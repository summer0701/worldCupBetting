import { describe, expect, it } from 'vitest';
import { sortRankings } from './ranking';

describe('ranking utilities', () => {
  it('sorts by points, correct count, and accuracy', () => {
    const rankings = sortRankings([
      { user_name: '가', points: 1000, correct_count: 2, accuracy: 50 },
      { user_name: '나', points: 1200, correct_count: 1, accuracy: 100 },
      { user_name: '다', points: 1000, correct_count: 3, accuracy: 40 },
      { user_name: '라', points: 1000, correct_count: 3, accuracy: 75 },
    ]);

    expect(rankings.map((ranking) => ranking.user_name)).toEqual(['나', '라', '다', '가']);
    expect(rankings.map((ranking) => ranking.rank)).toEqual([1, 2, 3, 4]);
  });

  it('normalizes numeric strings before sorting', () => {
    const rankings = sortRankings([
      { user_name: '낮음', points: '900', correct_count: '5', accuracy: '100' },
      { user_name: '높음', points: '1000', correct_count: '0', accuracy: '0' },
    ]);

    expect(rankings[0]).toMatchObject({ user_name: '높음', points: 1000 });
  });
});
