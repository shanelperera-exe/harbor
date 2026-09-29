import { useState } from 'react';
import { Mail, Key, Eye, EyeOff, User, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/icons';

const authApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function startExternalLogin(provider: 'google' | 'github') {
  window.location.assign(`${authApiBase}/auth/external/${provider}`);
}

export default function CreateAccount() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{username?: string, email?: string, password?: string, general?: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newErrors: {username?: string, email?: string, password?: string, general?: string} = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password.trim()) newErrors.password = 'Password is required';

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (email.trim() && !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
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
        throw new Error(data?.detail || data?.title || data?.message || 'Account creation failed.');
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

      navigate('/projects');
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Unable to create account.' });
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
    <div className="w-full min-h-screen flex items-center justify-center pt-[66px] bg-white dark:bg-[oklch(0.21_0.03_263.45)] transition-colors duration-300">
      <div className="w-full max-w-[576px] px-5 lg:px-0">
        <div className="relative z-[1] w-full mx-auto bg-white dark:bg-[oklch(0.21_0.03_263.45)] transition-colors duration-300">
          <h1 className="text-3xl lg:text-4xl font-medium tracking-tight text-black dark:text-white mb-8 text-center transition-colors duration-300">
            Create an Account
          </h1>

          <div>
            <div className="my-6 space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => startExternalLogin('github')}
                  className="group flex items-center justify-center space-x-2 h-10 px-4 bg-transparent border border-gray-300 dark:border-[#525252]/40 hover:bg-gray-100 dark:hover:bg-white text-black dark:text-[#e3e3e3] hover:text-black focus:outline-none rounded-sm transition-colors duration-200"
                >
                  <Icon name="githubMarkOutline" className="w-5 h-5 fill-black dark:fill-[#e3e3e3] group-hover:fill-black transition-colors" />
                  <span className="text-[15px] font-medium">GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => startExternalLogin('google')}
                  className="group flex items-center justify-center space-x-2 h-10 px-4 bg-transparent border border-gray-300 dark:border-[#525252]/40 hover:bg-gray-100 dark:hover:bg-white text-black dark:text-[#e3e3e3] hover:text-black focus:outline-none rounded-sm transition-colors duration-200"
                >
                  <Icon name="google" className="w-5 h-5" />
                  <span className="text-[15px] font-medium">Google</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center my-8">
              <div className="h-[1px] w-full bg-black dark:bg-[#333] transition-colors duration-300"></div>
              <span className="px-4 text-sm text-black dark:text-[#8f8f8f] uppercase tracking-wider transition-colors duration-300">or</span>
              <div className="h-[1px] w-full bg-black dark:bg-[#333] transition-colors duration-300"></div>
            </div>

            <form className="mb-8 flex flex-col space-y-5" onSubmit={handleSubmit} noValidate>
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
                    className={`h-10 w-full rounded-sm bg-transparent border ${errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#525252] focus:border-[#2563eb] dark:focus:border-[#2563eb] focus:ring-[#2563eb] dark:focus:ring-[#2563eb]'} text-black dark:text-[#f0f0f0] pl-10 pr-3 focus:outline-none focus:ring-1 transition-colors placeholder:text-gray-400 dark:placeholder:text-[#8f8f8f]`}
                    placeholder="your_username"
                    autoComplete="username"
                    data-testid="username-input"
                  />
                </div>
                {errors.username && <p className="text-red-500 dark:text-red-400 text-[13px]">{errors.username}</p>}
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
                    className={`h-10 w-full rounded-sm bg-transparent border ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#525252] focus:border-[#2563eb] dark:focus:border-[#2563eb] focus:ring-[#2563eb] dark:focus:ring-[#2563eb]'} text-black dark:text-[#f0f0f0] pl-10 pr-3 focus:outline-none focus:ring-1 transition-colors placeholder:text-gray-400 dark:placeholder:text-[#8f8f8f]`}
                    placeholder="your@email.com"
                    autoComplete="email"
                    data-testid="email-input"
                  />
                </div>
                {errors.email && <p className="text-red-500 dark:text-red-400 text-[13px]">{errors.email}</p>}
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
                    className={`h-10 w-full rounded-sm bg-transparent border ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#525252] focus:border-[#2563eb] dark:focus:border-[#2563eb] focus:ring-[#2563eb] dark:focus:ring-[#2563eb]'} text-black dark:text-[#f0f0f0] pl-10 pr-10 focus:outline-none focus:ring-1 transition-colors placeholder:text-gray-400 dark:placeholder:text-[#8f8f8f]`}
                    placeholder="correct horse battery staple"
                    autoComplete="new-password"
                    data-testid="password-input"
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
                              <Icon name="checkStroke" className="w-2.5 h-2.5" />
                            ) : (
                              <Icon name="closeHeavy" className="w-2.5 h-2.5" />
                            )}
                          </div>
                          <span className="truncate">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {errors.password && <p className="text-red-500 dark:text-red-400 text-[13px] mt-1">{errors.password}</p>}
              </div>



              {errors.general && (
                <div data-testid="error-message" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 transition-colors duration-300 mt-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{errors.general}</p>
                </div>
              )}

              <div className="text-sm text-[#8f8f8f] pt-2">
                By signing up you agree to our <a href="#" className="text-[#2563eb] hover:underline">terms of service</a> and <a href="#" className="text-[#2563eb] hover:underline">privacy policy.</a>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="create-account-button"
                className="group relative h-10 w-full rounded-sm bg-black dark:bg-white text-white dark:text-black font-medium text-[16px] hover:text-white transition-colors duration-300 overflow-hidden flex items-center justify-center mt-4 disabled:cursor-not-allowed disabled:opacity-70"
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
