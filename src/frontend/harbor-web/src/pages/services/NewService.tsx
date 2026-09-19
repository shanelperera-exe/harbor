import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const NewService: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeService, setActiveService] = useState('Service');

  return (
    <div className="w-full bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-[#f0f0f0]" style={{
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
                <div className="w-full h-[201px] bg-white dark:bg-transparent border border-solid border-gray-900 dark:border-[#4d4d4d] p-6 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start space-x-2 text-gray-900 dark:text-white">
                      <div className="shrink-0 mt-1">
                        <svg fill="currentColor" className="text-gray-700 dark:text-[#f0f0f0] w-5 h-5" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path>
                          <path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path>
                        </svg>
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
                    <Link className="group inline-flex items-center p-1 cursor-pointer text-[#2563eb] hover:text-blue-500 active:text-blue-400 text-[14px] leading-[20px] font-medium no-underline -mx-1" to={`/projects/${projectId}/services/new/static`}>
                      New Static Site
                      <div className="ms-1.5">
                        <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 3L8.285 3.6965L12.075 7.5H2V8.5H12.075L8.285 12.2865L9 13L14 8L9 3Z"></path>
                        </svg>
                      </div>
                    </Link>
                  </div>
                </div>
              </li>
              <li className="flex" data-item-title="Web Service" onMouseEnter={() => setActiveService('Web Service')} onMouseLeave={() => setActiveService('Service')}>
                <div className="w-full h-[201px] bg-white dark:bg-transparent border border-solid border-gray-900 dark:border-[#4d4d4d] p-6 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start space-x-2 text-gray-900 dark:text-white">
                      <div className="shrink-0 mt-1">
                        <svg fill="currentColor" className="text-gray-700 dark:text-[#f0f0f0] w-5 h-5" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path>
                        </svg>
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
                    <Link className="group inline-flex items-center p-1 cursor-pointer text-[#2563eb] hover:text-blue-500 active:text-blue-400 text-[14px] leading-[20px] font-medium no-underline -mx-1" to={`/projects/${projectId}/services/new/web`}>
                      New Web Service
                      <div className="ms-1.5">
                        <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 3L8.285 3.6965L12.075 7.5H2V8.5H12.075L8.285 12.2865L9 13L14 8L9 3Z"></path>
                        </svg>
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
