const SHEETS = {
  matches: ['id', 'home_team', 'away_team', 'starts_at', 'status', 'result', 'settled', 'created_at'],
  predictions: ['id', 'match_id', 'user_name', 'choice', 'points', 'created_at', 'payout', 'settled'],
  users: ['user_name', 'points', 'updated_at'],
  audit_logs: ['id', 'action', 'payload_json', 'created_at'],
};

const CHOICES = ['home', 'draw', 'away'];
const MATCH_STATUSES = ['scheduled', 'locked', 'finished'];
const DEFAULT_STARTING_POINTS = 1000;

function doPost(e) {
  try {
    const payload = parseJsonPayload(e && e.postData && e.postData.contents);
    const action =
      (e && e.parameter && e.parameter.action) ||
      payload.action ||
      '';

    return jsonResponse(handleAction(action, payload));
  } catch (error) {
    return jsonResponse({ error: error.message });
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || '';
    const callback = params.callback || '';
    const payload = parseJsonPayload(params.payload);
    const result = action
      ? handleAction(action, payload)
      : { ok: true, message: 'World Cup virtual points prediction API' };

    return callback ? jsonpResponse(callback, result) : jsonResponse(result);
  } catch (error) {
    const callback = e && e.parameter && e.parameter.callback;
    const result = { error: error.message };
    return callback ? jsonpResponse(callback, result) : jsonResponse(result);
  }
}

function handleAction(action, payload) {
  setupSheets();

  const handlers = {
    getMatches,
    createMatch,
    deleteMatch,
    updateMatchResult,
    submitPrediction,
    getPredictionsByUser,
    getMatchPool,
    settleMatch,
    getUsers,
  };

  if (!handlers[action]) {
    throw new Error('지원하지 않는 action입니다.');
  }

  return handlers[action](payload);
}

function setupSheets() {
  const spreadsheet = getSpreadsheet();

  Object.keys(SHEETS).forEach((sheetName) => {
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }

    const headers = SHEETS[sheetName];
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const shouldWriteHeaders = headers.some((header, index) => currentHeaders[index] !== header);

    if (shouldWriteHeaders) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });
}

function getMatches() {
  return {
    matches: readRows('matches').sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)),
  };
}

function createMatch(payload) {
  requireAdmin(payload.adminPassword);

  if (payload._update) {
    const status = requireOneOf(payload.status, MATCH_STATUSES, '상태');
    updateRow('matches', 'id', requireText(payload.id, '경기 ID'), { status });
    writeAudit('updateMatchStatus', payload);
    return { ok: true };
  }

  const match = {
    id: payload.id ? String(payload.id).trim() : Utilities.getUuid(),
    home_team: requireText(payload.home_team, '홈팀'),
    away_team: requireText(payload.away_team, '원정팀'),
    starts_at: requireText(payload.starts_at, '경기 시작 시간'),
    status: requireOneOf(payload.status || 'scheduled', MATCH_STATUSES, '상태'),
    result: '',
    settled: false,
    created_at: new Date().toISOString(),
  };

  if (findRow('matches', 'id', match.id)) {
    throw new Error('이미 존재하는 경기 ID입니다.');
  }

  appendRow('matches', match);
  writeAudit('createMatch', match);

  return { ok: true, match };
}

function updateMatchResult(payload) {
  requireAdmin(payload.adminPassword);

  const matchId = requireText(payload.matchId, '경기 ID');
  const result = requireOneOf(payload.result, CHOICES, '경기 결과');

  updateRow('matches', 'id', matchId, { result, status: 'finished' });
  writeAudit('updateMatchResult', { matchId, result });

  return { ok: true };
}

function deleteMatch(payload) {
  requireAdmin(payload.adminPassword);

  const matchId = requireText(payload.matchId, '경기 ID');
  const matchRow = readRowsWithIndex('matches').find(({ row }) => {
    return String(row.id) === matchId;
  });

  if (!matchRow) {
    throw new Error('경기를 찾을 수 없습니다.');
  }

  if (toBoolean(matchRow.row.settled)) {
    throw new Error('정산이 완료된 경기는 삭제할 수 없습니다.');
  }

  const predictionRows = readRowsWithIndex('predictions').filter(({ row }) => {
    return String(row.match_id) === matchId;
  });

  predictionRows.forEach(({ row }) => {
    const user = getOrCreateUser(row.user_name);

    updateRow('users', 'user_name', row.user_name, {
      points: Number(user.points) + (Number(row.points) || 0),
      updated_at: new Date().toISOString(),
    });
  });

  deleteRows('predictions', predictionRows.map(({ rowNumber }) => rowNumber));
  getSheet('matches').deleteRow(matchRow.rowNumber);

  writeAudit('deleteMatch', {
    matchId,
    refundedPredictionsCount: predictionRows.length,
  });

  return {
    ok: true,
    refundedPredictionsCount: predictionRows.length,
  };
}

