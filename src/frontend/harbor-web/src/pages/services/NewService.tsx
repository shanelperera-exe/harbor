import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/icons';

const NewService: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeService, setActiveService] = useState('Service');

  return (
    <div className="w-full bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-[#f0f0f0]" style={{
      WebkitTextSizeAdjust: "100%",
      tabSize: 4,
      fontFeatureSettings: "normal",
      fontVariationSettings: "normal",
      WebkitTapHighlightColor: "transparent",
      fontFamily: "ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji",
      lineHeight: "inherit",
      boxSizing: "border-box",
      border: "0 solid #e5e7eb",
      marginTop: "3rem",
      marginBottom: "3rem",
      width: "100%",
    }}>
      <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12 font-sans">
        <div className="my-12">
          <div className="">
            <h1 className="text-[32px] leading-[36px] font-medium text-gray-900 dark:text-white break-words tracking-[-0.32px]" style={{ fontFamily: 'Roobert, sans-serif' }}>
              Create a new <span className={`text-gray-500 dark:text-gray-400 ${activeService === 'Service' ? 'underline decoration-gray-400 decoration-dashed' : ''}`}>{activeService}</span>
            </h1>
          </div>
          <div className="mt-4 text-[16px] leading-[24px] font-normal text-gray-600 dark:text-[#f0f0f0]" style={{ fontFamily: '"Neue Montreal", sans-serif' }}>Select the type of service you'd like to create</div>
        </div>
        <div className="-mx-4 md:-mx-5">
          <div className="w-full max-w-[1920px] mx-auto px-4 md:px-5 mb-20">
            <ul className="grid grid-flow-row gap-6 md:grid-cols-2 lg:grid-cols-4">
              <li className="flex" data-item-title="Static Site" onMouseEnter={() => setActiveService('Static Site')} onMouseLeave={() => setActiveService('Service')}>
                <div className="w-full h-[201px] bg-white dark:bg-transparent border border-solid border-gray-900 dark:border-[#4d4d4d] p-6 flex-1 flex flex-col justify-between space-y-3 rounded-sm">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start space-x-2 text-gray-900 dark:text-white">
                      <div className="shrink-0 mt-1">
                        <Icon name="staticSite" className="text-gray-700 dark:text-[#f0f0f0] w-5 h-5" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[20px] leading-[28px] font-semibold" style={{ fontFamily: 'Roobert, sans-serif' }}>Static Sites</span>
                      </div>
                    </div>
                    <div className="text-[16px] leading-[24px] text-gray-600 dark:text-[#c7c7c7] break-words" style={{ fontFamily: '"Neue Montreal", sans-serif' }}>
                      Deploy frontend applications built with React, Vue, or static site generators directly into Harbor.
                    </div>
                  </div>
                  <div>
                    <Link className="group inline-flex items-center p-1 cursor-pointer text-[#3b82f6] hover:text-[#2563eb] active:text-blue-400 text-[14px] leading-[20px] font-medium no-underline -mx-1" to={`/projects/${projectId}/services/new/static`}>
                      New Static Site
                      <div className="ms-1.5">
                        <Icon name="arrowRight" />
                      </div>
                    </Link>
                  </div>
                </div>
              </li>
              <li className="flex" data-item-title="Web Service" onMouseEnter={() => setActiveService('Web Service')} onMouseLeave={() => setActiveService('Service')}>
                <div className="w-full h-[201px] bg-white dark:bg-transparent border border-solid border-gray-900 dark:border-[#4d4d4d] p-6 flex-1 flex flex-col justify-between space-y-3 rounded-sm">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start space-x-2 text-gray-900 dark:text-white">
                      <div className="shrink-0 mt-1">
                        <Icon name="globe" className="text-gray-700 dark:text-[#f0f0f0] w-5 h-5" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[20px] leading-[28px] font-semibold" style={{ fontFamily: 'Roobert, sans-serif' }}>Web Services</span>
                      </div>
                    </div>
                    <div className="text-[16px] leading-[24px] text-gray-600 dark:text-[#c7c7c7] break-words" style={{ fontFamily: '"Neue Montreal", sans-serif' }}>
                      Deploy containerized backend applications, APIs, or full-stack web servers directly into Harbor.
                    </div>
                  </div>
                  <div>
                    <Link className="group inline-flex items-center p-1 cursor-pointer text-[#3b82f6] hover:text-[#2563eb] active:text-blue-400 text-[14px] leading-[20px] font-medium no-underline -mx-1" to={`/projects/${projectId}/services/new/web`}>
                      New Web Service
                      <div className="ms-1.5">
                        <Icon name="arrowRight" />
                      </div>
                    </Link>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewService;
