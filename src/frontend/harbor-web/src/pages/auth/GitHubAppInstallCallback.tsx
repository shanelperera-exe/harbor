import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function GitHubAppInstallCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action');

    if (installationId) {
      console.log('GitHub App installed:', installationId, setupAction);
    }

    navigate('/settings', { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5 text-center dark:bg-[oklch(0.21_0.03_263.45)]">
      <p className="text-gray-700 dark:text-gray-300">GitHub App installed. Redirecting to settings...</p>
    </div>
  );
}