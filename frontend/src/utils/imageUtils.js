/**
 * Helper function to get the correct profile picture URL
 * Handles both legacy full file paths and new relative paths
 * @param {string} profilePicture - The profile picture path from the database
 * @param {string} role - The user role ('client' or 'lawyer') for default avatar
 * @returns {string} - The correct URL for the profile picture
 */
export const getProfilePictureUrl = (profilePicture, role = 'client') => {
  const defaultAvatar = role === 'lawyer' ? '/default-lawyer.svg' : '/default-client.svg';
  
  if (!profilePicture) return defaultAvatar;
  if (profilePicture.startsWith('http')) return profilePicture;
  
  // Handle full Windows file paths (legacy data)
  if (profilePicture.includes('C:') || profilePicture.includes('\\')) {
    const relPath = profilePicture.replace(/^.*uploads[\\/]/, 'uploads/');
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    return `${apiBase}/${relPath}`;
  }
  
  // Handle relative paths that start with 'uploads/'
  if (profilePicture.startsWith('uploads/')) {
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    return `${apiBase}/${profilePicture}`;
  }
  
  return defaultAvatar;
}

/**
 * Helper function for profile picture URL with file preview support
 * @param {string} profilePicture - The profile picture path from the database
 * @param {File} profilePicFile - Selected file for preview
 * @returns {string} - The correct URL for the profile picture or preview
 */
export const getProfilePictureUrlWithPreview = (profilePicture, profilePicFile) => {
  if (profilePicFile && typeof profilePicFile === 'object') {
    // Show preview if a new file is selected
    return URL.createObjectURL(profilePicFile);
  }
  if (!profilePicture) return '/default-avatar.png';
  if (profilePicture.startsWith('blob:')) return profilePicture;
  
  return getProfilePictureUrl(profilePicture);
}