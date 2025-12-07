import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(data.email, data.password);
      const { user, token, refreshToken } = response.data.data;
      
      setAuth(user, token, refreshToken);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid credentials';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login with demo accounts
  const handleQuickLogin = (type: 'user' | 'admin') => {
    if (type === 'user') {
      setValue('email', 'demo@autosentry.com');
      setValue('password', 'Demo123!');
    } else {
      setValue('email', 'admin@autosentry.com');
      setValue('password', 'Admin123!');
    }
    toast.success(`${type === 'admin' ? 'Admin' : 'User'} credentials filled. Click "Sign in" to continue.`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
      <p className="text-secondary-400 mb-6">Sign in to your AutoSentry account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-danger-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-danger-500">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-secondary-600 bg-secondary-700 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-secondary-400">Remember me</span>
          </label>
          <a href="#" className="text-sm text-primary-400 hover:text-primary-300">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-3"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-secondary-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-secondary-800 text-secondary-400">Quick Demo Login</span>
        </div>
      </div>

      {/* Demo Account Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleQuickLogin('user')}
          disabled={isLoading}
          className="flex flex-col items-center gap-2 p-4 bg-secondary-700/50 hover:bg-secondary-700 border border-secondary-600 rounded-lg transition-colors"
        >
          <UserIcon className="w-8 h-8 text-primary-400" />
          <span className="text-sm font-medium text-white">Vehicle Owner</span>
          <span className="text-xs text-secondary-400">demo@autosentry.com</span>
        </button>
        <button
          onClick={() => handleQuickLogin('admin')}
          disabled={isLoading}
          className="flex flex-col items-center gap-2 p-4 bg-secondary-700/50 hover:bg-secondary-700 border border-secondary-600 rounded-lg transition-colors"
        >
          <ShieldCheckIcon className="w-8 h-8 text-warning-400" />
          <span className="text-sm font-medium text-white">Admin</span>
          <span className="text-xs text-secondary-400">admin@autosentry.com</span>
        </button>
      </div>
      
      <p className="mt-4 text-center text-xs text-secondary-500">
        Click a role above, then click "Sign in" to login
      </p>

      <p className="mt-6 text-center text-sm text-secondary-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}
