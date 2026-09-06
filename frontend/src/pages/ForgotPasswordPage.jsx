import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Scale } from 'lucide-react'
import api from '../services/api'

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      await api.post('/auth/forgot-password', { email })
      setMessage('Reset link sent. Please check your inbox.')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-hero-light px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-accent-300/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-[1.8rem] border border-white/70 bg-white/90 p-7 shadow-strong backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-glow-primary">
            <Scale className="h-5 w-5" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-secondary-900">Forgot password</h1>
          <p className="mt-2 text-sm text-secondary-600">Enter your account email and we will send a reset link.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-secondary-700">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-field pl-9"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {message && <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{message}</div>}
          {error && <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}

          <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
            {isLoading ? <span className="loading-spinner h-4 w-4 border-2 border-white/20 border-t-white" /> : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-secondary-600">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-primary-700 transition hover:text-primary-600">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
