import React, { useEffect } from 'react';
import { LuCircleAlert } from 'react-icons/lu';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (e: React.FormEvent<HTMLFormElement>) => void;
  title: string;
  warningMessage: React.ReactNode;
  expectedConfirmText: string;
  confirmText: string;
  setConfirmText: (text: string) => void;
  isDeleting: boolean;
  deleteButtonLabel?: string;
  children?: React.ReactNode;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  warningMessage,
  expectedConfirmText,
  confirmText,
  setConfirmText,
  isDeleting,
  deleteButtonLabel = 'Delete',
  children
}: DeleteConfirmationModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const isDeleteConfirmed = confirmText === expectedConfirmText;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { onClose(); } }}>
      <div className="inline-block w-full text-left align-middle transform page-primary bg-white dark:bg-[oklch(0.21_0.03_263.45)] shadow-lg border border-solid border-gray-300 dark:border-[#525252] max-w-xl rounded-sm">
        <form onSubmit={onConfirm}>
          <div className="flex flex-col gap-2 items-start border-solid border-b border-gray-300 dark:border-[#525252] p-6 relative">
            <div className="w-full">
              <h1 className="text-[28px] leading-[32px] font-medium text-strong mb-1 text-gray-900 dark:text-white font-['Roobert',sans-serif]">{title}</h1>
            </div>
            <button type="button" aria-label="Close modal" onClick={onClose} className="flex p-0 w-6 h-6 items-center justify-center text-gray-500 hover:text-gray-900 dark:text-[#8f8f8f] dark:hover:text-white absolute right-4 top-4">
              <svg fill="currentColor" aria-hidden="true" width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.7L11.3 4L8 7.3L4.7 4L4 4.7L7.3 8L4 11.3L4.7 12L8 8.7L11.3 12L12 11.3L8.7 8L12 4.7Z"></path></svg>
            </button>
          </div>
          
          <div className="text-[16px] leading-relaxed text-gray-800 dark:text-[#e3e3e3] p-6 space-y-5 font-normal">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-sm border border-red-100 dark:border-red-900/30 flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <LuCircleAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                {warningMessage}
              </div>
            </div>
            
            {children}
            
            <div>Type <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-gray-100 dark:bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#333] select-all shadow-sm">{expectedConfirmText}</span> below to confirm.</div>
            
            <div className="flex flex-col mt-2">
              <label htmlFor="sudo-command" className="sr-only">Sudo Command</label>
              <div className="flex relative items-center">
                <input 
                  autoComplete="off" 
                  spellCheck="false" 
                  id="sudo-command" 
                  className="h-10 w-full border border-gray-300 bg-transparent py-2.5 px-3 text-[16px] text-gray-900 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] dark:border-[#525252] dark:text-white transition-colors rounded-sm" 
                  type="text" 
                  value={confirmText} 
                  onChange={(e) => setConfirmText(e.target.value)} 
                  name="sudoCommand" 
                  placeholder="Sudo Command"
                />
              </div>
            </div>
          </div>
          
          <div className="w-full flex justify-start space-x-2 p-6 border-solid border-t border-gray-300 dark:border-[#525252]">
            <button type="submit" disabled={!isDeleteConfirmed || isDeleting} className={`h-10 py-2.5 px-4 flex items-center group/button transition-colors rounded-sm font-medium ${isDeleteConfirmed && !isDeleting ? 'bg-[#e23642] hover:bg-[#c0222d] text-white cursor-pointer' : 'bg-[#fad1d3] dark:bg-red-900/30 text-[#c0222d] dark:text-red-500/50 cursor-not-allowed'}`}>
              {isDeleting ? 'Deleting...' : deleteButtonLabel}
            </button>
            <button type="button" onClick={onClose} className="h-10 py-2.5 px-3 flex items-center border border-solid border-gray-300 dark:border-[#525252] hover:bg-gray-100 dark:hover:bg-[#272727] text-gray-900 dark:text-[#f0f0f0] rounded-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
