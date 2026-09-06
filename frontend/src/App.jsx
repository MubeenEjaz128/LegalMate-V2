import React, { Suspense, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import RoleRoute from './components/Auth/RoleRoute'
import Loading from './components/UI/Loading'
import { useAuthStore } from './stores/authStore'

const Home = React.lazy(() => import('./pages/Home'))
const LoginPage = React.lazy(() => import('./pages/LoginPage'))
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'))
const SearchPage = React.lazy(() => import('./pages/SearchPage'))
const BookingPage = React.lazy(() => import('./pages/BookingPage'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const LawyerProfilePage = React.lazy(() => import('./pages/LawyerProfilePage'))
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'))
const PublicProfilePage = React.lazy(() => import('./pages/PublicProfilePage'))
const AppointmentsPage = React.lazy(() => import('./pages/AppointmentsPage'))
const ConsultationPage = React.lazy(() => import('./pages/ConsultationPage'))
const FeedbackPage = React.lazy(() => import('./pages/FeedbackPage'))
const LawyerFeedbackPage = React.lazy(() => import('./pages/LawyerFeedbackPage'))
const ChatPage = React.lazy(() => import('./pages/ChatPage'))
const BalancePage = React.lazy(() => import('./pages/BalancePage'))
const BuyBalancePage = React.lazy(() => import('./pages/BuyBalancePage'))
const SellBalancePage = React.lazy(() => import('./pages/SellBalancePage'))
const BalanceRequestDetailPage = React.lazy(() => import('./pages/BalanceRequestDetailPage'))
const ServicesPage = React.lazy(() => import('./pages/ServicesPage'))
const ContactUsPage = React.lazy(() => import('./pages/ContactUsPage'))
const AboutUsPage = React.lazy(() => import('./pages/AboutUsPage'))
const BlogsPage = React.lazy(() => import('./pages/BlogsPage'))
const BlogDetailPage = React.lazy(() => import('./pages/BlogDetailPage'))
const FAQPage = React.lazy(() => import('./pages/FAQPage'))
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsConditionsPage = React.lazy(() => import('./pages/TermsConditionsPage'))
const DeveloperPage = React.lazy(() => import('./pages/DeveloperPage'))
const VideoCallTest = React.lazy(() => import('./components/VideoCall/VideoCallTest'))

const RouteLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center bg-[var(--surface-base)]">
    <Loading type="dots" size="lg" text="Preparing your workspace..." />
  </div>
)

function App() {
  const { initializeAuth } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      <Suspense fallback={<RouteLoader />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            <Route path="/services" element={<Layout><ServicesPage /></Layout>} />
            <Route path="/contact" element={<Layout><ContactUsPage /></Layout>} />
            <Route path="/about" element={<Layout><AboutUsPage /></Layout>} />
            <Route path="/blogs" element={<Layout><BlogsPage /></Layout>} />
            <Route path="/blogs/:slug" element={<Layout><BlogDetailPage /></Layout>} />
            <Route path="/faq" element={<Layout><FAQPage /></Layout>} />
            <Route path="/privacy" element={<Layout><PrivacyPolicyPage /></Layout>} />
            <Route path="/terms" element={<Layout><TermsConditionsPage /></Layout>} />
            <Route path="/developer" element={<Layout><DeveloperPage /></Layout>} />

            <Route
              path="/search"
              element={
                <RoleRoute allowedRoles={['client']} allowPublic={true}>
                  <Layout><SearchPage /></Layout>
                </RoleRoute>
              }
            />
            <Route
              path="/lawyer/:lawyerId"
              element={
                <RoleRoute allowedRoles={['client', 'lawyer', 'admin']} allowPublic={true}>
                  <Layout><LawyerProfilePage /></Layout>
                </RoleRoute>
              }
            />
            <Route
              path="/lawyer/:lawyerId/reviews"
              element={
                <RoleRoute allowedRoles={['client', 'lawyer', 'admin']} allowPublic={true}>
                  <Layout><LawyerFeedbackPage /></Layout>
                </RoleRoute>
              }
            />

            <Route
              path="/booking/:lawyerId"
              element={
                <RoleRoute allowedRoles={['client']}>
                  <Layout><BookingPage /></Layout>
                </RoleRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout><ProfilePage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <Layout><PublicProfilePage /></Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/appointments"
              element={
                <RoleRoute allowedRoles={['client', 'lawyer']}>
                  <Layout><AppointmentsPage /></Layout>
                </RoleRoute>
              }
            />
            <Route
              path="/consultation/:appointmentId"
              element={
                <RoleRoute allowedRoles={['client', 'lawyer']}>
                  <ConsultationPage />
                </RoleRoute>
              }
            />
            <Route
              path="/feedback/:appointmentId"
              element={
                <RoleRoute allowedRoles={['client']}>
                  <Layout><FeedbackPage /></Layout>
                </RoleRoute>
              }
            />
            <Route
              path="/lawyer/feedback"
              element={
                <RoleRoute allowedRoles={['lawyer']}>
                  <Layout><LawyerFeedbackPage /></Layout>
                </RoleRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <RoleRoute allowedRoles={['client', 'lawyer']}>
                  <Layout><ChatPage /></Layout>
                </RoleRoute>
              }
            />

            <Route
              path="/balance"
              element={
                <ProtectedRoute>
                  <Layout><BalancePage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/buy-balance"
              element={
                <ProtectedRoute>
                  <Layout><BuyBalancePage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sell-balance"
              element={
                <ProtectedRoute>
                  <Layout><SellBalancePage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/balance-request/:id"
              element={
                <ProtectedRoute>
                  <Layout><BalanceRequestDetailPage /></Layout>
                </ProtectedRoute>
              }
            />

            <Route path="/test-video-call" element={<VideoCallTest />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  )
}

export default App
