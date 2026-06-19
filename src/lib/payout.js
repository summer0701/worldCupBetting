export const CHOICES = ['home', 'draw', 'away'];

export const EMPTY_POOL = Object.freeze({
  home: 0,
  draw: 0,
  away: 0,
  count: 0,
});

export function toPointNumber(value) {
  const points = Number(value);
  return Number.isFinite(points) && points > 0 ? points : 0;
}

export function normalizePool(pool = {}) {
  return {
    home: toPointNumber(pool.home),
    draw: toPointNumber(pool.draw),
    away: toPointNumber(pool.away),
    count: Number.isFinite(Number(pool.count)) ? Number(pool.count) : 0,
  };
}

export function calcPoolTotal(pool = {}) {
  const normalizedPool = normalizePool(pool);
  return CHOICES.reduce((sum, choice) => sum + normalizedPool[choice], 0);
}

/**
 * 누적 풀 방식 배당률 계산: 전체 누적 포인트 / 선택지 누적 포인트.
 * 선택지 누적 포인트가 0이면 표시하지 않도록 null을 반환한다.
 */
export function calcOdds(pool, choice) {
  if (!CHOICES.includes(choice)) return null;

  const normalizedPool = normalizePool(pool);
  const choiceTotal = normalizedPool[choice];
  if (choiceTotal === 0) return null;

  return calcPoolTotal(normalizedPool) / choiceTotal;
}

export function calcPoolFromPredictions(predictions = []) {
  return predictions.reduce(
    (pool, prediction) => {
      if (!CHOICES.includes(prediction.choice)) return pool;

      return {
        ...pool,
        [prediction.choice]: pool[prediction.choice] + toPointNumber(prediction.points),
        count: pool.count + 1,
      };
    },
    { ...EMPTY_POOL },
  );
}

/**
 * 정산: 결과를 맞힌 참가자들이 맞힌 선택지에 건 비율대로 전체 풀을 나눠 가진다.
 * 반환값은 prediction id를 키로 하는 payout 맵이다.
 */
export function calcPayouts(predictions = [], result) {
  if (!CHOICES.includes(result)) return {};

  const total = predictions.reduce(
    (sum, prediction) => sum + toPointNumber(prediction.points),
    0,
  );
  const winners = predictions.filter((prediction) => prediction.choice === result);
  const winnerTotal = winners.reduce(
    (sum, prediction) => sum + toPointNumber(prediction.points),
    0,
  );

  if (total === 0 || winnerTotal === 0) return {};

  return winners.reduce((payouts, prediction) => {
    payouts[prediction.id] = Math.floor(
      (toPointNumber(prediction.points) / winnerTotal) * total,
    );
    return payouts;
  }, {});
}
