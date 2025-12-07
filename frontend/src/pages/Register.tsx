import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const response = await authAPI.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      
      const { user, token, refreshToken } = response.data.data;
      setAuth(user, token, refreshToken);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-white mb-2">Create an account</h2>
      <p className="text-secondary-400 mb-6">Start your predictive maintenance journey</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="label">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              className="input"
              placeholder="John"
              {...register('firstName', {
                required: 'First name is required',
              })}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-danger-500">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="label">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              className="input"
              placeholder="Doe"
              {...register('lastName', {
                required: 'Last name is required',
              })}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-danger-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

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
            className="input"
            placeholder="••••••••"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Password must contain uppercase, lowercase, and number',
              },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-danger-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            placeholder="••••••••"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-danger-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"
            required
            className="w-4 h-4 mt-1 rounded border-secondary-600 bg-secondary-700 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="terms" className="ml-2 text-sm text-secondary-400">
            I agree to the{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300">
              Privacy Policy
            </a>
          </label>
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
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary-400">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
