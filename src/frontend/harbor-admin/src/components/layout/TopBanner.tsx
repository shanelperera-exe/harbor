export default function TopBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-teal-700 via-emerald-500 to-green-400 py-2 px-4 flex justify-center items-center text-sm font-medium text-white shadow-sm">
      <span className="mr-3">Migrating production infrastructure? Get up to $10K in migration credits.</span>
      <a 
        href="#" 
        className="bg-black text-white px-3 py-1 rounded text-xs font-semibold hover:bg-gray-800 transition-colors flex items-center gap-1"
      >
        Apply now
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </a>
    </div>
  );
}
