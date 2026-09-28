import { Icon } from '../icons';
export default function TopBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-teal-700 via-emerald-500 to-green-400 py-2 px-4 flex justify-center items-center text-sm font-medium text-white shadow-sm">
      <span className="mr-3">Migrating production infrastructure? Get up to $10K in migration credits.</span>
      <a 
        href="#" 
        className="bg-black text-white px-3 py-1 rounded-sm text-xs font-semibold hover:bg-gray-800 transition-colors flex items-center gap-1"
      >
        Apply now
        <Icon name="chevronRightSmall" />
      </a>
    </div>
  );
}
