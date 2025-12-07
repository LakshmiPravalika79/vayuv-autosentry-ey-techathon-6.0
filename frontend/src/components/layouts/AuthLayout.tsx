import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">AutoSentry</span>
          </div>
          <p className="text-secondary-400">AI-Powered Predictive Vehicle Maintenance</p>
        </div>

        {/* Auth card */}
        <div className="card p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-secondary-500 text-sm mt-6">
          &copy; 2024 AutoSentry AI. EY Techathon 6.0 Submission.
        </p>
      </motion.div>
    </div>
  );
}
