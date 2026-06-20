export function sortRankings(rankings = []) {
  return rankings
    .map((ranking) => ({
      ...ranking,
      points: Number(ranking.points) || 0,
      correct_count: Number(ranking.correct_count) || 0,
      participation_count: Number(ranking.participation_count) || 0,
      settled_count: Number(ranking.settled_count) || 0,
      accuracy: Number(ranking.accuracy) || 0,
    }))
    .sort((a, b) => (
      b.points - a.points ||
      b.correct_count - a.correct_count ||
      b.accuracy - a.accuracy ||
      String(a.user_name).localeCompare(String(b.user_name), 'ko')
    ))
    .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
}