function submitPrediction(payload) {
  const matchId = requireText(payload.matchId, '경기 ID');
  const userName = normalizeUserName(payload.userName);
  const choice = requireOneOf(payload.choice, CHOICES, '예측');
  const points = requirePositiveInteger(payload.points, '포인트');

  const match = findRow('matches', 'id', matchId);

  if (!match) {
    throw new Error('경기를 찾을 수 없습니다.');
  }

  if (match.status !== 'scheduled') {
    throw new Error('예측이 마감된 경기입니다.');
  }

  if (new Date(match.starts_at).getTime() <= Date.now()) {
    throw new Error('경기 시작 시간이 지나 예측할 수 없습니다.');
  }

  const duplicate = readRows('predictions').find((prediction) =>
    prediction.match_id === matchId && prediction.user_name === userName
  );

  if (duplicate) {
    throw new Error('이미 이 경기에 예측을 제출했습니다.');
  }

  const user = getOrCreateUser(userName);

  if (Number(user.points) < points) {
    throw new Error('포인트가 부족합니다.');
  }

  updateRow('users', 'user_name', userName, {
    points: Number(user.points) - points,
    updated_at: new Date().toISOString(),
  });

  const prediction = {
    id: Utilities.getUuid(),
    match_id: matchId,
    user_name: userName,
    choice,
    points,
    created_at: new Date().toISOString(),
    payout: 0,
    settled: false,
  };

  appendRow('predictions', prediction);
  writeAudit('submitPrediction', prediction);

  return { ok: true, prediction };
}

function getPredictionsByUser(payload) {
  const userName = normalizeUserName(payload.userName);
  const matchesById = toMap(readRows('matches'), 'id');

  const predictions = readRows('predictions')
    .filter((prediction) => prediction.user_name === userName)
    .map((prediction) => {
      const match = matchesById[prediction.match_id] || {};

      return Object.assign({}, prediction, {
        home_team: match.home_team || '',
        away_team: match.away_team || '',
        result: match.result || '',
      });
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    predictions,
    user: getOrCreateUser(userName),
  };
}

function getMatchPool(payload) {
  const matchId = requireText(payload.matchId, '경기 ID');
  const pool = { home: 0, draw: 0, away: 0, count: 0 };

  readRows('predictions').forEach((prediction) => {
    if (prediction.match_id !== matchId || !CHOICES.includes(prediction.choice)) {
      return;
    }

    pool[prediction.choice] += Number(prediction.points) || 0;
    pool.count += 1;
  });

  return { pool };
}

function settleMatch(payload) {
  requireAdmin(payload.adminPassword);

  const matchId = requireText(payload.matchId, '경기 ID');
  const match = findRow('matches', 'id', matchId);

  if (!match) {
    throw new Error('경기를 찾을 수 없습니다.');
  }

  if (toBoolean(match.settled)) {
    throw new Error('이미 정산된 경기입니다.');
  }

  if (!CHOICES.includes(match.result)) {
    throw new Error('경기 결과를 먼저 입력하세요.');
  }

  const predictions = readRows('predictions').filter((prediction) => prediction.match_id === matchId);

  const total = predictions.reduce((sum, prediction) => {
    return sum + (Number(prediction.points) || 0);
  }, 0);

  const winners = predictions.filter((prediction) => prediction.choice === match.result);

  const winnerTotal = winners.reduce((sum, prediction) => {
    return sum + (Number(prediction.points) || 0);
  }, 0);

  const payoutsByPredictionId = {};

  if (total > 0 && winnerTotal > 0) {
    winners.forEach((prediction) => {
      payoutsByPredictionId[prediction.id] = Math.floor(
        (Number(prediction.points) / winnerTotal) * total
      );
    });
  }

  const predictionsSheet = getSheet('predictions');
  const predictionRows = readRowsWithIndex('predictions');

  predictionRows.forEach(({ row, rowNumber }) => {
    if (row.match_id !== matchId) {
      return;
    }

    const payout = payoutsByPredictionId[row.id] || 0;

    setRowValues(predictionsSheet, 'predictions', rowNumber, {
      payout,
      settled: true,
    });

    if (payout > 0) {
      const user = getOrCreateUser(row.user_name);

      updateRow('users', 'user_name', row.user_name, {
        points: Number(user.points) + payout,
        updated_at: new Date().toISOString(),
      });
    }
  });

  updateRow('matches', 'id', matchId, {
    settled: true,
    status: 'finished',
  });

  writeAudit('settleMatch', {
    matchId,
    winnersCount: winners.length,
  });

  return {
    ok: true,
    winnersCount: winners.length,
  };
}

function getUsers(payload) {
  requireAdmin(payload.adminPassword);

  return {
    users: readRows('users').sort((a, b) => Number(b.points) - Number(a.points)),
  };
}

function getOrCreateUser(userName) {
  const existingUser = findRow('users', 'user_name', userName);

  if (existingUser) {
    return existingUser;
  }

  const user = {
    user_name: userName,
    points: DEFAULT_STARTING_POINTS,
    updated_at: new Date().toISOString(),
  };

  appendRow('users', user);

  return user;
}

function requireAdmin(adminPassword) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');

  if (!expected) {
    throw new Error('ADMIN_PASSWORD 스크립트 속성을 설정하세요.');
  }

  if (String(adminPassword || '') !== expected) {
    throw new Error('관리자 비밀번호가 올바르지 않습니다.');
  }
}

