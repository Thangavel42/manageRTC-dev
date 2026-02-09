/**
 * PermissionField Component
 * A wrapper component that conditionally renders children based on field permissions
 */

import React, { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { canEditField, canViewField } from '../../config/fieldPermissions';

export interface PermissionFieldProps {
  /** The field name (supports nested fields like 'personal.passport.number') */
  field: string;
  /** Content to render when permission is granted */
  children: ReactNode;
  /** Whether to check edit permissions (default: checks view permissions) */
  editMode?: boolean;
  /** Content to render when permission is denied (default: null) */
  fallback?: ReactNode;
  /** Show a visual indicator when permission is denied (for debugging) */
  showPermissionDenied?: boolean;
}

/**
 * PermissionField - Conditionally render content based on role permissions
 *
 * @example
 * // View mode - checks if user can view the field
 * <PermissionField field="personal.passport.number">
 *   <input value={passportNumber} />
 * </PermissionField>
 *
 * @example
 * // Edit mode - checks if user can edit the field
 * <PermissionField field="personal.passport.number" editMode={true}>
 *   <input value={passportNumber} onChange={handleChange} />
 * </PermissionField>
 *
 * @example
 * // With fallback content
 * <PermissionField field="role" editMode={true} fallback={<span>Read Only</span>}>
 *   <select>...</select>
 * </PermissionField>
 */
export const PermissionField: React.FC<PermissionFieldProps> = ({
  field,
  children,
  editMode = false,
  fallback = null,
  showPermissionDenied = false
}) => {
  const { role } = useAuth();

  // Determine which permission to check
  const hasPermission = editMode
    ? canEditField(role, field)
    : canViewField(role, field);

  if (hasPermission) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show permission denied indicator for debugging (optional)
  if (showPermissionDenied && process.env.NODE_ENV === 'development') {
    return (
      <div
        className="permission-denined-indicator"
        title={`Permission denied for role: ${role}, field: ${field}, mode: ${editMode ? 'edit' : 'view'}`}
        style={{
          border: '1px dashed #ccc',
          padding: '4px 8px',
          backgroundColor: '#f5f5f5',
          color: '#999',
          fontSize: '12px'
        }}
      >
        No Permission ({role} / {field} / {editMode ? 'edit' : 'view'})
      </div>
    );
  }

  return null;
};

/**
 * PermissionSection - A wrapper for sections with multiple fields
 * Checks if user has permission to view/edit ANY field in the section
 */
export interface PermissionSectionProps {
  /** Array of field names in this section */
  fields: string[];
  /** Content to render when permission is granted for any field */
  children: ReactNode;
  /** Whether to check edit permissions (default: checks view permissions) */
  editMode?: boolean;
  /** Content to render when permission is denied for all fields */
  fallback?: ReactNode;
  /** Require all fields to be accessible (default: any field) */
  requireAll?: boolean;
}

export const PermissionSection: React.FC<PermissionSectionProps> = ({
  fields,
  children,
  editMode = false,
  fallback = null,
  requireAll = false
}) => {
  const { role } = useAuth();

  const hasPermission = requireAll
    ? fields.every(field => editMode ? canEditField(role, field) : canViewField(role, field))
    : fields.some(field => editMode ? canEditField(role, field) : canViewField(role, field));

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * withPermission HOC - Higher-order component for adding permission checks
 */
export function withPermission<P extends Record<string, any>>(
  field: string,
  editMode = false
) {
  return function <T extends React.ComponentType<any>>(
    Component: T,
    fallback?: ReactNode
  ): React.FC<P> {
    return function PermissionWrapper(props: P) {
      return (
        <PermissionField field={field} editMode={editMode} fallback={fallback}>
          <Component {...(props as any)} />
        </PermissionField>
      );
    };
  };
}

/**
 * PermissionGroup - Group multiple fields with the same permission check
 */
export interface PermissionGroupProps {
  /** Fields that require permission */
  fields: string[];
  /** Content to render */
  children: ReactNode;
  /** Edit mode flag */
  editMode?: boolean;
  /** Content when no permissions */
  noPermissionContent?: ReactNode;
}

export const PermissionGroup: React.FC<PermissionGroupProps> = ({
  fields,
  children,
  editMode = false,
  noPermissionContent
}) => {
  const { role } = useAuth();

  // Separate fields by permission
  const permittedFields: string[] = [];
  const deniedFields: string[] = [];

  fields.forEach(field => {
    if (editMode ? canEditField(role, field) : canViewField(role, field)) {
      permittedFields.push(field);
    } else {
      deniedFields.push(field);
    }
  });

  return (
    <>
      {children}
      {noPermissionContent && deniedFields.length > 0 && noPermissionContent}
    </>
  );
};

export default PermissionField;
