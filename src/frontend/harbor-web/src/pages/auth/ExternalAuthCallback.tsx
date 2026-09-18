import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ExternalAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const externalError = searchParams.get('error');
    const token = searchParams.get('token');
    if (externalError || !token) {
      setError(externalError || 'External login failed.');
      return;
    }

    localStorage.setItem('harbor_token', token);
    localStorage.setItem('harbor_user', JSON.stringify({
      username: searchParams.get('username') || '',
      email: searchParams.get('email') || '',
      role: searchParams.get('role') || 'User',
      avatarSvg: searchParams.get('avatarSvg') || null,
    }));
    window.dispatchEvent(new Event('storage'));
    navigate('/projects', { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5 text-center dark:bg-[#090909]">
      {error ? (
        <div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button type="button" onClick={() => navigate('/login')} className="mt-4 border border-gray-400 px-4 py-2 text-sm text-gray-900 dark:text-white">Return to sign in</button>
        </div>
      ) : (
        <p className="text-gray-700 dark:text-gray-300">Signing you in to Harbor...</p>
      )}
    </div>
  );
}
