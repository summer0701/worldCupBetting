import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

const CHOICE_LABEL = { home: '홈 승', draw: '무승부', away: '원정 승' };
const RESULT_LABEL = { home: '홈 승', draw: '무승부', away: '원정 승' };

export default function MyPage() {
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [inputName, setInputName] = useState(localStorage.getItem('userName') || '');
  const [predictions, setPredictions] = useState([]);
  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (name) => {
    setLoading(true);
    setError('');
    try {
      const predData = await api.getPredictionsByUser(name);
      setPredictions(predData.predictions || []);
      setUserPoints(Number(predData.user?.points || 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userName) return;
    Promise.resolve().then(() => fetchData(userName));
  }, [fetchData, userName]);

  function handleSearch(e) {
    e.preventDefault();
    const name = inputName.trim();
    if (!name) return;
    setUserName(name);
    localStorage.setItem('userName', name);
  }

  function getPredictionStatus(pred) {
    if (!pred.settled) return 'pending';
    return pred.payout > 0 ? 'win' : 'lose';
  }

  const totalWon = predictions
    .filter((p) => p.settled && Number(p.payout) > 0)
    .reduce((s, p) => s + Number(p.payout), 0);

  const totalBet = predictions.reduce((s, p) => s + Number(p.points), 0);

  return (
    <div className="page">
      <div className="hero">
        <h1 className="hero-title">내 예측 내역</h1>
      </div>

      <div className="user-bar">
        <form onSubmit={handleSearch} className="user-form">
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="사용자 이름을 입력하세요"
            className="user-input"
            maxLength={30}
          />
          <button type="submit" className="btn-primary">조회</button>
        </form>
      </div>

      {loading && <div className="loading">데이터를 불러오는 중...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && userName && (
        <>
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-label">현재 포인트</div>
              <div className="stat-value">
                {userPoints !== null ? userPoints.toLocaleString() : '-'} pts
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">총 예측 포인트</div>
              <div className="stat-value">{totalBet.toLocaleString()} pts</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">총 획득</div>
              <div className="stat-value">{totalWon.toLocaleString()} pts</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">예측 횟수</div>
              <div className="stat-value">{predictions.length}회</div>
            </div>
          </div>

          {predictions.length === 0 ? (
            <div className="empty-msg">예측 내역이 없습니다.</div>
          ) : (
            <div className="predictions-list">
              {predictions.map((p, i) => {
                const status = getPredictionStatus(p);
                return (
                  <div key={i} className={`prediction-item status-${status}`}>
                    <div className="pred-match">
                      {p.home_team} vs {p.away_team}
                    </div>
                    <div className="pred-detail">
                      <span className="pred-choice">
                        예측: {CHOICE_LABEL[p.choice] || p.choice}
                      </span>
                      <span className="pred-pts">예측 포인트: {Number(p.points).toLocaleString()} pts</span>
                    </div>
                    {p.result && (
                      <div className="pred-result">
                        실제 결과: {RESULT_LABEL[p.result] || p.result}
                      </div>
                    )}
                    <div className="pred-payout">
                      {status === 'pending' && (
                        <span className="badge badge-pending">정산 대기</span>
                      )}
                      {status === 'win' && (
                        <span className="badge badge-win">
                          획득: +{Number(p.payout).toLocaleString()} pts
                        </span>
                      )}
                      {status === 'lose' && (
                        <span className="badge badge-lose">꽝</span>
                      )}
                    </div>
                    <div className="pred-date">
                      {new Date(p.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
