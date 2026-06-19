import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import MatchCard from '../components/MatchCard';
import DisclaimerBanner from '../components/DisclaimerBanner';

export default function HomePage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [userNameInput, setUserNameInput] = useState(userName);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMatches();
      setMatches(data.matches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSetUser(e) {
    e.preventDefault();
    const name = userNameInput.trim();
    if (!name) return;
    setUserName(name);
    localStorage.setItem('userName', name);
  }

  const activeMatches = matches.filter((m) => m.status === 'scheduled');
  const otherMatches = matches.filter((m) => m.status !== 'scheduled');

  return (
    <div className="page">
      <DisclaimerBanner />

      <div className="hero">
        <h1 className="hero-title">⚽ 월드컵 예측 게임</h1>
        <p className="hero-sub">승 · 무 · 패를 예측하고 가상 포인트를 획득하세요!</p>
      </div>

      <div className="user-bar">
        {userName ? (
          <div className="user-greeting">
            <span>안녕하세요, <strong>{userName}</strong>님!</span>
            <button
              className="btn-link"
              onClick={() => {
                setUserName('');
                setUserNameInput('');
                localStorage.removeItem('userName');
              }}
            >
              변경
            </button>
          </div>
        ) : (
          <form onSubmit={handleSetUser} className="user-form">
            <input
              type="text"
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              placeholder="사용자 이름을 입력하세요"
              className="user-input"
              maxLength={30}
            />
            <button type="submit" className="btn-primary">확인</button>
          </form>
        )}
      </div>

      {loading && <div className="loading">경기 목록을 불러오는 중...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <>
          {activeMatches.length > 0 ? (
            <section className="matches-section">
              <h2 className="section-title">예측 가능한 경기</h2>
              <div className="matches-grid">
                {activeMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    userName={userName}
                    onPredicted={loadMatches}
                  />
                ))}
              </div>
            </section>
          ) : (
            <div className="empty-msg">현재 예측 가능한 경기가 없습니다.</div>
          )}

          {otherMatches.length > 0 && (
            <section className="matches-section">
              <h2 className="section-title">종료된 경기</h2>
              <div className="matches-grid">
                {otherMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    userName={userName}
                    onPredicted={loadMatches}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
