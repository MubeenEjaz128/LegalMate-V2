import { useAuthStore } from '../stores/authStore'

export const useRoleAccess = () => {
  const { user, hasAnyRole } = useAuthStore()

  const hasRole = (role) => {
    return user?.role === role
  }

  const hasAnyRoles = (roles) => {
    return hasAnyRole(roles)
  }

  const canAccessClientFeatures = () => {
    return hasRole('client')
  }

  const canAccessLawyerFeatures = () => {
    return hasRole('lawyer')
  }

  const canAccessAdminFeatures = () => {
    return hasRole('admin')
  }

  const canAccessAppointments = () => {
    return hasAnyRoles(['client', 'lawyer'])
  }

  const canAccessChat = () => {
    return hasAnyRoles(['client', 'lawyer'])
  }

  const canViewLawyers = () => {
    return hasRole('client')
  }

  const canBookAppointments = () => {
    return hasRole('client')
  }

  return {
    user,
    hasRole,
    hasAnyRoles,
    canAccessClientFeatures,
    canAccessLawyerFeatures,
    canAccessAdminFeatures,
    canAccessAppointments,
    canAccessChat,
    canViewLawyers,
    canBookAppointments
  }
}