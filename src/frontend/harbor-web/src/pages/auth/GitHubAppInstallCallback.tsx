import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function GitHubAppInstallCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusText, setStatusText] = useState('Saving GitHub App installation...');

  useEffect(() => {
    let isMounted = true;

    async function syncInstallation() {
      const installationId = searchParams.get('installation_id');
      const token = localStorage.getItem('harbor_token');
      const authApiBase = import.meta.env.VITE_AUTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      if (installationId && token) {
        try {
          const parsedId = parseInt(installationId, 10);
          if (!isNaN(parsedId)) {
            setStatusText('Connecting GitHub App to your account...');
            await fetch(`${authApiBase}/auth/github/refresh-installation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true',
              },
              body: JSON.stringify({ installationId: parsedId }),
            });

            // Update cached user in localStorage so AccountSettings has the installation ID immediately
            const rawUser = localStorage.getItem('harbor_user');
            if (rawUser) {
              try {
                const u = JSON.parse(rawUser);
                u.githubInstallationId = parsedId;
                localStorage.setItem('harbor_user', JSON.stringify(u));
              } catch (_) {}
            }
          }
        } catch (err) {
          console.error('Failed to sync GitHub installation ID:', err);
        }
      }

      if (isMounted) {
        navigate('/settings', { replace: true });
      }
    }

    void syncInstallation();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5 text-center dark:bg-[oklch(0.21_0.03_263.45)]">
      <p className="text-gray-700 dark:text-gray-300">{statusText}</p>
    </div>
  );
}