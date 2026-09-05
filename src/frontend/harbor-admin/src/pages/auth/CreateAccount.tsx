import { useState } from 'react';
import { Mail, Key, Eye, EyeOff, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const authApiBase = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5196/api';

export default function CreateAccount() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${authApiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Account creation failed.');
      }

      // Automatically login the user after successful registration
      const loginResponse = await fetch(`${authApiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const loginResponseData = await loginResponse.json().catch(() => ({}));

      if (!loginResponse.ok) {
        // If auto-login fails, redirect to login page so they can try manually
        navigate('/login');
        return;
      }

      const loginPayload = loginResponseData.data;

      localStorage.setItem('harbor_token', loginPayload.token);
      localStorage.setItem('harbor_user', JSON.stringify({
        username: loginPayload.username,
        email: loginPayload.email ?? '',
        role: loginPayload.role,
        avatarSvg: loginPayload.avatarSvg ?? null,
      }));
      window.dispatchEvent(new Event('storage'));

      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const criteria = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) }
  ];
  const strength = criteria.filter(c => c.met).length;

  return (
    <div className="w-full min-h-screen flex items-center justify-center pt-[66px] bg-white dark:bg-[#090909] transition-colors duration-300">
      <div className="w-full max-w-[576px] px-5 lg:px-0">
        <div className="relative z-[1] w-full mx-auto bg-white dark:bg-[#090909] transition-colors duration-300">
          <h1 className="text-3xl lg:text-4xl font-medium tracking-tight text-black dark:text-white mb-8 text-center transition-colors duration-300">
            Create an Account
          </h1>

          <div>
            <div className="my-6 space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <button
                  type="button"
                  className="group flex items-center justify-center space-x-2 h-10 px-4 bg-transparent border border-black dark:border-white/40 hover:bg-gray-100 dark:hover:bg-white text-black dark:text-[#e3e3e3] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#e3e3e3] focus:ring-offset-2 focus:ring-offset-[#090909] rounded-none transition-colors duration-200"
                >
                  <svg width="19" height="19" viewBox="0 0 24 23" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-black dark:fill-[#e3e3e3] group-hover:fill-black transition-colors">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path>
                  </svg>
                  <span className="text-[15px] font-medium">GitHub</span>
                </button>

                <button
                  type="button"
                  className="group flex items-center justify-center space-x-2 h-10 px-4 bg-transparent border border-black dark:border-white/40 hover:bg-gray-100 dark:hover:bg-white text-black dark:text-[#e3e3e3] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#e3e3e3] focus:ring-offset-2 focus:ring-offset-[#090909] rounded-none transition-colors duration-200"
                >
                  <svg viewBox="0 0 17 16" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.706 8.167C15.706 7.647 15.6593 7.147 15.5727 6.667H8.666V9.507H12.6127C12.4393 10.4203 11.9193 11.1937 11.1393 11.7137V13.5603H13.5193C14.906 12.2803 15.706 10.4003 15.706 8.167Z" fill="#4285F4"></path>
                    <path d="M8.666 15.667C10.646 15.667 12.3127 15.0137 13.5193 13.5603L11.1393 11.7137C10.486 12.1537 9.646 12.4137 8.666 12.4137C6.77267 12.4137 5.166 11.1337 4.586 9.42703H2.126V11.3337C3.326 13.7137 5.79267 15.667 8.666 15.667Z" fill="#34A853"></path>
                    <path d="M4.586 9.42703C4.43933 8.98703 4.35267 8.5137 4.35267 8.0337C4.35267 7.5537 4.43933 7.08037 4.586 6.64037V4.7337H2.126C1.63267 5.7137 1.33267 6.8337 1.33267 8.0337C1.33267 9.2337 1.63267 10.3537 2.126 11.3337L4.586 9.42703Z" fill="#FBBC05"></path>
                    <path d="M8.666 3.6537C9.746 3.6537 10.7127 4.02703 11.4727 4.7537L13.5793 2.64703C12.306 1.46037 10.6393 0.667032 8.666 0.667032C5.79267 0.667032 3.326 2.62037 2.126 5.00037L4.586 6.90703C5.166 5.20037 6.77267 3.6537 8.666 3.6537Z" fill="#EA4335"></path>
                  </svg>
                  <span className="text-[15px] font-medium">Google</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center my-8">
              <div className="h-[1px] w-full bg-black dark:bg-[#333] transition-colors duration-300"></div>
              <span className="px-4 text-sm text-black dark:text-[#8f8f8f] uppercase tracking-wider transition-colors duration-300">or</span>
              <div className="h-[1px] w-full bg-black dark:bg-[#333] transition-colors duration-300"></div>
            </div>

            <form className="mb-8 flex flex-col space-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col space-y-2">
                <label className="text-[15px] font-medium text-black dark:text-white transition-colors duration-300">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-[#8f8f8f] transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-10 w-full bg-transparent border border-black dark:border-[#6b6b6b] text-black dark:text-[#f0f0f0] pl-10 pr-3 focus:outline-none focus:border-black dark:focus:border-[#f0f0f0] focus:ring-1 focus:ring-black dark:focus:ring-[#f0f0f0] transition-colors placeholder:text-gray-400 dark:placeholder:text-[#8f8f8f]"
                    placeholder="your_username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-[15px] font-medium text-black dark:text-white transition-colors duration-300">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-[#8f8f8f] transition-colors duration-300" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10 w-full bg-transparent border border-black dark:border-[#6b6b6b] text-black dark:text-[#f0f0f0] pl-10 pr-3 focus:outline-none focus:border-black dark:focus:border-[#f0f0f0] focus:ring-1 focus:ring-black dark:focus:ring-[#f0f0f0] transition-colors placeholder:text-gray-400 dark:placeholder:text-[#8f8f8f]"
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-[15px] font-medium text-black dark:text-white transition-colors duration-300">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400 dark:text-[#8f8f8f] transition-colors duration-300" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 w-full bg-transparent border border-black dark:border-[#6b6b6b] text-black dark:text-[#f0f0f0] pl-10 pr-10 focus:outline-none focus:border-black dark:focus:border-[#f0f0f0] focus:ring-1 focus:ring-black dark:focus:ring-[#f0f0f0] transition-colors placeholder:text-gray-400 dark:placeholder:text-[#8f8f8f]"
                    placeholder="correct horse battery staple"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-[#8f8f8f] hover:text-black dark:hover:text-white transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {password.length > 0 && (
                  <div className="flex flex-col space-y-2 mt-1.5">
                    <div className="flex space-x-1.5 h-1">
                      {[1, 2, 3, 4].map(level => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-colors duration-300 ${
                            strength >= level 
                              ? (strength < 2 ? 'bg-red-500' : strength < 3 ? 'bg-yellow-500' : strength < 4 ? 'bg-blue-500' : 'bg-green-500')
                              : 'bg-gray-200 dark:bg-[#333]'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[12.5px] pt-1">
                      {criteria.map((c, i) => (
                        <div key={i} className={`flex items-center space-x-2 ${c.met ? 'text-green-600 dark:text-green-500' : 'text-gray-500 dark:text-[#8f8f8f]'}`}>
                          <div className={`flex items-center justify-center w-3.5 h-3.5 border flex-shrink-0 transition-colors duration-300 ${c.met ? 'bg-transparent border-green-600 dark:border-green-500 text-green-600 dark:text-green-500' : 'bg-transparent border-gray-400 dark:border-gray-500 text-gray-400 dark:text-gray-500'}`}>
                            {c.met ? (
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <span className="truncate">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>



              {error && (
                <div className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="text-sm text-[#8f8f8f] pt-2">
                By signing up you agree to our <a href="#" className="text-[#2563eb] hover:underline">terms of service</a> and <a href="#" className="text-[#2563eb] hover:underline">privacy policy.</a>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative h-10 w-full bg-black dark:bg-white text-white dark:text-black font-medium text-[16px] hover:text-white transition-colors duration-300 overflow-hidden flex items-center justify-center mt-4 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="absolute inset-0 w-full h-full bg-[#2563eb] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out z-[0]"></div>
                <span className="relative z-[1]">{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
              </button>
            </form>

            <div className="text-[15px] text-black dark:text-[#8f8f8f] flex flex-col space-y-2 mb-6 transition-colors duration-300">
              <div>
                Already have an account? <Link to="/login" className="text-[#2563eb] hover:text-blue-700 transition-colors font-medium">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
