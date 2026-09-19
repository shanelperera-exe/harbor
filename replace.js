const fs = require('fs');
const file = 'src/frontend/harbor-web/src/pages/settings/AccountSettings.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Labels
content = content.replace(/className="inline-block text-lg font-bold text-primary mb-1"/g, 'className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case"');

// 2. Account Security section: Replace text-[14px] with text-[16px]
// Let's replace text-[14px] in the specific section.
let startIndex = content.indexOf('<div data-id="account-security"');
let accountSecuritySection = content.substring(startIndex);
accountSecuritySection = accountSecuritySection.replace(/text-\[14px\]/g, 'text-[16px]');
content = content.substring(0, startIndex) + accountSecuritySection;

// 3. Subtexts: Change text-gray-500 to text-gray-600
content = content.replace(/text-gray-500 dark:text-\[#a1a1aa\]/g, 'text-gray-600 dark:text-[#c7c7c7] leading-[24px] font-normal tracking-[0.16px] normal-case');

// 4. Dashboard theme dropdown text size (text-sm -> text-[16px])
content = content.replace(/text-sm text-gray-700/g, 'text-[16px] text-gray-700');
content = content.replace(/text-sm text-gray-500/g, 'text-[16px] text-gray-500');

// 5. Fix unnecessary outline in log explorer dropdown
content = content.replace(/focus-visible:outline focus:outline-focus-action outline-2/g, 'focus-visible:outline-none');

fs.writeFileSync(file, content);
console.log('Replacements complete');
