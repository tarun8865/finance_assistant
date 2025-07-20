import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { FiMail, FiLock, FiEye, FiEyeOff, FiTrendingUp } from 'react-icons/fi';
import Button from './Button';
import Card from './Card';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      setLoading(false);
      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('email', email);
        localStorage.setItem('userName', res.user?.name || email);
        setSuccess('Login successful!');
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        setError(res.message || 'Login failed');
      }
    } catch {
      setLoading(false);
      setError('Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md animate-bounce-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4 mx-auto animate-float">
            <FiTrendingUp className="w-8 h-8 text-primary-600 animate-pulse-slow" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 animate-slide-down">Welcome Back</h1>
          <p className="text-gray-600 animate-slide-down" style={{ animationDelay: '0.1s' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-shake">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 animate-scale-in">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 hover:shadow-md"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 hover:shadow-md"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:scale-110 transition-transform"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full animate-slide-up hover:scale-105 transition-transform"
            size="lg"
            style={{ animationDelay: '0.4s' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Login; 