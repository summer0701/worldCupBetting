const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

async function call(action, params = {}) {
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export const api = {
  getMatches: () => call('getMatches'),
  createMatch: (payload, adminPassword) =>
    call('createMatch', { ...payload, adminPassword }),
  updateMatchStatus: (matchId, status, adminPassword) =>
    call('createMatch', { id: matchId, status, _update: true, adminPassword }),
  updateMatchResult: (matchId, result, adminPassword) =>
    call('updateMatchResult', { matchId, result, adminPassword }),
  submitPrediction: (matchId, userName, choice, points) =>
    call('submitPrediction', { matchId, userName, choice, points }),
  getPredictionsByUser: (userName) =>
    call('getPredictionsByUser', { userName }),
  getMatchPool: (matchId) => call('getMatchPool', { matchId }),
  settleMatch: (matchId, adminPassword) =>
    call('settleMatch', { matchId, adminPassword }),
  getUsers: (adminPassword) => call('getUsers', { adminPassword }),
};
