import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CHOICES, EMPTY_POOL, calcOdds, calcPoolTotal, normalizePool } from '../lib/payout';

const ADMIN_PASSWORD_KEY = 'adminPassword';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [savedPw, setSavedPw] = useState(() => sessionStorage.getItem(ADMIN_PASSWORD_KEY) || '');
  const [authenticated, setAuthenticated] = useState(!!sessionStorage.getItem(ADMIN_PASSWORD_KEY));

  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [grantPoints, setGrantPoints] = useState({});
  const [grantingUser, setGrantingUser] = useState('');

  const [newMatch, setNewMatch] = useState({
    home_team: '',
    away_team: '',
    starts_at: '',
    status: 'scheduled',
  });

  const [pools, setPools] = useState({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mData, uData] = await Promise.all([
        api.getMatches(),
        api.getUsers(savedPw),
      ]);
      const ms = mData.matches || [];
      setMatches(ms);
      setUsers(uData.users || []);

      const poolResults = await Promise.all(
        ms.map((match) =>
          api.getMatchPool(match.id).then((result) => ({
            id: match.id,
            pool: normalizePool(result.pool || EMPTY_POOL),
          })),
        ),
      );
      const poolMap = Object.fromEntries(
        poolResults.map(({ id, pool }) => [id, pool]),
      );
      setPools(poolMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [savedPw]);

  useEffect(() => {
    if (!authenticated) return;
    Promise.resolve().then(loadAll);
  }, [authenticated, loadAll]);

  function handleLogin(e) {
    e.preventDefault();
    if (!password.trim()) return;
    setSavedPw(password);
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
    setAuthenticated(true);
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    setSavedPw('');
    setAuthenticated(false);
  }

  async function handleCreateMatch(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.createMatch(newMatch, savedPw);
      setMsg('경기가 생성되었습니다.');
      setNewMatch({ home_team: '', away_team: '', starts_at: '', status: 'scheduled' });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetResult(matchId, result) {
    setError('');
    setMsg('');
    try {
      await api.updateMatchResult(matchId, result, savedPw);
      setMsg('결과가 저장되었습니다.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteMatch(match) {
    setError('');
    setMsg('');
    const confirmed = window.confirm(
      `${match.home_team} vs ${match.away_team} 경기를 삭제하시겠습니까?\n제출된 예측이 있다면 사용한 포인트가 환불됩니다.`,
    );
    if (!confirmed) return;

    try {
      const res = await api.deleteMatch(match.id, savedPw);
      const refundedCount = res.refundedPredictionsCount || 0;
      setMsg(
        refundedCount > 0
          ? `경기가 삭제되었고 ${refundedCount}명의 예측 포인트가 환불되었습니다.`
          : '경기가 삭제되었습니다.',
      );
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSettle(matchId) {
    setError('');
    setMsg('');
    if (!window.confirm('정산을 실행하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      const res = await api.settleMatch(matchId, savedPw);
      setMsg(`정산 완료! 총 ${res.winnersCount || 0}명에게 포인트가 지급되었습니다.`);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateStatus(matchId, status) {
    setError('');
    setMsg('');
    try {
      await api.updateMatchStatus(matchId, status, savedPw);
      setMsg('상태가 변경되었습니다.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGrantPoints(e, userName) {
    e.preventDefault();
    setError('');
    setMsg('');

    const points = Number(grantPoints[userName]);
    if (!Number.isInteger(points) || points <= 0) {
      setError('지급 포인트는 1 이상의 정수로 입력하세요.');
      return;
    }

    setGrantingUser(userName);
    try {
      const res = await api.grantUserPoints(userName, points, savedPw);
      setMsg(`${userName}님에게 ${Number(res.grantedPoints).toLocaleString()} pts를 지급했습니다.`);
      setGrantPoints((current) => ({ ...current, [userName]: '' }));
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setGrantingUser('');
    }
  }

  if (!authenticated) {
    return (
      <div className="page admin-login-page">
        <div className="admin-login-card">
          <h1>관리자 로그인</h1>
          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="관리자 비밀번호"
              className="user-input"
              autoFocus
            />
            <button type="submit" className="btn-primary">로그인</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <h1>관리자 페이지</h1>
        <button className="btn-secondary" onClick={handleLogout}>로그아웃</button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {msg && <div className="success-msg">{msg}</div>}

      <section className="admin-section">
        <h2>새 경기 등록</h2>
        <form onSubmit={handleCreateMatch} className="admin-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="홈팀"
              value={newMatch.home_team}
              onChange={(e) => setNewMatch({ ...newMatch, home_team: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="원정팀"
              value={newMatch.away_team}
              onChange={(e) => setNewMatch({ ...newMatch, away_team: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <input
              type="datetime-local"
              value={newMatch.starts_at}
              onChange={(e) => setNewMatch({ ...newMatch, starts_at: e.target.value })}
              required
            />
            <select
              value={newMatch.status}
              onChange={(e) => setNewMatch({ ...newMatch, status: e.target.value })}
            >
              <option value="scheduled">예정</option>
              <option value="locked">마감</option>
              <option value="finished">종료</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">경기 등록</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>경기 관리</h2>
        {loading && <div className="loading">불러오는 중...</div>}
        {matches.length === 0 && !loading && <div className="empty-msg">등록된 경기가 없습니다.</div>}
        <div className="admin-matches">
          {matches.map((m) => {
            const pool = pools[m.id] || EMPTY_POOL;
            const total = calcPoolTotal(pool);
            const oddsHome = calcOdds(pool, 'home');
            const oddsDraw = calcOdds(pool, 'draw');
            const oddsAway = calcOdds(pool, 'away');
            const participantCount = pool.count || 0;

            return (
              <div key={m.id} className="admin-match-card">
                <div className="admin-match-title">
                  <strong>{m.home_team} vs {m.away_team}</strong>
                  <span className={`status-badge status-${m.status}`}>{m.status}</span>
                  {m.settled && <span className="status-badge status-settled">정산완료</span>}
                </div>
                <div className="admin-match-time">
                  {new Date(m.starts_at).toLocaleString('ko-KR')}
                </div>

                <div className="pool-stats">
                  <table className="pool-table">
                    <thead>
                      <tr>
                        <th>선택</th>
                        <th>누적 포인트</th>
                        <th>예상 배당</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{m.home_team}</td>
                        <td>{(pool.home || 0).toLocaleString()} pts</td>
                        <td>{oddsHome !== null ? `${oddsHome.toFixed(2)}배` : '-'}</td>
                      </tr>
                      <tr>
                        <td>무승부</td>
                        <td>{(pool.draw || 0).toLocaleString()} pts</td>
                        <td>{oddsDraw !== null ? `${oddsDraw.toFixed(2)}배` : '-'}</td>
                      </tr>
                      <tr>
                        <td>{m.away_team}</td>
                        <td>{(pool.away || 0).toLocaleString()} pts</td>
                        <td>{oddsAway !== null ? `${oddsAway.toFixed(2)}배` : '-'}</td>
                      </tr>
                      <tr className="total-row">
                        <td>전체</td>
                        <td>{total.toLocaleString()} pts</td>
                        <td>참가: {participantCount}명</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {!m.settled && (
                  <div className="admin-actions">
                    <div className="result-btns">
                      <span>결과 입력: </span>
                      {CHOICES.map((r) => (
                        <button
                          key={r}
                          className={`btn-result ${m.result === r ? 'active' : ''}`}
                          onClick={() => handleSetResult(m.id, r)}
                        >
                          {r === 'home' ? m.home_team : r === 'draw' ? '무승부' : m.away_team}
                        </button>
                      ))}
                    </div>

                    <div className="status-btns">
                      <span>상태 변경: </span>
                      {['scheduled', 'locked', 'finished'].map((s) => (
                        <button
                          key={s}
                          className={`btn-status ${m.status === s ? 'active' : ''}`}
                          onClick={() => handleUpdateStatus(m.id, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {m.result && m.status === 'finished' && (
                      <button
                        className="btn-settle"
                        onClick={() => handleSettle(m.id)}
                      >
                        정산 실행
                      </button>
                    )}

                    <button
                      className="btn-delete-match"
                      onClick={() => handleDeleteMatch(m)}
                    >
                      경기 삭제
                    </button>
                  </div>
                )}

                {m.settled && (
                  <div className="settled-notice">이 경기는 정산이 완료되었습니다.</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-section">
        <h2>사용자 포인트 현황</h2>
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>사용자</th>
                <th>포인트</th>
                <th>최종 업데이트</th>
                <th>포인트 지급</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_name}>
                  <td>{u.user_name}</td>
                  <td>{Number(u.points).toLocaleString()} pts</td>
                  <td>{u.updated_at ? new Date(u.updated_at).toLocaleString('ko-KR') : '-'}</td>
                  <td>
                    <form
                      className="grant-points-form"
                      onSubmit={(e) => handleGrantPoints(e, u.user_name)}
                    >
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={grantPoints[u.user_name] || ''}
                        onChange={(e) => setGrantPoints((current) => ({
                          ...current,
                          [u.user_name]: e.target.value,
                        }))}
                        placeholder="지급 포인트"
                        aria-label={`${u.user_name} 지급 포인트`}
                      />
                      <button
                        type="submit"
                        className="btn-grant-points"
                        disabled={grantingUser === u.user_name}
                      >
                        {grantingUser === u.user_name ? '지급 중...' : '지급'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-msg">사용자 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
