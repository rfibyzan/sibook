import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()
  const { signIn, session } = useAuth()

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    const { error } = await signIn(email, password)

    if (error) {
      setErrorMsg(error) // Menampilkan pesan asli dari Supabase
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    navigate('/dashboard')
  }

  return (
    <main className="min-h-screen bg-surface-container flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-[420px]">
        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] p-8 flex flex-col gap-8">

          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center mb-2">
              <span
                className="material-symbols-outlined text-primary-container"
                style={{ fontSize: '24px' }}
              >
                menu_book
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface text-center m-0 p-0">
              SIBOOK
            </h1>
            <p className="font-body-md text-body-md text-secondary text-center m-0 p-0">
              System Inventory Bookstore
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg flex items-center gap-2 font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form className="flex flex-col gap-stack-loose" onSubmit={handleSubmit}>

            {/* Email field */}
            <div className="flex flex-col gap-base">
              <label
                className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-wider"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Masukkan email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 px-table-cell-padding-x rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-outline transition-colors duration-150"
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-base">
              <label
                className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-wider"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-table-cell-padding-x pr-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-outline transition-colors duration-150"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors duration-150 focus:outline-none"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>


            {/* Submit button */}
            <button
              type="submit"
              id="login-btn"
              disabled={isLoading}
              className="w-full h-10 mt-4 rounded-lg bg-primary-container text-on-primary font-title-sm text-title-sm flex items-center justify-center gap-2 hover:bg-primary focus:ring-2 focus:ring-offset-2 focus:ring-primary-container outline-none transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-on-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="font-body-sm text-body-sm text-secondary">
            Secure access for authorized personnel only.
          </p>
        </div>
      </div>
    </main>
  )
}
