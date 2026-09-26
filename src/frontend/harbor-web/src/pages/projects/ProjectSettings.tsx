import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RiSaveLine } from 'react-icons/ri';
import { getProject, updateProject, archiveProject, type Project } from '../../services/projectService';
import { getEnvironments, type DeploymentEnvironment } from '../../services/environmentService';
import { getServices, type Service } from '../../services/serviceService';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';

export default function ProjectSettings() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const projectId = id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('name');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    Promise.all([
      getProject(projectId),
      getEnvironments(projectId),
      getServices(projectId),
    ])
      .then(([found, envs, svcs]) => {
        if (found) {
          setProject(found);
          setName(found.name);
          setDescription(found.description || '');
        }
        setEnvironments(envs);
        setServices(svcs);
      })
      .finally(() => setIsLoading(false));
  }, [projectId]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['name', 'delete-project'];
      let current = 'name';
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120) current = section;
        }
      }
      
      const scrollContainer = document.querySelector('main.overflow-auto') || document.documentElement;
      const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight;
      const isAtBottom = isScrollable && Math.round(scrollContainer.scrollTop + scrollContainer.clientHeight) >= scrollContainer.scrollHeight - 10;
      
      if (isAtBottom && scrollContainer.scrollTop > 0) {
        current = sections[sections.length - 1];
      }
      
      setActiveSection(current);
    };
    
    const scrollContainerElement = document.querySelector('main.overflow-auto') || window;
    scrollContainerElement.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => scrollContainerElement.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDeleteModal]);

  async function handleSaveField(field: 'name' | 'description') {
    if (!project) return;
    
    const newName = name.trim();
    const newDescription = description.trim();
    
    if (field === 'name' && (!newName || newName === project.name)) return;
    if (field === 'description' && newDescription === (project.description || '')) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await updateProject(projectId, {
        name: field === 'name' ? newName : project.name,
        description: field === 'description' ? newDescription : (project.description || ''),
        repositoryUrl: project.repositoryUrl ?? undefined,
      });
      setProject({ 
        ...project, 
        name: field === 'name' ? newName : project.name,
        description: field === 'description' ? newDescription : (project.description || '')
      });
      if (field === 'name') setIsEditingName(false);
      if (field === 'description') setIsEditingDescription(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update project.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const expected = `delete project ${project.name}`;
    if (deleteConfirmText !== expected) return;
    setIsArchiving(true);
    try {
      await archiveProject(projectId);
      navigate('/projects');
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

  if (!project) {
    return <div className="p-12 text-red-400">Project not found</div>;
  }

  const navItems = [
    { id: 'name', label: 'Project Name' },
    { id: 'delete-project', label: 'Delete Project' }
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeSection);
  const indicatorOffset = Math.max(0, activeIndex) * 2.75; 
  const deleteConfirmExpected = `delete project ${project.name}`;

  return (
    <div className="w-full lg:max-w-[calc(100vw-294px)]">
      <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12">
        <div>
          <div className="my-6 md:my-12 flex justify-between">
            <div className="">
              <div className="">
                <h1 className="text-[36px] font-[500] leading-[40px] tracking-[-0.32px] text-strong text-gray-900 dark:text-white" style={{ fontFamily: 'Roobert, sans-serif' }}>Project settings</h1>
              </div>
            </div>
          </div>
          
          <div className="flex flex-row-reverse gap-8">
            <div className="relative flex-shrink-0 hidden xl:block xl:sticky xl:h-full xl:max-h-[calc(100vh_-_3.5rem)] xl:top-14 custom-scrollbar overflow-y-auto">
              <nav aria-labelledby="_r_3f_">
                <span id="_r_3f_" className="sr-only">Table of contents</span>
                <ul className="relative min-w-[12rem] border-l border-solid border-gray-300 dark:border-[#525252]">
                  <div 
                    className="opacity-100 absolute top-3 -left-px w-[2px] h-5 bg-blue-600 dark:bg-blue-500 rounded-full motion-safe:transition motion-safe:duration-300 motion-safe:ease-out-cubic" 
                    style={{ transform: `translateY(${indicatorOffset}rem)` }}
                  ></div>
                  {navItems.map(item => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id} className="flex items-center h-11 py-2 pl-5">
                        <a 
                          aria-selected={isActive} 
                          className={`text-[18px] font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#a1a1aa]'} hover:text-gray-800 dark:hover:text-[#e3e3e3] transition-colors`} 
                          href={`#${item.id}`}
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
              <div data-id="profile" className="scroll-mt-24 xl:scroll-mt-20">
                <div>
                  <div className="p-6 md:p-8 page-primary border border-solid border-gray-300 dark:border-[#525252] scroll-mt-20 rounded-sm">
                    <div className="mb-8">
                      <div className="flex justify-between small:items-center">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h2 className="text-[26px] font-[500] leading-[32px] tracking-[-0.24px] text-strong text-gray-900 dark:text-[#f0f0f0]" style={{ fontFamily: 'Roobert, sans-serif' }}>General</h2>
                            {error && (
                              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="type-body-02 text-primary">
                      <div className="flex gap-8 flex-col">
                        
                        <div id="name" className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10 scroll-mt-24">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="name" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Project name</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <form noValidate onSubmit={(e) => { e.preventDefault(); void handleSaveField('name'); }}>
                                <div className="flex flex-col">
                                  <div className="flex relative">
                                    <input 
                                      id="name" 
                                      readOnly={!isEditingName} 
                                      className={`h-10 truncate type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none outline-none transition-colors ${
                                        isEditingName 
                                          ? "bg-transparent text-primary focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] text-gray-900 dark:text-white" 
                                          : "bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-gray-300 caret-transparent"
                                      }`}
                                      type="text" 
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                      name="name" 
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                  {isEditingName ? (
                                    <div className="flex items-center gap-3">
                                      <button type="button" onClick={() => { setIsEditingName(false); setName(project.name); }} className="h-10 py-2.5 px-3 flex items-center border border-solid border-gray-300 dark:border-[#525252] hover:bg-gray-100 dark:hover:bg-[#272727] text-gray-900 dark:text-[#f0f0f0] rounded-sm transition-colors">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSubmitting || name.trim() === project.name || !name.trim()} className="h-10 py-2.5 px-4 flex items-center space-x-2 rounded-sm font-medium text-black bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        <RiSaveLine className="w-5 h-5" />
                                        <span>Save changes</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingName(true)} className="h-10 py-2.5 px-3 flex items-center group/button rounded-sm text-gray-700 dark:text-[#c7c7c7] hover:bg-gray-100 dark:hover:bg-[#272727] hover:text-gray-900 dark:hover:text-white transition-colors" >
                                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg></div>
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="description" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Project description</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <form noValidate onSubmit={(e) => { e.preventDefault(); void handleSaveField('description'); }}>
                                <div className="flex flex-col">
                                  <div className="flex relative">
                                    <textarea 
                                      id="description" 
                                      readOnly={!isEditingDescription} 
                                      rows={4}
                                      className={`min-h-[100px] type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none outline-none transition-colors resize-y ${
                                        isEditingDescription 
                                          ? "bg-transparent text-primary focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] text-gray-900 dark:text-white" 
                                          : "bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-gray-300 caret-transparent"
                                      }`}
                                      value={description}
                                      onChange={(e) => setDescription(e.target.value)}
                                      name="description" 
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                  {isEditingDescription ? (
                                    <div className="flex items-center gap-3">
                                      <button type="button" onClick={() => { setIsEditingDescription(false); setDescription(project.description || ''); }} className="h-10 py-2.5 px-3 flex items-center border border-solid border-gray-300 dark:border-[#525252] hover:bg-gray-100 dark:hover:bg-[#272727] text-gray-900 dark:text-[#f0f0f0] rounded-sm transition-colors">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSubmitting || description.trim() === (project.description || '')} className="h-10 py-2.5 px-4 flex items-center space-x-2 rounded-sm font-medium text-black bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        <RiSaveLine className="w-5 h-5" />
                                        <span>Save changes</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingDescription(true)} className="h-10 py-2.5 px-3 flex items-center group/button rounded-sm text-gray-700 dark:text-[#c7c7c7] hover:bg-gray-100 dark:hover:bg-[#272727] hover:text-gray-900 dark:hover:text-white transition-colors" >
                                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg></div>
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="delete-project" className="scroll-mt-24 xl:scroll-mt-20 mt-12 pt-8 border-t border-gray-300 dark:border-[#525252]">
                <div className="flex flex-col gap-2 mb-6">
                  <h2 className="text-[26px] font-[500] leading-[32px] tracking-[-0.24px] text-gray-900 dark:text-[#f0f0f0]" style={{ fontFamily: 'Roobert, sans-serif' }}>Danger Zone</h2>
                </div>
                <div className="border border-red-500 dark:border-red-600/50 rounded-sm overflow-hidden">
                  <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[oklch(0.21_0.03_263.45)]">
                    <div>
                      <h4 className="text-[16px] font-medium text-gray-900 dark:text-[#f0f0f0]">Delete Project</h4>
                      <p className="text-[14px] text-gray-500 dark:text-[#b3b3b3] mt-1">Once you delete your project, there is no going back. Please be certain.</p>
                    </div>
                    <button type="button" onClick={openDeleteModal} className="bg-[#e23642] hover:bg-[#c0222d] text-white transition-colors h-10 py-2.5 px-3 flex items-center group/button rounded-sm whitespace-nowrap shrink-0 font-medium">
                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M7 6.66699H6V12.667H7V6.66699Z"></path><path d="M10 6.66699H9V12.667H10V6.66699Z"></path><path d="M2 3.66699V4.66699H3V14.667C3 14.9322 3.10536 15.1866 3.29289 15.3741C3.48043 15.5616 3.73478 15.667 4 15.667H12C12.2652 15.667 12.5196 15.5616 12.7071 15.3741C12.8946 15.1866 13 14.9322 13 14.667V4.66699H14V3.66699H2ZM4 14.667V4.66699H12V14.667H4Z"></path><path d="M10 1.66699H6V2.66699H10V1.66699Z"></path></svg></div>
                      Delete Project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        warningMessage={
          <>
            <p>This project <span className="font-bold">{project.name}</span> will be <span className="font-bold underline">permanently deleted</span>, along with all of its environments and services.</p>
            <p className="mt-2">To keep any services, please move them out of the project first.</p>
          </>
        }
        expectedConfirmText={deleteConfirmExpected}
        confirmText={deleteConfirmText}
        setConfirmText={setDeleteConfirmText}
        isDeleting={isArchiving}
        deleteButtonLabel="Delete project"
      >
        {environments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {environments.map((env) => (
              <div key={env.id} className="p-3 border border-gray-300 dark:border-[#525252] rounded-sm bg-gray-50 dark:bg-white/[0.03]">
                <div className="flex items-center text-gray-900 dark:text-white font-medium mb-1 truncate">
                  <svg fill="currentColor" aria-hidden="true" className="shrink-0 size-4 mr-2 text-gray-700 dark:text-gray-300" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
                  {env.name}
                </div>
                <div className="text-gray-500 dark:text-[#a1a1aa] text-[13px] ml-6">{services.length} {services.length === 1 ? 'service' : 'services'}</div>
              </div>
            ))}
          </div>
        )}
      </DeleteConfirmationModal>
    </div>
  );
}
