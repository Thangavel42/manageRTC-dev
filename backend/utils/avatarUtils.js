/**
 * Avatar Utilities
 *
 * Standardized avatar handling across all components.
 * Provides consistent fallback logic for missing avatars.
 */

/**
 * System default avatar path
 * This is the default avatar assigned to users who have no custom avatar
 * It cannot be deleted by users (system protected)
 */
export const SYSTEM_DEFAULT_AVATAR = 'assets/img/profiles/profile.png';

/**
 * Default avatar paths
 */
export const DEFAULT_AVATARS = {
  EMPLOYEE: SYSTEM_DEFAULT_AVATAR,
  CLIENT: 'assets/img/profiles/default-client.png',
  COMPANY: 'assets/img/icons/company-icon-default.svg',
  USER: SYSTEM_DEFAULT_AVATAR
};

/**
 * Get avatar URL with fallback
 * Returns the provided avatar if valid, otherwise returns a default based on type
 *
 * @param {string|null|undefined} avatar - The avatar path from database
 * @param {string} type - The type of entity ('employee', 'client', 'company', 'user')
 * @param {string} name - Optional name for generating initials avatar
 * @returns {string} The avatar URL to use
 */
export function getAvatarWithFallback(avatar, type = 'user', name = '') {
  // If avatar is provided and valid, use it
  if (avatar && avatar.trim() !== '' && !avatar.includes('avatar-24.jpg') && !avatar.includes('avatar-31.jpg')) {
    // Return actual avatar if it's not one of the old placeholder patterns
    return avatar;
  }

  // Use type-based default
  const defaultKey = `${type.toUpperCase()}_AVATAR`;
  const defaultAvatar = DEFAULT_AVATARS[defaultKey] || DEFAULT_AVATARS.USER;

  return defaultAvatar;
}

/**
 * Generate initials-based avatar data
 * Useful for when no image is available but you want to show initials
 *
 * @param {string} name - The name to generate initials from
 * @param {string} backgroundColor - Optional background color (hex)
 * @returns {object} Avatar data with initials and color
 */
export function generateInitialsAvatar(name, backgroundColor = null) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  // Get initials (first letter of first two words)
  const initials = name
    .split(' ')
    .filter(word => word.length > 0)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');

  // Use provided color or pick one based on initials (consistent)
  const colorIndex = initials
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  return {
    type: 'initials',
    initials,
    backgroundColor: backgroundColor || colors[colorIndex],
    textColor: '#FFFFFF'
  };
}

/**
 * Validate if an avatar path is valid
 * Checks for placeholder patterns and empty values
 *
 * @param {string} avatar - The avatar path to validate
 * @returns {boolean} True if avatar is valid
 */
