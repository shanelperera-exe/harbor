import { useState } from 'react';
import { Key, Eye, EyeOff, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const authApiBase = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5196/api';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${authApiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Login failed. Please try again.');
      }

      localStorage.setItem('harbor_token', data.token);
      localStorage.setItem('harbor_user', JSON.stringify({ username: data.username, role: data.role }));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-[576px] px-5 lg:px-0">
        <div className="relative z-[1] w-full mx-auto bg-[#090909]">
          <h1 className="text-3xl lg:text-4xl font-medium tracking-tight text-white mb-8 text-center">
            Sign in
          </h1>

          <div>
            <div className="my-6 space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <button
                  type="button"
                  className="group flex items-center justify-center space-x-2 h-11 px-4 bg-transparent border border-white/40 hover:bg-white text-[#e3e3e3] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#e3e3e3] focus:ring-offset-2 focus:ring-offset-[#090909] rounded-none transition-colors duration-200"
                >
                  <svg width="19" height="19" viewBox="0 0 24 23" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-[#e3e3e3] group-hover:fill-black transition-colors">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path>
                  </svg>
                  <span className="text-[15px] font-medium">GitHub</span>
                </button>

                <button
                  type="button"
                  className="group flex items-center justify-center space-x-2 h-11 px-4 bg-transparent border border-white/40 hover:bg-white text-[#e3e3e3] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#e3e3e3] focus:ring-offset-2 focus:ring-offset-[#090909] rounded-none transition-colors duration-200"
                >
                  <svg viewBox="0 0 17 16" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.706 8.167C15.706 7.647 15.6593 7.147 15.5727 6.667H8.666V9.507H12.6127C12.4393 10.4203 11.9193 11.1937 11.1393 11.7137V13.5603H13.5193C14.906 12.2803 15.706 10.4003 15.706 8.167Z" fill="#4285F4"></path>
                    <path d="M8.6658 15.3337C10.6458 15.3337 12.3058 14.6804 13.5191 13.5604L11.1391 11.7137C10.4858 12.1537 9.6525 12.4204 8.6658 12.4204C6.7591 12.4204 5.1391 11.1337 4.5591 9.4004H2.1191V11.2937C3.3258 13.6871 5.7991 15.3337 8.6658 15.3337Z" fill="#34A853"></path>
                    <path d="M4.5597 9.3929C4.413 8.9529 4.3263 8.4862 4.3263 7.9996C4.3263 7.5129 4.413 7.0462 4.5597 6.6062V4.7129H2.1197C1.6197 5.6996 1.333 6.8129 1.333 7.9996C1.333 9.1862 1.6197 10.2996 2.1197 11.2862L4.0197 9.8062L4.5597 9.3929Z" fill="#FBBC05"></path>
                    <path d="M8.6658 3.587C9.7458 3.587 10.7058 3.9603 11.4725 4.6803L13.5725 2.5803C12.2991 1.3937 10.6458 0.667 8.6658 0.667C5.7991 0.667 3.3258 2.3137 2.1191 4.7137L4.5591 6.607C5.1391 4.8737 6.7591 3.587 8.6658 3.587Z" fill="#EA4335"></path>
                  </svg>
                  <span className="text-[15px] font-medium">Google</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center my-8">
              <div className="h-[1px] w-full bg-[#333]"></div>
              <span className="px-4 text-sm text-[#8f8f8f] uppercase tracking-wider">or</span>
              <div className="h-[1px] w-full bg-[#333]"></div>
            </div>

            <form className="mb-8 flex flex-col space-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col space-y-2">
                <label className="text-[15px] font-medium text-white">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-[#8f8f8f]" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-12 w-full bg-transparent border border-[#6b6b6b] text-[#f0f0f0] pl-10 pr-3 focus:outline-none focus:border-[#f0f0f0] focus:ring-1 focus:ring-[#f0f0f0] transition-colors placeholder:text-[#8f8f8f]"
                    placeholder="your_username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-[15px] font-medium text-white">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-[#8f8f8f]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full bg-transparent border border-[#6b6b6b] text-[#f0f0f0] pl-10 pr-10 focus:outline-none focus:border-[#f0f0f0] focus:ring-1 focus:ring-[#f0f0f0] transition-colors placeholder:text-[#8f8f8f]"
                    placeholder="correct horse battery staple"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8f8f8f] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-[13.5px] pt-1">
                <div></div>
                <div>
                  Forgot your password? <Link to="/password-reset" className="text-[#2563eb] hover:underline font-medium">Reset it</Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative h-12 w-full bg-white text-black font-medium text-[16px] hover:text-white transition-colors duration-300 overflow-hidden flex items-center justify-center mt-4 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="absolute inset-0 w-full h-full bg-[#2563eb] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out z-[0]"></div>
                <span className="relative z-[1]">{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </form>

            <div className="text-[15px] text-[#8f8f8f] flex flex-col space-y-2 mb-6">
              <div>
                Don't have an account? <Link to="/register" className="text-white hover:text-[#2563eb] transition-colors font-medium">Sign up</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
