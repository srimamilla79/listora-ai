// src/components/AuthForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, Building, Sparkles } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const isSignup = mode === 'signup'

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    return {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
      isValid:
        minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial,
    }
  }

  const passwordValidation = validatePassword(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supabase) {
      setError('Please wait for the component to load')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isSignup) {
        // Signup validation
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error('First name and last name are required')
        }

        if (!passwordValidation.isValid) {
          throw new Error('Password must meet all requirements')
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              company: company || null,
              full_name: `${firstName} ${lastName}`.trim(),
            },
          },
        })

        if (error) throw error

        if (data.user && !data.session) {
          // Email confirmation required
          setError(
            'Please check your email and click the confirmation link to complete your registration.'
          )
        } else {
          // Auto-signed in, redirect to generate
          router.push('/generate')
        }
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Successful login, redirect to generate
        router.push('/generate')
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(error.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Please wait for the component to load')
      return
    }

    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/generate`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      console.error('Google sign in error:', error)
      setError(error.message || 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  // ✅ Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-purple-400 mr-3" />
            <h1 className="text-4xl font-bold text-white">Listora AI</h1>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            {isSignup ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            {isSignup
              ? 'Start generating amazing content today'
              : 'Welcome back! Generate content with AI'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 border border-white/30 rounded-xl text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/30" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-300">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Name Fields for Signup */}
            {isSignup && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="sr-only">
                    First name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required={isSignup}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-white/30 placeholder-gray-400 text-white rounded-xl bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="First name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="sr-only">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required={isSignup}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 border border-white/30 placeholder-gray-400 text-white rounded-xl bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                    placeholder="Last name"
                  />
                </div>
              </div>
            )}

            {/* Company Field for Signup */}
            {isSignup && (
              <div>
                <label htmlFor="company" className="sr-only">
                  Company (optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-white/30 placeholder-gray-400 text-white rounded-xl bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                    placeholder="Company (optional)"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-white/30 placeholder-gray-400 text-white rounded-xl bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-white/30 placeholder-gray-400 text-white rounded-xl bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements for Signup */}
            {isSignup && password && (
              <div className="text-xs space-y-1">
                <div
                  className={`flex items-center ${
                    passwordValidation.minLength
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="mr-2">
                    {passwordValidation.minLength ? '✓' : '○'}
                  </span>
                  At least 8 characters
                </div>
                <div
                  className={`flex items-center ${
                    passwordValidation.hasUppercase
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="mr-2">
                    {passwordValidation.hasUppercase ? '✓' : '○'}
                  </span>
                  One uppercase letter
                </div>
                <div
                  className={`flex items-center ${
                    passwordValidation.hasLowercase
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="mr-2">
                    {passwordValidation.hasLowercase ? '✓' : '○'}
                  </span>
                  One lowercase letter
                </div>
                <div
                  className={`flex items-center ${
                    passwordValidation.hasNumber
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="mr-2">
                    {passwordValidation.hasNumber ? '✓' : '○'}
                  </span>
                  One number
                </div>
                <div
                  className={`flex items-center ${
                    passwordValidation.hasSpecial
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="mr-2">
                    {passwordValidation.hasSpecial ? '✓' : '○'}
                  </span>
                  One special character
                </div>
              </div>
            )}

            {/* Confirm Password for Signup */}
            {isSignup && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required={isSignup}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-white/30 placeholder-gray-400 text-white rounded-xl bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">
                    Passwords do not match
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : isSignup ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* Toggle Mode */}
            <div className="text-center">
              <span className="text-gray-300 text-sm">
                {isSignup
                  ? 'Already have an account? '
                  : "Don't have an account? "}
              </span>
              <button
                type="button"
                onClick={() => router.push(isSignup ? '/login' : '/signup')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors duration-200"
              >
                {isSignup ? 'Sign in' : 'Sign up'}
              </button>
            </div>

            {/* Terms for Signup */}
            {isSignup && (
              <div className="text-center text-xs text-gray-400">
                By creating an account, you agree to our{' '}
                <a
                  href="/terms"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Privacy Policy
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
