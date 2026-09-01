import Header from './components/layout/Header';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import CreateAccount from './pages/auth/CreateAccount';
import Login from './pages/auth/Login';
import PasswordReset from './pages/auth/PasswordReset';

function App() {
  return (
    <div className="h-screen overflow-hidden bg-[#090909] text-white font-sans">
      <Header />
      <main className="pt-[47px] lg:pt-[66px] flex flex-col items-center justify-center h-full w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<CreateAccount />} />
          <Route path="/login" element={<Login />} />
          <Route path="/password-reset" element={<PasswordReset />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
