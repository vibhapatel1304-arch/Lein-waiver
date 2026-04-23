import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HardHat } from 'lucide-react';

export default function ClientPortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignIn = (e) => {
    e.preventDefault();
    navigate('/portal/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <HardHat className="w-12 h-12 text-amber-500 mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Boulder Construction</h1>
          <p className="text-slate-500 text-sm mt-1">Client Portal</p>
        </div>

        <p className="text-center text-slate-600 mb-6">Sign in to your account</p>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </form>

        <p className="text-center mt-6">
          <Link to="/login" className="text-sm text-slate-500 hover:text-amber-600 transition-colors">
            Back to CRM
          </Link>
        </p>
      </div>
    </div>
  );
}
