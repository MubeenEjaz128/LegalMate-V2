import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldX, ArrowLeft, Home } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const AccessDenied = () => {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ShieldX className="mx-auto h-12 w-12 text-error-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-secondary-900">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-secondary-600">
              Sorry, you don't have permission to access this page.
            </p>
            {user && (
              <p className="mt-2 text-xs text-secondary-500">
                Logged in as: <strong>{user.role}</strong>
              </p>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <Link
              to="/dashboard"
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
            <button
              onClick={() => window.history.back()}
              className="w-full flex justify-center items-center py-2 px-4 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied