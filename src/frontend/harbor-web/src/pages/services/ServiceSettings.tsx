import { Settings as SettingsIcon } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function ServiceSettings() {
  const { projectId, serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workflowFile, setWorkflowFile] = useState('deploy.yml');
  const [buildCommand, setBuildCommand] = useState('');
  const [startCommand, setStartCommand] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadService() {
      try {
        const token = localStorage.getItem('harbor_token');
        if (!token) return;
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const json = await res.json();
          const svc = json.data;
          setService(svc);
          setWorkflowFile(svc.workflowFile || 'deploy.yml');
          setBuildCommand(svc.buildCommand || '');
          setStartCommand(svc.startCommand || '');
        }
      } catch (err) {
        console.error('Failed to load service:', err);
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [projectId, serviceId]);

  const handleSave = async () => {
    const token = localStorage.getItem('harbor_token');
    if (!token) return;
    setSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          workflowFile: workflowFile.trim() || 'deploy.yml',
          buildCommand: buildCommand.trim(),
          startCommand: startCommand.trim()
        })
      });
      if (!res.ok) {
        throw new Error('Failed to save');
      }
      // Refresh service data
      const json = await res.json();
      setService(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  function openDeleteModal() {
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  }

  const deleteConfirmExpected = 'delete service ' + (service?.name || '');
  const isDeleteConfirmed = deleteConfirmText === deleteConfirmExpected;

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeleteConfirmed || deleting) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('harbor_token');
      if (!token) return;
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to delete service');
      }
      closeDeleteModal();
      navigate(`/projects/${projectId}/environments`, { replace: true });
    } catch (err) {
      console.error('Failed to delete service:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading service settings...</div>;
  }

  if (!service) {
    return <div className="p-12 text-center text-red-500">Service not found</div>;
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20 space-y-8">
      <div className="flex items-center gap-2 border-b border-gray-300 dark:border-[#525252] pb-4">
        <SettingsIcon className="w-5 h-5 text-gray-500" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">Settings</h2>
      </div>

      {/* General Settings Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-[#f0f0f0]">General</h3>
        <div className="grid gap-6 p-6 border border-gray-300 dark:border-[#525252] rounded-md bg-white dark:bg-[#141414]">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[#cccccc]">Service Name</label>
            <input 
              type="text" 
              className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white" 
              value={service.name}
              onChange={e => setService({ ...service, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[#cccccc]">GitHub Actions Workflow File</label>
            <input 
              type="text" 
              className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-sm" 
              placeholder="deploy.yml" 
              value={workflowFile} 
              onChange={e => setWorkflowFile(e.target.value)} 
            />
            <p className="text-xs text-gray-500 dark:text-[#8f8f8f]">The workflow file in .github/workflows that accepts workflow_dispatch (e.g., deploy.yml)</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[#cccccc]">Build Command</label>
            <input 
              type="text" 
              className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-sm" 
              placeholder="e.g. npm run build" 
              value={buildCommand}
              onChange={e => setBuildCommand(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[#cccccc]">Start Command</label>
            <input 
              type="text" 
              className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-sm" 
              placeholder="e.g. npm start" 
              value={startCommand}
              onChange={e => setStartCommand(e.target.value)}
            />
          </div>
          <div className="pt-2">
            <button onClick={handleSave} disabled={saving} className="h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-sm transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-red-600 dark:text-red-500">Danger Zone</h3>
        <div className="p-6 border border-red-200 dark:border-[#4c1d1d] rounded-md bg-red-50 dark:bg-[#1f0f0f]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-[#f0f0f0]">Delete Service</h4>
              <p className="text-sm text-gray-600 dark:text-[#a3a3a3] mt-1">Once you delete a service, there is no going back. Please be certain.</p>
            </div>
            <button 
              onClick={openDeleteModal}
              className="h-10 px-4 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 font-medium rounded-sm transition-colors"
            >
              Delete Service
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/80" onClick={closeDeleteModal} />
          <div className="relative inline-block w-full my-8 text-left align-middle bg-white dark:bg-[#141414] shadow-lg border border-solid border-gray-300 dark:border-[#525252] max-w-2xl">
            {/* Modal Header */}
            <div className="flex flex-col gap-2 items-start border-solid border-b border-gray-300 dark:border-[#525252] p-6 relative">
              <div className="w-full">
                <h1 className="text-xl font-medium text-gray-900 dark:text-white">Delete Service</h1>
              </div>
              <button
                className="flex p-0 w-5 h-5 items-center justify-center hover:bg-gray-100 dark:hover:bg-[#272727] rounded-sm absolute right-3 top-3"
                type="button"
                aria-label="Close modal"
                onClick={closeDeleteModal}
              >
                <svg fill="currentColor" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4.7L11.3 4L8 7.3L4.7 4L4 4.7L7.3 8L4 11.3L4.7 12L8 8.7L11.3 12L12 11.3L8.7 8L12 4.7Z"></path>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form noValidate id="confirm-delete" onSubmit={handleConfirmDelete}>
              <div className="text-sm text-gray-700 dark:text-gray-300 p-6 space-y-4 break-words">
                <p>
                  This service <span className="font-semibold">{service.name}</span> will be{' '}
                  <span className="font-semibold">permanently</span> deleted, along with all of its
                  deployments and logs. This action cannot be undone.
                </p>

                <div>
                  Type{' '}
                  <pre translate="no" lang="en" className="inline">
                    <code className="font-semibold text-red-600 dark:text-red-400">{deleteConfirmExpected}</code>
                  </pre>{' '}
                  below to confirm.
                </div>
                <div>
                  <label htmlFor="sudo-command" className="sr-only">Confirm Delete</label>
                  <div className="flex flex-col">
                    <div className="flex relative">
                      <input
                        id="sudo-command"
                        autoComplete="off"
                        spellCheck={false}
                        className="h-10 truncate w-full m-0 py-2.5 px-3 bg-white dark:bg-[#1a1a1a] border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none text-gray-900 dark:text-white outline-none focus:border-[#2563eb]"
                        type="text"
                        name="sudoCommand"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={deleteConfirmExpected}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="w-full flex justify-start space-x-2 p-6 border-solid border-t border-gray-300 dark:border-[#525252]">
                <button
                  type="submit"
                  disabled={!isDeleteConfirmed || deleting}
                  className={'h-10 py-2.5 px-3 flex items-center transition-colors rounded-sm font-medium ' + (isDeleteConfirmed && !deleting ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 cursor-not-allowed')}
                >
                  {deleting ? 'Deleting...' : 'Delete service'}
                </button>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="h-10 py-2.5 px-3 flex items-center transition-colors rounded-sm font-medium border border-solid border-gray-300 dark:border-[#525252] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}