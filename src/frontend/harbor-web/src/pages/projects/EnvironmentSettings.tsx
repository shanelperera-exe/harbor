import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject, type Project } from '../../services/projectService';
import { getEnvironments, updateEnvironment, removeEnvironment, type DeploymentEnvironment } from '../../services/environmentService';

export default function EnvironmentSettings() {
  const navigate = useNavigate();
  const { projectId: projectIdStr, envId: envIdStr } = useParams<{ projectId: string, envId: string }>();
  const projectId = Number(projectIdStr);
  const envId = Number(envIdStr);

  const [project, setProject] = useState<Project | null>(null);
  const [environment, setEnvironment] = useState<DeploymentEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('name');

  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(projectId) || !Number.isFinite(envId)) {
      setIsLoading(false);
      return;
    }
    Promise.all([
      getProject(projectId),
      getEnvironments(projectId),
    ])
      .then(([foundProject, envs]) => {
        if (foundProject) setProject(foundProject);
        const foundEnv = envs.find(e => e.id === envId);
        if (foundEnv) {
          setEnvironment(foundEnv);
          setName(foundEnv.name);
        }
      })
      .finally(() => setIsLoading(false));
  }, [projectId, envId]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['name', 'delete-environment'];
      let current = 'name';
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120) current = section;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDeleteModal]);

  async function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !environment || name === environment.name) return;
    setIsSubmitting(true);
    try {
      await updateEnvironment(projectId, envId, {
        name: name.trim(),
        type: environment.type,
      });
      setEnvironment({ ...environment, name: name.trim() });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!environment) return;
    const expected = `sudo delete environment ${environment.name}`;
    if (deleteConfirmText !== expected) return;
    setIsArchiving(true);
    try {
      await removeEnvironment(projectId, envId);
      navigate(`/projects/${projectId}/environments`);
    } catch (err) {
      console.error(err);
      setIsArchiving(false);
    }
  }

  function openDeleteModal() {
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  }

  if (isLoading) {
    return <div className="p-12 text-[#b3b3b3]">Loading...</div>;
  }

  if (!project || !environment) {
    return <div className="p-12 text-red-400">Environment not found</div>;
  }

  const navItems = [
    { id: 'name', label: 'Name' },
    { id: 'delete-environment', label: 'Delete Environment' }
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeSection);
  const indicatorOffset = Math.max(0, activeIndex) * 2.25;
  const deleteConfirmExpected = `sudo delete environment ${environment.name}`;
  const isDeleteConfirmed = deleteConfirmText === deleteConfirmExpected;

  return (
    <div className="w-full lg:max-w-[calc(100vw-294px)] page-primary transition-colors duration-300">
      <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12">
        <div>
          <div className="my-6 md:my-12 flex justify-between">
            <div className="">
              <div className="">
                <h1 className="text-strong" style={{ fontFamily: 'Roobert, sans-serif', fontSize: '32px', fontWeight: 500, lineHeight: '36px', letterSpacing: '-0.32px', WebkitFontSmoothing: 'antialiased' }}>Environment settings</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col xl:flex-row-reverse gap-8">
            <div className="relative flex-shrink-0 hidden xl:block xl:sticky xl:h-full xl:max-h-[calc(100vh_-_3.5rem)] xl:top-14 custom-scrollbar overflow-y-auto">
              <nav aria-labelledby="_r_v_">
                <span id="_r_v_" className="sr-only">Table of contents</span>
                <ul className="relative min-w-[11.5rem] border-l border-solid sidecar-border">
                  <div
                    className="opacity-100 absolute top-0 -left-px w-px h-9 border-l-2 border-solid border-[#3b82f6] motion-safe:transition motion-safe:duration-300 motion-safe:ease-out-cubic"
                    style={{ transform: 'translateY(' + indicatorOffset + 'rem)' }}
                  ></div>
                  {navItems.map(item => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id} className="flex items-center h-9 py-2 pl-4">
                        <a
                          aria-selected={isActive}
                          className={'type-body-02 ' + (isActive ? 'text-[#3b82f6] font-medium' : 'sidecar-text') + ' hover:underline active:no-underline'}
                          href={'#' + item.id}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div className="flex-1 space-y-10">
              {/* Name Section */}
              <div data-id="name" className="scroll-mt-24 xl:scroll-mt-20">
                <div>
                  <div id="name" className="p-6 md:p-8 page-primary border border-solid border-gray-300 dark:border-[#525252] scroll-mt-20">
                    <div className="mb-8">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="">
                            <h4 className="text-strong" style={{ fontFamily: 'Roobert, sans-serif', fontSize: '20px', fontWeight: 600, lineHeight: '28px', letterSpacing: '-0.2px' }}>Name</h4>
                          </div>
                          <div className="type-body-02 text-secondary mt-1 max-w-xl">A unique name for your environment</div>
                        </div>
                        {!isEditing && (
                          <div className="flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsEditing(true)}
                              className="type-interface-01 bg-white text-black hover:bg-gray-100 active:bg-gray-200 border border-solid border-gray-300 dark:border-[#525252] h-8 py-1.5 px-2 flex items-center group/button rounded-sm"
                            >
                              <div className="inline-flex w-4 h-4 me-1.5">
                                <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M15 13H1V14H15V13Z"></path>
                                  <path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path>
                                </svg>
                              </div>
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="type-body-02 text-primary">
                      <form noValidate onSubmit={handleSaveName}>
                        <div className="max-w-[35rem]">
                          <label htmlFor="edit-environment-name-field" className="sr-only">Environment name</label>
                          <div className="flex flex-col">
                            <div className="flex relative">
                              <input
                                id="edit-environment-name-field"
                                className={'h-10 truncate type-interface-01 w-full m-0 py-2.5 px-3 border border-solid rounded-sm appearance-none transition-colors ' + (isEditing ? 'input-background input-text border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b]' : 'input-background--readonly input-text--readonly border-gray-300 dark:border-[#525252] caret-transparent outline-none')}
                                type="text"
                                name="name"
                                readOnly={!isEditing}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        {isEditing && (
                          <div className="mt-8 pt-8 flex justify-end border-t border-solid border-gray-300 dark:border-[#525252]">
                            <div className="inline-flex flex-wrap gap-4">
                              <button
                                type="button"
                                onClick={() => { setName(environment.name); setIsEditing(false); }}
                                className="type-interface-01 button-secondary-text hover:button-secondary-background--hover hover:button-secondary-text--hover active:button-secondary-background--active active:button-secondary-text--hover--active border border-solid button-secondary-border h-10 py-2.5 px-3 flex items-center group/button rounded-sm"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmitting || name === environment.name || !name.trim()}
                                className={'type-interface-01 h-10 py-2.5 px-4 flex items-center group/button transition-colors cursor-pointer rounded-sm disabled:cursor-not-allowed ' + (isSubmitting || name === environment.name || !name.trim() ? 'bg-gray-200 dark:bg-[#272727] text-gray-400 dark:text-[#4d4d4d]' : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1e40af]')}
                              >
                                {isSubmitting ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete Environment Section */}
              <div data-id="delete-environment" className="scroll-mt-24 xl:scroll-mt-20">
                <div>
                  <div id="delete-environment" className="p-6 md:p-8 page-primary border border-solid border-gray-300 dark:border-[#525252] scroll-mt-20">
                    <div className="mb-8">
                      <div className="flex justify-between">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h4 className="text-strong" style={{ fontFamily: 'Roobert, sans-serif', fontSize: '20px', fontWeight: 600, lineHeight: '28px', letterSpacing: '-0.2px' }}>Delete Environment</h4>
                          </div>
                          <div className="type-body-02 text-secondary mt-1 max-w-xl">This environment, including its services, will be permanently deleted. This action cannot be undone.</div>
                        </div>
                      </div>
                    </div>
                    <div className="type-body-02 text-primary">
                      <button
                        type="button"
                        onClick={openDeleteModal}
                        className="type-interface-01 bg-[#e23642] text-white hover:bg-[#c0222d] active:bg-[#a01d27] h-10 py-2.5 px-3 flex items-center group/button transition-colors rounded-sm"
                      >
                        <div className="inline-flex w-4 h-4 me-1.5">
                          <svg fill="currentColor" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 6.66699H6V12.667H7V6.66699Z"></path>
                            <path d="M10 6.66699H9V12.667H10V6.66699Z"></path>
                            <path d="M2 3.66699V4.66699H3V14.667C3 14.9322 3.10536 15.1866 3.29289 15.3741C3.48043 15.5616 3.73478 15.667 4 15.667H12C12.2652 15.667 12.5196 15.5616 12.7071 15.3741C12.8946 15.1866 13 14.9322 13 14.667V4.66699H14V3.66699H2ZM4 14.667V4.66699H12V14.667H4Z"></path>
                            <path d="M10 1.66699H6V2.66699H10V1.66699Z"></path>
                          </svg>
                        </div>
                        Delete environment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/80" onClick={closeDeleteModal} />
          <div className="relative inline-block w-full my-8 text-left align-middle bg-white dark:bg-[oklch(0.21_0.03_263.45)] shadow-lg border border-solid border-gray-300 dark:border-[#525252] max-w-xl rounded-sm">
            {/* Modal Header */}
            <div className="flex flex-col gap-2 items-start border-solid border-b border-gray-300 dark:border-[#525252] p-6 relative">
              <div className="w-full">
                <h1 className="type-heading-05 text-strong mb-1" style={{ fontSize: '24px', fontWeight: 500 }}>Delete environment</h1>
              </div>
              <button
                className="flex p-0 w-5 h-5 items-center justify-center button-compact-icon hover:button-compact-icon--hover active:button-compact-icon--active button-compact-background hover:button-compact-background--hover absolute right-3 top-3 text-[#b3b3b3] hover:text-white"
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
              <div className="type-body-02 text-primary p-6 space-y-4 break-words text-[15px]">
                <div className="flex gap-3 flex-col">
                  <p>
                    This environment will be <span className="font-semibold">permanently</span> deleted, along with all of its services. To keep any services, please move them out of the environment first.
                  </p>
                </div>
                <div>
                  Type{' '}
                  <pre translate="no" lang="en" className="inline">
                    <code className="type-body-02 font-semibold text-[#f0989e]">{deleteConfirmExpected}</code>
                  </pre>{' '}
                  below to confirm.
                </div>
                <div>
                  <label htmlFor="sudo-command" className="sr-only">Sudo Command</label>
                  <div className="flex flex-col">
                    <div className="flex relative">
                      <input
                        data-testid="confirm-delete-field"
                        id="sudo-command"
                        autoComplete="off"
                        spellCheck={false}
                        className="h-10 truncate type-interface-01 w-full m-0 py-2.5 px-3 input-background placeholder:input-text--placeholder border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none input-text outline-none focus:border-[#2563eb]"
                        type="text"
                        name="sudoCommand"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="w-full flex justify-start space-x-2 p-6 border-solid border-t border-gray-300 dark:border-[#525252]">
                <button
                  type="submit"
                  data-testid="confirm-delete-button"
                  disabled={!isDeleteConfirmed || isArchiving}
                  className={'type-interface-01 h-10 py-2.5 px-3 flex items-center group/button transition-colors rounded-sm ' + (isDeleteConfirmed && !isArchiving ? 'bg-[#e23642] text-white hover:bg-[#c0222d] cursor-pointer' : 'bg-[#fad1d3] dark:bg-[#390508] text-[#c0222d] dark:text-[#af1d27] cursor-not-allowed')}
                >
                  {isArchiving ? 'Deleting...' : 'Delete environment'}
                </button>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="type-interface-01 button-secondary-text hover:button-secondary-background--hover hover:button-secondary-text--hover active:button-secondary-background--active active:button-secondary-text--hover--active border border-solid border-gray-300 dark:border-[#525252] h-10 py-2.5 px-3 flex items-center group/button rounded-sm text-[#e3e3e3] hover:text-white hover:bg-[#ffffff1a]"
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
