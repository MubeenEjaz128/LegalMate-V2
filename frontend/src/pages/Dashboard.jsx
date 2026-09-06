import React from 'react'
import { useAuthStore } from '../stores/authStore'
import ClientDashboard from '../components/Dashboards/ClientDashboard'
import LawyerDashboard from '../components/Dashboards/LawyerDashboard'
import AdminDashboard from '../components/Admin/AdminDashboard'

const Dashboard = () => {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">Loading...</h2>
        </div>
      </div>
    )
  }

  // Render different dashboards based on user role
  switch (user.role) {
    case 'client':
      return <ClientDashboard />
    case 'lawyer':
      return <LawyerDashboard />
    case 'admin':
      return <AdminDashboard />
    default:
      return (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-secondary-900 mb-2">Invalid Role</h2>
            <p className="text-secondary-600">Your account role is not recognized.</p>
          </div>
        </div>
      )
  }
}

export default Dashboard 