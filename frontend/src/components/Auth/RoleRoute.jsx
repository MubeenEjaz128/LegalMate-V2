import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import useAutoLogout from '../../hooks/useAutoLogout'
import AccessDenied from './AccessDenied'

const RoleRoute = ({ children, allowedRoles, allowPublic = false, showDenied = false }) => {
  const { isAuthenticated, hasAnyRole, user } = useAuthStore()
  useAutoLogout()

  // If public access is allowed and user is not authenticated, allow access
  if (allowPublic && !isAuthenticated) {
    return children
  }

  // If not authenticated and public access not allowed, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If authenticated but doesn't have required role
  if (!hasAnyRole(allowedRoles)) {
    // Show access denied page if requested
    if (showDenied) {
      return <AccessDenied />
    }
    // Otherwise redirect to dashboard - all roles have access to dashboard
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default RoleRoute 