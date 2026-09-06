import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  Menu, X, User, LogOut, Settings, Search, Scale, Calendar,
  MessageCircle, Wallet, PlusCircle, ArrowDownCircle, ChevronDown,
  BarChart3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Footer from './Footer'
import NotificationMenu from '../Notifications/NotificationMenu'
import FloatingChatbot from '../Chatbot/FloatingChatbot'

const Layout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()

  // Glassmorphism navbar on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
  }

  const navigation = [
    { name: 'Home', href: '/', public: true, roles: ['client', 'lawyer', 'admin'] },
    { name: 'Find Lawyers', href: '/search', public: true, roles: ['client'] },
    { name: 'Services', href: '/services', public: true, roles: ['client', 'lawyer', 'admin'] },
    { name: 'Dashboard', href: '/dashboard', public: false, roles: ['client', 'lawyer', 'admin'] },
  ]

  const filteredNavigation = navigation.filter(item => {
    if (item.public && !isAuthenticated) return true
    if (!isAuthenticated) return false
    if (!user) return false
    return item.roles.includes(user.role)
  })

  const isActive = (href) => location.pathname === href

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* ─── Navbar ─────────────────────────────────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-soft'
            : 'bg-transparent'
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 lg:h-[4.5rem]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-all duration-300 group-hover:scale-105">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-secondary-900 tracking-tight">
                Legal<span className="text-primary-600">Mate</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-primary-700 bg-primary-50/80'
                      : 'text-secondary-600 hover:text-primary-700 hover:bg-primary-50/50'
                  }`}
                >
                  {item.name}
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {user?.role !== 'admin' && <NotificationMenu />}

                  {/* User dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(prev => !prev)}
                      className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-full hover:bg-secondary-100/60 transition-all duration-200"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm font-semibold">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-secondary-700 max-w-[120px] truncate">
                        {user?.name}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-secondary-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <>
                          {/* Backdrop */}
                          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />

                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute right-0 mt-2 w-64 z-50 bg-white/90 backdrop-blur-xl rounded-2xl shadow-elevated border border-secondary-100/80 py-2 overflow-hidden"
                          >
                            {/* User info header */}
                            <div className="px-4 py-3 border-b border-secondary-100">
                              <p className="text-sm font-semibold text-secondary-900 truncate">{user?.name}</p>
                              <p className="text-xs text-secondary-500 truncate">{user?.email}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-primary-100 text-primary-700">
                                {user?.role}
                              </span>
                            </div>

                            <div className="py-1">
                              <DropdownLink to="/dashboard" icon={User} label="Dashboard" onClick={() => setDropdownOpen(false)} />
                              <DropdownLink to="/profile" icon={Settings} label="Settings" onClick={() => setDropdownOpen(false)} />

                              {(user?.role === 'client' || user?.role === 'lawyer') && (
                                <>
                                  <DropdownLink to="/appointments" icon={Calendar} label="Appointments" onClick={() => setDropdownOpen(false)} />
                                  <DropdownLink to="/chat" icon={MessageCircle} label="Chat" onClick={() => setDropdownOpen(false)} />
                                </>
                              )}
                            </div>

                            {/* Balance section */}
                            <div className="border-t border-secondary-100 py-1">
                              <p className="px-4 py-1.5 text-2xs font-bold text-secondary-400 uppercase tracking-widest">Balance</p>
                              <DropdownLink to="/balance" icon={Wallet} label="My Balance" onClick={() => setDropdownOpen(false)} />
                              {(user?.role === 'client' || user?.role === 'lawyer') && (
                                <>
                                  <DropdownLink to="/buy-balance" icon={PlusCircle} label="Buy Balance" onClick={() => setDropdownOpen(false)} />
                                  <DropdownLink to="/sell-balance" icon={ArrowDownCircle} label="Sell Balance" onClick={() => setDropdownOpen(false)} />
                                </>
                              )}
                              {user?.role === 'admin' && (
                                <DropdownLink to="/dashboard" icon={BarChart3} label="Admin Dashboard" onClick={() => setDropdownOpen(false)} />
                              )}
                            </div>

                            <div className="border-t border-secondary-100 pt-1">
                              <button
                                onClick={handleLogout}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-secondary-600 hover:bg-error-50 hover:text-error-600 transition-colors gap-3"
                              >
                                <LogOut className="h-4 w-4" />
                                Sign out
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-secondary-600 hover:text-primary-700 px-4 py-2 rounded-xl hover:bg-primary-50/50 transition-all duration-200"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm !py-2.5 !px-5 !rounded-xl"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl text-secondary-600 hover:bg-primary-50/60 hover:text-primary-700 transition-all duration-200"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* ─── Mobile Navigation ──────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden bg-white/95 backdrop-blur-xl border-t border-secondary-100 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? 'text-primary-700 bg-primary-50'
                        : 'text-secondary-700 hover:text-primary-700 hover:bg-primary-50/60'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}

                {isAuthenticated ? (
                  <div className="pt-3 border-t border-secondary-100 mt-3 space-y-1">
                    <div className="flex items-center px-4 py-3 gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-secondary-900 truncate">{user?.name}</p>
                        <p className="text-xs text-secondary-500 truncate">{user?.email}</p>
                      </div>
                    </div>

                    <MobileNavLink to="/dashboard" icon={User} label="Dashboard" />
                    <MobileNavLink to="/profile" icon={Settings} label="Settings" />

                    {(user?.role === 'client' || user?.role === 'lawyer') && (
                      <>
                        <MobileNavLink to="/appointments" icon={Calendar} label="Appointments" />
                        <MobileNavLink to="/chat" icon={MessageCircle} label="Chat" />
                      </>
                    )}

                    <div className="pt-3 border-t border-secondary-100 mt-3">
                      <p className="px-4 py-1.5 text-xs font-bold text-secondary-400 uppercase tracking-widest">Balance</p>
                      <MobileNavLink to="/balance" icon={Wallet} label="My Balance" />
                      <MobileNavLink to="/buy-balance" icon={PlusCircle} label="Buy Balance" />
                      <MobileNavLink to="/sell-balance" icon={ArrowDownCircle} label="Sell Balance" />
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-base font-medium text-secondary-700 hover:text-error-600 hover:bg-error-50 rounded-xl transition-all duration-200 gap-3 mt-2"
                    >
                      <LogOut className="h-5 w-5" /> Sign out
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-secondary-100 mt-3 space-y-2">
                    <Link to="/login" className="block px-4 py-3 text-base font-medium text-secondary-700 hover:text-primary-700 hover:bg-primary-50/60 rounded-xl transition-all duration-200">
                      Sign in
                    </Link>
                    <Link to="/register" className="block text-center btn-primary !py-3">
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── Spacer for fixed navbar ──────────────────── */}
      <div className="h-16 lg:h-[4.5rem]" />

      {/* ─── Main Content ─────────────────────────────── */}
      <main className="min-h-[60vh]">
        {children}
      </main>

      {/* ─── Footer ───────────────────────────────────── */}
      <Footer />
      <FloatingChatbot />
    </div>
  )
}

/* ── Dropdown link helper ──────────────────────────────── */
const DropdownLink = ({ to, icon: Icon, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary-600 hover:bg-primary-50/60 hover:text-primary-700 transition-colors"
  >
    <Icon className="h-4 w-4" />
    {label}
  </Link>
)

/* ── Mobile nav link helper ────────────────────────────── */
const MobileNavLink = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-secondary-700 hover:text-primary-700 hover:bg-primary-50/60 rounded-xl transition-all duration-200"
  >
    <Icon className="h-5 w-5" />
    {label}
  </Link>
)

export default Layout
