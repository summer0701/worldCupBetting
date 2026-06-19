import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { CHOICES, EMPTY_POOL, calcOdds, calcPoolTotal, normalizePool } from '../lib/payout';

const CHOICE_LABEL = { home: '홈 승', draw: '무승부', away: '원정 승' };
const STATUS_LABEL = {
  scheduled: '예정',
  locked: '마감',
  finished: '종료',
  settled: '정산완료',
};
const RESULT_LABEL = { home: '홈 승', draw: '무승부', away: '원정 승' };

export default function MatchCard({ match, userName, onPredicted }) {
  const [pool, setPool] = useState({ home: 0, draw: 0, away: 0 });
  const [selected, setSelected] = useState('');
  const [points, setPoints] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLocked =
    match.status !== 'scheduled' || new Date(match.starts_at) <= new Date();

  useEffect(() => {
    api
      .getMatchPool(match.id)
      .then((data) => setPool(normalizePool(data.pool || EMPTY_POOL)))
      .catch(() => {});
  }, [match.id, success]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userName.trim()) {
      setError('먼저 사용자 이름을 입력하세요.');
      return;
    }
    if (!selected) {
      setError('예측 결과를 선택하세요.');
      return;
    }
    const pts = Number(points);
    if (!pts || pts <= 0) {
      setError('포인트를 올바르게 입력하세요.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitPrediction(match.id, userName.trim(), selected, pts);
      setSuccess('예측이 제출되었습니다!');
      setSelected('');
      setPoints('');
      onPredicted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const total = calcPoolTotal(pool);

  return (
    <div className={`match-card ${isLocked ? 'locked' : ''}`}>
      <div className="match-header">
        <span className={`status-badge status-${match.status}`}>
          {STATUS_LABEL[match.status] || match.status}
        </span>
        {match.result && (
          <span className="result-badge">
            결과: {RESULT_LABEL[match.result]}
          </span>
        )}
      </div>

      <div className="match-teams">
        <span className="team home">{match.home_team}</span>
        <span className="vs">VS</span>
        <span className="team away">{match.away_team}</span>
      </div>

      <div className="match-time">
        {new Date(match.starts_at).toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>

      <div className="pool-info">
        <div className="pool-row">
          <span>전체 풀</span>
          <strong>{total.toLocaleString()} pts</strong>
        </div>
      </div>

      {!isLocked && (
        <form onSubmit={handleSubmit} className="predict-form">
          <div className="choice-buttons">
            {CHOICES.map((c) => {
              const odds = calcOdds(pool, c);
              return (
                <button
                  key={c}
                  type="button"
                  className={`choice-btn choice-${c} ${selected === c ? 'active' : ''}`}
                  onClick={() => setSelected(c)}
                >
                  <span className="choice-label">{CHOICE_LABEL[c]}</span>
                  <span className="choice-odds">
                    {odds !== null ? `${odds.toFixed(2)}배` : '-'}
                  </span>
                  <span className="choice-pool">
                    {(pool[c] || 0).toLocaleString()} pts
                  </span>
                </button>
              );
            })}
          </div>

          <div className="points-input-row">
            <input
              type="number"
              min="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="예측 포인트 입력"
              className="points-input"
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || !selected || !points}
            >
              {submitting ? '제출 중...' : '예측 제출'}
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
        </form>
      )}

      {isLocked && (
        <div className="locked-notice">
          {match.status === 'scheduled'
            ? '경기 시작 시간이 지나 예측이 마감되었습니다.'
            : '예측이 마감된 경기입니다.'}
        </div>
      )}
    </div>
  );
}
