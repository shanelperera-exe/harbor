import { useState, useEffect } from 'react';
import { RiCloseLine, RiShieldCheckLine } from 'react-icons/ri';
import { BiLinkExternal, BiKey, BiCheck, BiCopy } from 'react-icons/bi';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { Icon } from '../../components/icons';
import { INTEGRATION_GUIDES, type IntegrationGuide } from './integrationGuides';

interface ProviderMeta {
  id: string;
  name: string;
  badge?: string;
  lightIcon: string;
  darkIcon: string;
  invertInDark?: boolean;
}

interface IntegrationInstructionsModalProps {
  isOpen: boolean;
  provider: ProviderMeta | null;
  onClose: () => void;
  onOpenConnectModal?: (provider: ProviderMeta) => void;
}

export default function IntegrationInstructionsModal({
  isOpen,
  provider,
  onClose,
  onOpenConnectModal,
}: IntegrationInstructionsModalProps) {
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCopiedSnippetIndex(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !provider) return null;

  const guide: IntegrationGuide | undefined = INTEGRATION_GUIDES[provider.id];

  const handleCopy = (text: string, index: number) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedSnippetIndex(index);
      setTimeout(() => {
        setCopiedSnippetIndex(null);
      }, 2000);
    }
  };

  const handleConnectNow = () => {
    onClose();
    if (onOpenConnectModal && provider) {
      onOpenConnectModal(provider);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instruction-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#38383e] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-[#2e2e34] flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-md bg-white dark:bg-[#242429] border border-gray-200 dark:border-[#38383e] flex items-center justify-center p-2 shrink-0 shadow-xs">
              {provider.lightIcon === provider.darkIcon ? (
                <img
                  src={provider.lightIcon}
                  alt={provider.name}
                  className={`w-8 h-8 object-contain ${provider.invertInDark ? 'dark:invert' : ''}`}
                />
              ) : (
                <>
                  <img
                    src={provider.lightIcon}
                    alt={provider.name}
                    className="w-8 h-8 object-contain dark:hidden block"
                  />
                  <img
                    src={provider.darkIcon}
                    alt={provider.name}
                    className="w-8 h-8 object-contain hidden dark:block"
                  />
                </>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="instruction-modal-title"
                  className="text-[20px] font-semibold text-gray-900 dark:text-white"
                  style={{ fontFamily: 'Roobert, sans-serif' }}
                >
                  {provider.name} Integration Guide
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                  {guide?.category || provider.badge || 'Cloud Platform'}
                </span>
              </div>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                Step-by-step setup instructions and official documentation links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
            aria-label="Close modal"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-gray-800 dark:text-gray-200">
          {/* Summary */}
          {guide?.summary && (
            <div className="text-[14.5px] leading-relaxed text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#202025] p-3.5 rounded-md border border-gray-200/70 dark:border-[#323238]">
              {guide.summary}
            </div>
          )}

          {/* Credential Format Callout */}
          {guide && (
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-md">
              <div className="flex items-start gap-2.5">
                <BiKey className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-blue-900 dark:text-blue-200">
                    Required Credential
                  </div>
                  <div className="text-[14px] font-medium text-gray-900 dark:text-white mt-0.5">
                    {guide.credentialType}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] text-blue-800 dark:text-blue-300/80">Format:</span>
                    <code className="text-[12px] font-mono px-2 py-0.5 rounded bg-white dark:bg-black/40 text-blue-900 dark:text-blue-200 border border-blue-200/70 dark:border-blue-900/40 select-all">
                      {guide.credentialFormat}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Setup Steps */}
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-[12px] text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <IoInformationCircleOutline className="w-4 h-4 text-blue-500" />
              <span>Step-by-Step Connection Instructions</span>
            </h3>

            <div className="space-y-3.5">
              {guide?.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-md bg-gray-50/60 dark:bg-[#1f1f24] border border-gray-200/80 dark:border-[#2e2e36]"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white dark:bg-blue-500 text-[12px] font-semibold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium text-gray-900 dark:text-white">
                      {step.title}
                    </div>
                    <div className="text-[13.5px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed whitespace-pre-line">
                      {step.description}
                    </div>
                    {step.codeSnippet && (
                      <div className="mt-2.5 relative group/snippet">
                        <pre className="p-2.5 text-[12px] font-mono bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#38383e] rounded-md overflow-x-auto text-gray-800 dark:text-gray-200 leading-normal">
                          {step.codeSnippet}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopy(step.codeSnippet!, idx)}
                          className="absolute top-2 right-2 px-2 py-1 text-[11px] font-medium rounded bg-gray-100 hover:bg-gray-200 dark:bg-[#28282e] dark:hover:bg-[#34343a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#424248] transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy snippet"
                        >
                          {copiedSnippetIndex === idx ? (
                            <>
                              <BiCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <BiCopy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Documentation Links */}
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <BiLinkExternal className="w-4 h-4 text-blue-500" />
              <span>Official Cloud Platform Documentation</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {guide?.docs.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-md border border-gray-200 dark:border-[#2e2e36] bg-white dark:bg-[#1c1c20] hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xs transition-all flex items-start justify-between group"
                >
                  <div className="flex-1 pr-3">
                    <div className="text-[14px] font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                      <span>{doc.title}</span>
                    </div>
                    <div className="text-[12.5px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {doc.description}
                    </div>
                    <div className="text-[11.5px] text-blue-600 dark:text-blue-400/90 mt-1.5 truncate font-mono">
                      {doc.url}
                    </div>
                  </div>
                  <BiLinkExternal className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="p-3.5 rounded-md bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 text-[13px] text-amber-900 dark:text-amber-200/90 flex items-start gap-2.5">
            <RiShieldCheckLine className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-950 dark:text-amber-100">
                Security & Encryption:
              </span>{' '}
              {guide?.securityNote ||
                'All credentials stored in Harbor are protected with AES-256 envelope encryption at rest and in transit.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-[#2e2e34] bg-gray-50 dark:bg-[#1a1a1f] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-md transition-colors"
          >
            Close
          </button>
          {onOpenConnectModal && (
            <button
              type="button"
              onClick={handleConnectNow}
              className="px-4 py-2 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[14px] font-medium rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span>Connect {provider.name}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
