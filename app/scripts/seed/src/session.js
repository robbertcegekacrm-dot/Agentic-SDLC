const KEY = 'powerstudios.session';
export const SESSION_MINUTES = 30;

export function login(email) {
  const session = {
    email,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
  };
  sessionStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  sessionStorage.removeItem(KEY);
}

export function getSession() {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  const session = JSON.parse(raw);
  return { ...session, expired: Date.now() >= session.expiresAt };
}
