import React from "react";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../imageWithBasePath";

interface EmployeeNameCellProps {
  /** Employee's display name */
  name: string;
  /** Employee's profile image URL (optional) */
  image?: string | null;
  /** Employee's database ID for navigation */
  employeeId: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Avatar size variant */
  avatarSize?: "sm" | "md" | "lg";
  /** Avatar color theme for fallback initial */
  avatarTheme?: "primary" | "danger" | "success" | "warning" | "info" | "secondary";
  /** Optional secondary text (e.g., role, designation) */
  secondaryText?: string;
  /** Whether to show the link or just the text */
  showLink?: boolean;
}

/**
 * EmployeeNameCell Component
 *
 * A reusable component for displaying employee profile image and name
 * consistently across all list-based views (employees, promotions, resignations, etc.)
 *
 * Features:
 * - Displays profile image with automatic fallback to initial avatar
 * - Handles empty, null, or invalid image URLs gracefully
 * - Consistent styling and layout
 * - Supports navigation to employee detail page
 * - Customizable avatar size and color theme
 *
 * @example
 * ```tsx
 * <EmployeeNameCell
 *   name="John Doe"
 *   image="https://example.com/avatar.jpg"
 *   employeeId="507f1f77bcf86cd799439011"
 *   avatarTheme="primary"
 * />
 * ```
 */
const EmployeeNameCell: React.FC<EmployeeNameCellProps> = ({
  name,
  image,
  employeeId,
  className = "",
  avatarSize = "md",
  avatarTheme = "primary",
  secondaryText,
  showLink = true,
}) => {
  // Validate image URL - check if it's a valid non-empty string
  const hasValidImage = image && typeof image === "string" && image.trim() !== "";
  // Use a consistent default avatar when no image is present
  const fallbackImage = 'assets/img/profiles/profile.png';
  const displayImage = hasValidImage ? image! : fallbackImage;

  // Avatar size classes
  const avatarSizeClass = `avatar-${avatarSize}`;

  // Theme color classes for fallback avatar
  const avatarThemeClass = `bg-${avatarTheme}-transparent`;
  const textThemeClass = `text-${avatarTheme}`;

  return (
    <div className={`d-flex align-items-center ${className}`}>
      {/* Profile Image or Fallback Avatar */}
      <div className={`avatar ${avatarSizeClass} me-2`}>
        <ImageWithBasePath
          src={displayImage}
          className="rounded-circle img-fluid"
          alt={name}
          isLink={true}
        />
      </div>

      {/* Name and Optional Secondary Text */}
      <div className="flex-grow-1">
        {showLink ? (
          <Link
            to={`/employees/${employeeId}`}
            className="fw-medium text-dark d-block text-decoration-none"
          >
            {name}
          </Link>
        ) : (
          <p className="fw-medium text-dark mb-0">{name}</p>
        )}
        {secondaryText && (
          <span className="fs-12 text-muted d-block">{secondaryText}</span>
        )}
      </div>
    </div>
  );
};

export default EmployeeNameCell;