export function isValidAvatar(avatar) {
  if (!avatar || avatar.trim() === '') {
    return false;
  }

  // Check for old placeholder patterns
  const invalidPatterns = [
    'avatar-24.jpg',
    'avatar-31.jpg',
    'default_avatar.png',
    'nul',
    'null',
    'undefined'
  ];

  // Check for numbered avatar patterns (e.g., avatar-12.jpg, avatar-01.jpg, etc.)
  if (/avatar-\d+\.jpg/i.test(avatar)) {
    return false;
  }

  return !invalidPatterns.some(pattern => avatar.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * Get complete avatar object for API responses
 * Returns either the image path or initials data for frontend rendering
 *
 * @param {object} entity - The entity (employee, client, etc.)
 * @param {string} type - The type of entity
 * @returns {object} Avatar object for API response
 */
export function getAvatarForApiResponse(entity, type = 'user') {
  const avatar = entity?.avatar;
  const name = entity?.name || entity?.firstName || entity?.companyName || '';

  if (isValidAvatar(avatar)) {
    return {
      type: 'image',
      url: avatar
    };
  }

  // Generate initials avatar as fallback
  const initialsData = generateInitialsAvatar(name);

  return {
    type: 'initials',
    ...initialsData,
    fallbackUrl: DEFAULT_AVATARS[`${type.toUpperCase()}_AVATAR`] || DEFAULT_AVATARS.USER
  };
}

/**
 * Middleware/helper to sanitize avatar paths before saving to database
 * Removes invalid placeholder values
 *
 * @param {string} avatar - The avatar path to sanitize
 * @returns {string|null} Sanitized avatar or null if invalid
 */
export function sanitizeAvatarInput(avatar) {
  if (!avatar || avatar.trim() === '') {
    return null;
  }

  // Remove invalid placeholder values
  const invalidValues = [
    'avatar-24.jpg',
    'avatar-31.jpg',
    'default_avatar.png',
    'nul',
    'null',
    'undefined',
    'assets/img/profiles/avatar-24.jpg',
    'assets/img/profiles/avatar-31.jpg'
  ];

  const normalized = avatar.trim().toLowerCase();

  if (invalidValues.some(invalid => normalized.includes(invalid.toLowerCase()))) {
    return null;
  }

  return avatar;
}

/**
 * Update entity avatar with validation
 * Use this when updating employee/client/company records
 *
 * @param {object} entity - The entity being updated
 * @param {string} newAvatar - The new avatar path
 * @returns {object} Update object for MongoDB
 */
export function createAvatarUpdate(entity, newAvatar) {
  const sanitized = sanitizeAvatarInput(newAvatar);

  if (sanitized === null && !entity?.avatar) {
    // No avatar before and after - don't include in update
    return {};
  }

  if (sanitized === null) {
    // Explicitly removing avatar
    return { $unset: { avatar: '' } };
  }

  return {
    $set: {
      avatar: sanitized,
      updatedAt: new Date()
    }
  };
}

/**
 * Check if an avatar path is the system default avatar
 * Used to prevent users from deleting the default avatar
 *
 * @param {string} avatar - The avatar path to check
 * @returns {boolean} True if the avatar is the system default
 */
export function isSystemDefaultAvatar(avatar) {
  if (!avatar) return false;

  // Check various forms the system default avatar could be stored as
  const systemDefaults = [
    SYSTEM_DEFAULT_AVATAR,
    `/${SYSTEM_DEFAULT_AVATAR}`,
    `/${SYSTEM_DEFAULT_AVATAR}`,
    SYSTEM_DEFAULT_AVATAR
  ];

  return systemDefaults.some(def => avatar.includes(def));
}

/**
 * Get the system default avatar URL
 * Returns the public URL for the default profile image
 *
 * @returns {string} The default avatar URL
 */
export function getSystemDefaultAvatarUrl() {
  return `/${SYSTEM_DEFAULT_AVATAR}`;
}

/**
 * Check if user has a custom avatar (not the system default)
 *
 * @param {object} employee - The employee object
 * @returns {boolean} True if user has a custom avatar
 */
export function hasCustomAvatar(employee) {
  const avatar = employee?.profileImage || employee?.avatar;

  if (!avatar || avatar.trim() === '') {
    return false; // No avatar at all
  }

  // Check if it's the system default
  return !isSystemDefaultAvatar(avatar);
}

/**
 * Assign default avatar to an employee if they don't have one
 * Use this when creating employees or after avatar deletion
 *
 * @param {object} employee - The employee object
 * @returns {object} Update object for MongoDB (use with $set if needed)
 */
export function ensureDefaultAvatar(employee) {
  const currentAvatar = employee?.profileImage || employee?.avatar;

  // If user has a custom avatar, don't override
  if (currentAvatar && !isSystemDefaultAvatar(currentAvatar)) {
    return {
      hasAvatar: true,
      needsUpdate: false
    };
  }

  // User has no avatar or has system default, ensure default is set
  const defaultAvatar = getSystemDefaultAvatarUrl();

  // Check if update is needed
  const needsUpdate = !currentAvatar || isSystemDefaultAvatar(currentAvatar);

  return {
    hasAvatar: false,
    needsUpdate,
    defaultAvatar,
    updateValue: needsUpdate ? {
      profileImage: defaultAvatar,
      profileImagePath: null, // Default is served as static, not uploaded
      updatedAt: new Date()
    } : null
  };
}

/**
 * Check if an avatar can be deleted by the user
 * Users cannot delete the system default avatar
 *
 * @param {string} avatarPath - The avatar path to check
 * @returns {object} { canDelete: boolean, reason: string }
 */
export function canUserDeleteAvatar(avatarPath) {
  if (!avatarPath) {
    return { canDelete: true, reason: 'No avatar to delete' };
  }

  if (isSystemDefaultAvatar(avatarPath)) {
    return {
      canDelete: false,
      reason: 'Cannot delete system default avatar'
    };
  }

  return { canDelete: true, reason: null };
}

export default {
  getAvatarWithFallback,
  generateInitialsAvatar,
  isValidAvatar,
  getAvatarForApiResponse,
  sanitizeAvatarInput,
  createAvatarUpdate,
  DEFAULT_AVATARS,
  SYSTEM_DEFAULT_AVATAR,
  isSystemDefaultAvatar,
  getSystemDefaultAvatarUrl,
  hasCustomAvatar,
  ensureDefaultAvatar,
  canUserDeleteAvatar
};
