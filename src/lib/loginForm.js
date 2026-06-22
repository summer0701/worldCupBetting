export function normalizeLoginCredentials(userName, userPassword) {
  const name = String(userName || '').trim();
  const password = String(userPassword || '').trim();

  return {
    name,
    password,
    isComplete: Boolean(name && password),
  };
}
