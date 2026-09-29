export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  try {
    const payload = token.split('.')[1];
    if (!payload) return true;

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp !== 'number' || decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function clearAuthSession() {
  localStorage.removeItem('harbor_token');
  localStorage.removeItem('harbor_user');
  window.dispatchEvent(new Event('storage'));
}