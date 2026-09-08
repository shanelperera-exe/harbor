import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../../components/ui/icons';
import ThemeToggle from '../../components/ui/ThemeToggle';

const SYMBOLS = '!<>-_\\/[]@{}—$=+*^?#________';
const WORDS = ["developers", "fast startups", "agile teams", "enterprises", "innovators", "agencies"];
const SCRAMBLE_SPEED = 30; // ms per frame update
const WORD_DELAY = 2500;   // how long to wait on a finished word

const DynamicHeading = () => {
  const [displayText, setDisplayText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let charIndex = 0;
    let currentScrambleFrames = 0;
    const targetWord = WORDS[wordIndex];
    const maxScrambleFrames = 2; // 2 frames (60ms) of scrambling per character (faster typing)
    let phase = 'TYPING'; // 'TYPING', 'PAUSING', 'DELETING'
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const interval = setInterval(() => {
      if (phase === 'TYPING') {
        if (charIndex < targetWord.length) {
          setDisplayText(
            targetWord
              .substring(0, charIndex + 1)
              .split("")
              .map((char, index) => {
                if (index < charIndex) return char; // Locked in
                // The character currently being typed scrambles
                return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
              })
              .join("")
          );

          currentScrambleFrames++;
          if (currentScrambleFrames >= maxScrambleFrames) {
            charIndex++;
            currentScrambleFrames = 0;
          }
        } else {
          setDisplayText(targetWord);
          phase = 'PAUSING';
          // Wait then move to backspacing
          timeoutId = setTimeout(() => {
            phase = 'DELETING';
          }, WORD_DELAY);
        }
      } else if (phase === 'DELETING') {
        if (charIndex > 0) {
          setDisplayText(
            targetWord
              .substring(0, charIndex)
              .split("")
              .map((char, index) => {
                if (index < charIndex - 1) return char; // Locked in
                // The character currently being deleted scrambles
                return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
              })
              .join("")
          );

          currentScrambleFrames++;
          if (currentScrambleFrames >= maxScrambleFrames) {
            charIndex--;
            currentScrambleFrames = 0;
          }
        } else {
          setDisplayText("");
          phase = 'PAUSING';
          clearInterval(interval);
          // Wait briefly before typing next word
          setTimeout(() => {
            setWordIndex((prev) => (prev + 1) % WORDS.length);
          }, 400); 
        }
      }
    }, SCRAMBLE_SPEED);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [wordIndex]);

  return (
    <h1 className="font-['Roobert',sans-serif] font-roobert text-[56px] lg:text-[80px] text-gray-900 dark:text-white leading-[1.05] tracking-tight font-light text-left">
      The deployment<br />
      platform built for<br />
      <div className="mt-1 flex flex-wrap items-center">
        <span className="bg-gradient-to-r from-[#2563eb] to-[#38bdf8] bg-clip-text text-transparent pb-2 lg:pb-0">
          {displayText}
        </span>
        {/* The Exact Block Cursor */}
        <div className="inline-flex h-[1em] w-[0.6ch] items-center align-middle ml-2 opacity-100 animate-blink">
          <div className="h-[90%] w-full bg-black dark:bg-white"></div>
        </div>
      </div>
    </h1>
  );
};

export default function Home() {
  const isLoggedIn = !!localStorage.getItem('harbor_token');

  return (
    <div className="w-full min-h-screen flex flex-col items-start px-5 lg:px-[78px] pt-[150px] lg:pt-[30vh]">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col justify-start">
        <DynamicHeading />
        
        <p className="mt-6 lg:mt-8 text-[18px] lg:text-[22px] text-gray-600 dark:text-[#a1a1aa] font-light max-w-[650px] leading-[1.6] font-sans">
          Centralize your DevOps lifecycle. Manage projects, configure environments, and monitor application deployments through a single, intuitive dashboard.
        </p>
        
        <div className="mt-10 lg:mt-12 flex items-center">
          <Link 
            to={isLoggedIn ? "/dashboard" : "/register"} 
            className="ease transition-colors group relative z-[1] flex cursor-pointer items-center overflow-hidden whitespace-nowrap justify-between motion-safe:duration-150 motion-reduce:duration-0 lg:motion-safe:duration-300 lg:motion-reduce:duration-0 bg-gray-900 dark:bg-white text-white dark:text-black hover:text-white dark:hover:text-white lg:hover:text-white dark:lg:hover:text-white h-[70px] text-[20px] py-[20px] px-[24px] gap-[15px] lg:[--button-arrow-offset:2px] font-sans"
            style={{ letterSpacing: '0.2px', lineHeight: '150%' }}
          >
            {/* Animated Background Layer */}
            <span 
              className="ease pointer-events-none absolute inset-0 z-[0] block h-full w-full opacity-100 transition-transform origin-right scale-x-0 lg:group-hover:origin-left lg:group-hover:scale-x-100 motion-safe:duration-300 bg-[#2563eb]"
            ></span>

            {/* Button Text */}
            <span 
              className="ease relative z-[1] inline-block transition-transform motion-safe:duration-300 translate-x-0 group-hover:translate-x-[var(--button-arrow-offset)]"
            >
              {isLoggedIn ? 'Dashboard' : 'Get Started'}
            </span>

            {/* SVG Icon */}
            <ArrowRightIcon className="ease relative z-[1] translate-x-0 transition-transform motion-safe:duration-300 group-hover:-translate-x-[var(--button-arrow-offset)] w-[15px] h-[15px] rotate-0 transform" />
          </Link>
        </div>

      </div>
      <ThemeToggle />
    </div>
  );
}
