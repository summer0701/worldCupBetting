import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { CHOICES, EMPTY_POOL, calcOdds, calcPoolTotal, normalizePool } from '../lib/payout';

const STATUS_LABEL = {
  scheduled: '예정',
  locked: '마감',
  finished: '종료',
  settled: '정산완료',
};

const TEAM_FLAGS = {
  한국: '🇰🇷',
  대한민국: '🇰🇷',
  남아공: '🇿🇦',
  '남아프리카 공화국': '🇿🇦',
  일본: '🇯🇵',
  중국: '🇨🇳',
  미국: '🇺🇸',
  캐나다: '🇨🇦',
  멕시코: '🇲🇽',
  브라질: '🇧🇷',
  아르헨티나: '🇦🇷',
  프랑스: '🇫🇷',
  독일: '🇩🇪',
  스페인: '🇪🇸',
  잉글랜드: '🏴',
  포르투갈: '🇵🇹',
};

export default function MatchCard({ match, userName, userPassword, userPoints, onPredicted }) {
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
    if (!userPassword) {
      setError('비밀번호를 입력하세요.');
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
    if (userPoints !== null && pts > userPoints) {
      setError(`보유 포인트 ${userPoints.toLocaleString()} pts 이하로 입력하세요.`);
      return;
    }
    setSubmitting(true);
    try {
      await api.submitPrediction(match.id, userName.trim(), userPassword, selected, pts);
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
  const choiceLabel = {
    home: match.home_team,
    draw: '무승부',
    away: match.away_team,
  };
  const teamFlag = {
    home: TEAM_FLAGS[match.home_team] || '⚽',
    away: TEAM_FLAGS[match.away_team] || '⚽',
  };
  const hasEnoughPoints =
    points && (userPoints === null || Number(points) <= userPoints);

  function handlePointsChange(e) {
    const nextValue = e.target.value;

    if (!nextValue) {
      setPoints('');
      setError('');
      return;
    }

    const nextPoints = Number(nextValue);
    if (userPoints !== null && nextPoints > userPoints) {
      setPoints(String(userPoints));
      setError(`최대 ${userPoints.toLocaleString()} pts까지 입력할 수 있습니다.`);
      return;
    }

    setPoints(nextValue);
    setError('');
  }

  return (
    <div className={`match-card ${isLocked ? 'locked' : ''}`}>
      <div className="match-header">
        <span className={`status-badge status-${match.status}`}>
          {STATUS_LABEL[match.status] || match.status}
        </span>
        {match.result && (
          <span className="result-badge">
            결과: {choiceLabel[match.result]}
          </span>
        )}
      </div>

      <div className="match-teams">
        <div className="team-block home">
          <span className="team-flag">{teamFlag.home}</span>
          <span className="team">{match.home_team}</span>
        </div>
        <span className="vs">VS</span>
        <div className="team-block away">
          <span className="team">{match.away_team}</span>
          <span className="team-flag">{teamFlag.away}</span>
        </div>
      </div>

      <div className="match-time">
        {new Date(match.starts_at).toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>

      {!isLocked && (
        <form onSubmit={handleSubmit} className="predict-form">
          <div className="predict-title">
            <span>◉</span>
            예측 선택
          </div>
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
                  <span className="choice-label">
                    <span className="choice-symbol">
                      {c === 'home' ? teamFlag.home : c === 'away' ? teamFlag.away : '🤝'}
                    </span>
                    {choiceLabel[c]}
                  </span>
                  <span className="choice-pool">
                    {(pool[c] || 0).toLocaleString()} pts
                  </span>
                  {odds !== null && (
                    <span className="choice-odds">{odds.toFixed(2)}배</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="points-input-row">
            <div className="points-input-wrap">
              <span className="points-icon">▤</span>
              <input
                type="number"
                min="1"
                max={userPoints ?? undefined}
                value={points}
                onChange={handlePointsChange}
                placeholder="예측 포인트 입력"
                className="points-input"
              />
              <strong>
                {points
                  ? `${Number(points).toLocaleString()} pts`
                  : userPoints === null
                    ? `${total.toLocaleString()} pts`
                    : `최대 ${userPoints.toLocaleString()} pts`}
              </strong>
            </div>
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || !selected || !hasEnoughPoints}
            >
              {submitting ? '제출 중...' : '예측 제출'} <span>›</span>
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
