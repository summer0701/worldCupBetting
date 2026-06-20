const APPS_SCRIPT_URL = normalizeAppsScriptUrl(import.meta.env.VITE_APPS_SCRIPT_URL || '');
let jsonpRequestId = 0;

export function normalizeAppsScriptUrl(url) {
  return String(url || '').trim().replace(/\/macros\/u\/\d+\/s\//, '/macros/s/');
}

async function call(action, params = {}) {
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }

  return callJsonp(action, params);
}

function callJsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `__worldCupPredictionApi_${Date.now()}_${jsonpRequestId++}`;
    const script = document.createElement('script');
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Apps Script API 응답 시간이 초과되었습니다.'));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (data) => {
      cleanup();
      if (data?.error) {
        reject(new Error(data.error));
        return;
      }
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(
        'Apps Script API를 불러오지 못했습니다. Web App 배포 권한을 "Anyone"으로 설정했는지, 배포 URL이 https://script.google.com/macros/s/.../exec 형식인지 확인하세요.',
      ));
    };

    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('payload', JSON.stringify(params));
    url.searchParams.set('callback', callbackName);
    script.src = url.toString();

    document.head.appendChild(script);
  });
}

export const api = {
  getMatches: () => call('getMatches'),
  createMatch: (payload, adminPassword) =>
    call('createMatch', { ...payload, adminPassword }),
  deleteMatch: (matchId, adminPassword) =>
    call('deleteMatch', { matchId, adminPassword }),
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
