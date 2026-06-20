import { useCallback, useState, useEffect } from 'react';
import { api } from '../lib/api';
import MatchCard from '../components/MatchCard';
import heroImage from '../assets/worldcup-hero.webp';
import heroMobileImage from '../assets/worldcup-hero-mobile.webp';

export default function HomePage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [userPassword, setUserPassword] = useState(() => sessionStorage.getItem('userPassword') || '');
  const [userNameInput, setUserNameInput] = useState(userName);
  const [userPasswordInput, setUserPasswordInput] = useState(userPassword);
  const [userPoints, setUserPoints] = useState(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadUserPoints = useCallback(async (name, password) => {
    if (!name || !password) return;

    try {
      const data = await api.getPredictionsByUser(name, password);
      setUserPoints(Number(data.user?.points || 0));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (userName && userPassword) {
      Promise.resolve().then(() => loadUserPoints(userName, userPassword));
    }
  }, [loadUserPoints, userName, userPassword]);

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

  async function refreshHomeData() {
    await Promise.all([loadMatches(), loadUserPoints(userName, userPassword)]);
  }

  async function handleSetUser(e) {
    e.preventDefault();
    const name = userNameInput.trim();
    const password = userPasswordInput.trim();
    if (!name || !password) return;
    setError('');

    try {
      const data = await api.loginUser(name, password);
      setUserName(name);
      setUserPassword(password);
      setUserPoints(Number(data.user?.points || 0));
      localStorage.setItem('userName', name);
      sessionStorage.setItem('userPassword', password);
    } catch (err) {
      setError(err.message);
    }
  }

  const activeMatches = matches.filter((m) => m.status === 'scheduled');
  const otherMatches = matches.filter((m) => m.status !== 'scheduled');

  return (
    <div className="page home-page">
      <div
        className="home-hero"
        style={{
          '--hero-desktop': `url(${heroImage})`,
          '--hero-mobile': `url(${heroMobileImage})`,
        }}
        aria-label="월드컵 예측 게임"
      >
        <div className="home-hero-shade" />
      </div>

      <div className="home-content">
        <div className="user-bar">
          <span className="user-avatar">♙</span>
          {userName ? (
            <div className="user-greeting">
              <span>안녕하세요, <strong>{userName}님!</strong></span>
              <span className="user-points">
                <span className="user-points-icon">▤</span>
                보유 포인트
                <strong>{userPoints === null ? '확인 중...' : `${userPoints.toLocaleString()} pts`}</strong>
              </span>
              <button
                className="btn-link"
                onClick={() => {
                  setUserName('');
                  setUserPassword('');
                  setUserNameInput('');
                  setUserPasswordInput('');
                  setUserPoints(null);
                  localStorage.removeItem('userName');
                  sessionStorage.removeItem('userPassword');
                }}
              >
                변경 <span aria-hidden="true">›</span>
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
              <input
                type="password"
                value={userPasswordInput}
                onChange={(e) => setUserPasswordInput(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="user-input"
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
                <h2 className="section-title">
                  <span className="section-line" />
                  <span className="section-title-text">
                    <span className="section-ball">⚽</span>
                    예측 가능한 경기
                  </span>
                  <span className="section-line" />
                </h2>
                <div className="matches-grid">
                  {activeMatches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      userName={userName}
                      userPassword={userPassword}
                      userPoints={userPoints}
                      onPredicted={refreshHomeData}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className="empty-msg">현재 예측 가능한 경기가 없습니다.</div>
            )}

            {otherMatches.length > 0 && (
              <section className="matches-section other-matches">
                <h2 className="section-title">
                  <span className="section-line" />
                  <span className="section-title-text">종료된 경기</span>
                  <span className="section-line" />
                </h2>
                <div className="matches-grid">
                  {otherMatches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      userName={userName}
                      userPassword={userPassword}
                      userPoints={userPoints}
                      onPredicted={refreshHomeData}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
