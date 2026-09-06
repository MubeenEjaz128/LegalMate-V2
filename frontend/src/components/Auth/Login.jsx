import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Lock, Mail, Scale, AlertTriangle, Monitor, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReplaced, setSessionReplaced] = useState(false)
  const [autoLoggedOut, setAutoLoggedOut] = useState(false)
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false)
  const { login, isLoading, error } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  // Check if user was force-logged-out due to login from another device or inactivity
  useEffect(() => {
    if (sessionStorage.getItem('session-replaced') === '1') {
      setSessionReplaced(true)
      sessionStorage.removeItem('session-replaced')
    }
    const autoLogoutReason = sessionStorage.getItem('auto-logout')
    if (autoLogoutReason) {
      setAutoLoggedOut(true)
      sessionStorage.removeItem('auto-logout')
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const onSubmit = async (data) => {
    setAlreadyLoggedIn(false)
    const result = await login(data.email, data.password)
    if (result.success) {
      toast.success('Welcome back')
      navigate(from, { replace: true })
    } else if (result.code === 'ALREADY_LOGGED_IN') {
      setAlreadyLoggedIn(true)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-hero-light" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-accent-300/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-[1.8rem] border border-white/70 bg-white/90 p-7 shadow-strong backdrop-blur-xl sm:p-8"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-glow-primary">
            <Scale className="h-5 w-5" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-secondary-900">Welcome back</h1>
          <p className="mt-1 text-sm text-secondary-600">Sign in to continue managing your legal workflow.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-secondary-700">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input-field pl-9"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs font-medium text-error-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-secondary-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input-field pl-9 pr-10"
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required'
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 transition hover:text-secondary-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs font-medium text-error-600">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm font-semibold text-primary-700 transition hover:text-primary-600">
              Forgot password?
            </Link>
          </div>

          {sessionReplaced && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>Your account was logged in from another device. Only one active session is allowed at a time.</span>
            </div>
          )}

          {autoLoggedOut && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>You were automatically logged out due to inactivity. Please sign in again.</span>
            </div>
          )}

          {alreadyLoggedIn ? (
            <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span>This account is already logged in on another device. Please logout from that device first.</span>
            </div>
          ) : error && (
            <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}

          <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
            {isLoading ? <span className="loading-spinner h-4 w-4 border-2 border-white/20 border-t-white" /> : 'Sign in'}
          </button>

          <p className="text-center text-sm text-secondary-600">
            New to LegalMate?{' '}
            <Link to="/register" className="font-semibold text-primary-700 transition hover:text-primary-600">
              Create account
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}

export default Login
