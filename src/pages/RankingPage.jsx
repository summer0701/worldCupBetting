import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { sortRankings } from '../lib/ranking';

function rankBadge(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getRankings()
      .then((data) => setRankings(sortRankings(data.rankings || [])))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page ranking-page">
      <div className="ranking-hero">
        <span className="ranking-crown">♛</span>
        <div>
          <h1>사용자 순위</h1>
          <p>현재 포인트와 예측 성적을 기준으로 한 전체 순위입니다.</p>
        </div>
      </div>

      {loading && <div className="loading">순위를 불러오는 중...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && rankings.length === 0 && (
        <div className="empty-msg ranking-empty">아직 순위에 표시할 사용자가 없습니다.</div>
      )}

      {!loading && !error && rankings.length > 0 && (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>닉네임</th>
                <th>총 포인트</th>
                <th>맞힌 경기 수</th>
                <th>참여 경기 수</th>
                <th>정답률</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((ranking) => (
                <tr key={ranking.user_name} className={`ranking-row rank-${ranking.rank}`}>
                  <td data-label="순위" className="ranking-position">
                    {rankBadge(ranking.rank)}
                  </td>
                  <td data-label="닉네임" className="ranking-name">
                    <span className="ranking-avatar">♙</span>
                    {ranking.user_name}
                  </td>
                  <td data-label="총 포인트" className="ranking-points">
                    {ranking.points.toLocaleString()} pts
                  </td>
                  <td data-label="맞힌 경기 수">{ranking.correct_count}경기</td>
                  <td data-label="참여 경기 수">{ranking.participation_count}경기</td>
                  <td data-label="정답률">
                    <span className="accuracy-badge">{ranking.accuracy.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ranking-note">
            정답률은 결과가 확정된 경기만 기준으로 계산됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