function requireText(value, label) {
  const text = String(value || '').trim();

  if (!text) {
    throw new Error(`${label}을(를) 입력하세요.`);
  }

  return text;
}

function normalizeUserName(value) {
  const userName = requireText(value, '사용자 이름').replace(/\s+/g, ' ');

  if (userName.length > 30) {
    throw new Error('사용자 이름은 30자 이하로 입력하세요.');
  }

  return userName;
}

function requireOneOf(value, allowedValues, label) {
  const normalized = String(value || '').trim();

  if (!allowedValues.includes(normalized)) {
    throw new Error(`${label} 값이 올바르지 않습니다.`);
  }

  return normalized;
}

function requirePositiveInteger(value, label) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${label}는 1 이상의 정수여야 합니다.`);
  }

  return number;
}

function getSpreadsheet() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');

  if (!sheetId) {
    throw new Error(
      'SHEET_ID 스크립트 속성을 설정하세요. 웹앱에서는 SpreadsheetApp.getActiveSpreadsheet()에 의존하지 않는 것이 안전합니다.'
    );
  }

  return SpreadsheetApp.openById(sheetId);
}

function getSheet(sheetName) {
  return getSpreadsheet().getSheetByName(sheetName);
}

function readRows(sheetName) {
  return readRowsWithIndex(sheetName).map(({ row }) => row);
}

function readRowsWithIndex(sheetName) {
  const sheet = getSheet(sheetName);
  const headers = SHEETS[sheetName];
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .map((values, index) => ({
      row: rowFromValues(headers, values),
      rowNumber: index + 2,
    }));
}

function rowFromValues(headers, values) {
  return headers.reduce((row, header, index) => {
    row[header] = values[index];
    return row;
  }, {});
}

function appendRow(sheetName, row) {
  const headers = SHEETS[sheetName];
  getSheet(sheetName).appendRow(headers.map((header) => normalizeCellValue(row[header])));
}

function findRow(sheetName, key, value) {
  const found = readRows(sheetName).find((row) => String(row[key]) === String(value));
  return found || null;
}

function updateRow(sheetName, key, value, updates) {
  const sheet = getSheet(sheetName);

  const found = readRowsWithIndex(sheetName).find(({ row }) => {
    return String(row[key]) === String(value);
  });

  if (!found) {
    throw new Error('수정할 행을 찾을 수 없습니다.');
  }

  setRowValues(sheet, sheetName, found.rowNumber, updates);
}

function deleteRows(sheetName, rowNumbers) {
  const sheet = getSheet(sheetName);

  rowNumbers
    .slice()
    .sort((a, b) => b - a)
    .forEach((rowNumber) => sheet.deleteRow(rowNumber));
}

function setRowValues(sheet, sheetName, rowNumber, updates) {
  const headers = SHEETS[sheetName];

  Object.keys(updates).forEach((key) => {
    const columnIndex = headers.indexOf(key);

    if (columnIndex === -1) {
      return;
    }

    sheet.getRange(rowNumber, columnIndex + 1).setValue(normalizeCellValue(updates[key]));
  });
}

function toMap(rows, key) {
  return rows.reduce((map, row) => {
    map[row[key]] = row;
    return map;
  }, {});
}

function toBoolean(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function normalizeCellValue(value) {
  return value === undefined || value === null ? '' : value;
}

function parseJsonPayload(rawPayload) {
  if (!rawPayload) {
    return {};
  }

  try {
    return JSON.parse(rawPayload);
  } catch (error) {
    throw new Error('payload JSON 형식이 올바르지 않습니다.');
  }
}

function writeAudit(action, payload) {
  appendRow('audit_logs', {
    id: Utilities.getUuid(),
    action,
    payload_json: JSON.stringify(payload),
    created_at: new Date().toISOString(),
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(callback, data) {
  const safeCallback = String(callback).replace(/[^\w.$]/g, '');

  if (!safeCallback) {
    return jsonResponse({ error: 'callback 값이 올바르지 않습니다.' });
  }

  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(data)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
