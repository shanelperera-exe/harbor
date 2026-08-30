import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PasswordReset() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-[576px] px-5 lg:px-0">
        <div className="relative z-[1] w-full mx-auto bg-[#090909]">
          <h1 className="text-3xl lg:text-4xl font-medium tracking-tight text-white mb-6">
            Reset Your Password
          </h1>
          
          {!isSubmitted ? (
            <div>
              <p className="text-[17px] text-[#f0f0f0] mb-8">
                Enter your email address and we'll send you a password reset link.
              </p>
              
              <form onSubmit={handleSubmit} className="mb-8 flex flex-col space-y-5">
                <div className="flex flex-col space-y-2">
                  <label className="text-[15px] font-medium text-white">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-[#8f8f8f]" />
                    </div>
                    <input 
                      type="email" 
                      required
                      className="h-12 w-full bg-transparent border border-[#6b6b6b] text-[#f0f0f0] pl-10 pr-3 focus:outline-none focus:border-[#f0f0f0] focus:ring-1 focus:ring-[#f0f0f0] transition-colors placeholder:text-[#8f8f8f]" 
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="group relative h-12 w-full bg-white text-black font-medium text-[16px] hover:text-white transition-colors duration-300 overflow-hidden flex items-center justify-center mt-4"
                >
                  <div className="absolute inset-0 w-full h-full bg-[#2563eb] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out z-[0]"></div>
                  <span className="relative z-[1]">Reset Password</span>
                </button>
              </form>
              
              <div className="text-[15px] text-[#f0f0f0]">
                If you need further assistance, contact <a href="mailto:support@harbor.com" className="text-[#a78bfa] hover:underline font-medium">support@harbor.com</a>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border border-[#6b6b6b] p-6 lg:p-8 bg-[#0a0a0a]">
              <p className="text-[17px] text-[#f0f0f0]">
                You will receive a password reset email soon.
              </p>
              <p className="text-[17px] text-[#f0f0f0]">
                Follow the link in the email to reset your password.
              </p>
              
              <div className="pt-4">
                <Link to="/login" className="text-[#2563eb] hover:underline font-medium text-[15px]">
                  &larr; Back to sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
