import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#202124] transition-colors duration-300">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
}
