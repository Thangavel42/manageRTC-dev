/**
 * Loading States Component Library
 *
 * Provides consistent loading UI components across the application
 * Includes spinners, skeleton screens, and loading overlays
 */

import React from 'react';

// ============================================
// BASIC SPINNER
// ============================================

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  centered?: boolean;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  centered = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg', // Note: Bootstrap doesn't have lg by default, handled below
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-info',
  };

  const sizeStyle = size === 'lg' ? { width: '3rem', height: '3rem' } : {};

  const spinner = (
    <div
      className={`spinner-border ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      style={sizeStyle}
      role="status"
    >
      <span className="visually-hidden">Loading...</span>
    </div>
  );

  if (centered) {
    return (
      <div className="d-flex justify-content-center align-items-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// ============================================
// PAGE LOADING OVERLAY
// ============================================

export interface PageLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  const containerStyle = fullScreen
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
      }
    : {
        minHeight: '400px',
      };

  return (
    <div className="d-flex flex-column justify-content-center align-items-center" style={containerStyle}>
      <Spinner size="lg" />
      {message && <p className="mt-3 text-muted">{message}</p>}
    </div>
  );
};

// ============================================
// SKELETON LOADER COMPONENTS
// ============================================

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  count = 1,
  className = '',
  animation = 'pulse',
}) => {
  const animationClass = animation === 'pulse' ? 'animate-pulse' : animation === 'wave' ? 'animate-wave' : '';

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`skeleton-loader ${animationClass} ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}
    />
  ));

  return <>{skeletons}</>;
};

// ============================================
// CARD SKELETON
// ============================================

export interface CardSkeletonProps {
  showAvatar?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  lines?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showAvatar = true,
  showTitle = true,
  showSubtitle = true,
  lines = 3,
}) => (
  <div className="card border-0">
    <div className="card-body">
      <div className="d-flex align-items-center mb-3">
        {showAvatar && (
          <div
            className="skeleton-loader animate-pulse rounded-circle me-3"
            style={{ width: '48px', height: '48px' }}
          />
        )}
        <div className="flex-grow-1">
          {showTitle && (
            <Skeleton width="60%" height="1.1rem" className="mb-2" />
          )}
          {showSubtitle && (
            <Skeleton width="40%" height="0.9rem" />
          )}
        </div>
      </div>
      <Skeleton count={lines} height="0.9rem" />
    </div>
  </div>
);

// ============================================
// TABLE SKELETON
// ============================================

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
}) => (
  <div className="table-responsive">
    <table className="table">
      {showHeader && (
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <Skeleton width="80%" height="1.5rem" />
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex}>
                <Skeleton width="60%" height="1rem" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ============================================
// DASHBOARD CARD SKELETON
// ============================================

export interface DashboardCardSkeletonProps {
  showIcon?: boolean;
}

export const DashboardCardSkeleton: React.FC<DashboardCardSkeletonProps> = ({ showIcon = true }) => (
  <div className="card border-0">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Skeleton width="120px" height="1rem" className="mb-2" />
          <Skeleton width="80px" height="1.5rem" />
        </div>
        {showIcon && (
          <div
            className="skeleton-loader animate-pulse"
            style={{ width: '48px', height: '48px', borderRadius: '10px' }}
          />
        )}
      </div>
      <Skeleton width="100%" height="4px" className="mb-2" />
      <Skeleton width="60%" height="0.8rem" />
    </div>
  </div>
);

// ============================================
// CHART SKELETON
// ============================================

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '300px' }) => (
  <div className="card border-0">
    <div className="card-header">
      <Skeleton width="150px" height="1.2rem" />
    </div>
    <div className="card-body">
      <div
        className="skeleton-loader animate-pulse"
        style={{ width: '100%', height, borderRadius: '8px' }}
      />
    </div>
  </div>
);

// ============================================
// LIST SKELETON
// ============================================

export const ListSkeleton: React.FC<{ items?: number; showAvatar?: boolean }> = ({
  items = 5,
  showAvatar = true,
}) => (
  <div className="list-group list-group-flush">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="list-group-item d-flex align-items-center">
        {showAvatar && (
          <div
            className="skeleton-loader animate-pulse rounded-circle me-3"
            style={{ width: '40px', height: '40px' }}
          />
        )}
        <div className="flex-grow-1">
          <Skeleton width="60%" height="1rem" className="mb-2" />
          <Skeleton width="40%" height="0.8rem" />
        </div>
      </div>
    ))}
  </div>
);

// ============================================
// FORM SKELETON
// ============================================

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="card border-0">
    <div className="card-body">
      <Skeleton width="150px" height="1.5rem" className="mb-4" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="mb-3">
          <Skeleton width="100px" height="0.9rem" className="mb-2" />
          <Skeleton width="100%" height="2.5rem" />
        </div>
      ))}
      <Skeleton width="100px" height="2.5rem" className="mt-4" />
    </div>
  </div>
);

// ============================================
// LOADING OVERLAY
// ============================================

export interface LoadingOverlayProps {
  loading: boolean;
  message?: string;
  children: React.ReactNode;
  blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  message = 'Loading...',
  children,
  blur = true,
}) => {
  if (!loading) return <>{children}</>;

  return (
    <div className="position-relative">
      <div style={{ filter: blur ? 'blur(2px)' : 'none', opacity: blur ? 0.5 : 1 }}>
        {children}
      </div>
      <div
        className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-white bg-opacity-75"
        style={{ zIndex: 10 }}
      >
        <Spinner size="lg" />
        {message && <p className="mt-3 text-muted">{message}</p>}
      </div>
    </div>
  );
};

// ============================================
// INLINE LOADING (for buttons, etc.)
// ============================================

export const InlineLoading: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <span className="spinner-border spinner-border-sm me-2" role="status" style={{ width: size, height: size }}>
    <span className="visually-hidden">Loading...</span>
  </span>
);

// ============================================
// DOT PULSE LOADER
// ============================================

export const DotPulseLoader: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="d-flex align-items-center gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-circle bg-primary"
        style={{
          width: '10px',
          height: '10px',
          animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite both`,
        }}
      />
    ))}
    <style>{`
      @keyframes pulse {
        0%, 80%, 100% {
          transform: scale(0);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `}</style>
  </div>
);

// ============================================
// PROGRESS BAR LOADER
// ============================================

export const ProgressBarLoader: React.FC<{ progress?: number; label?: string }> = ({
  progress,
  label,
}) => (
  <div className="w-100">
    {(label || progress !== undefined) && (
      <div className="d-flex justify-content-between mb-1">
        <small>{label || 'Loading...'}</small>
        {progress !== undefined && <small>{progress}%</small>}
      </div>
    )}
    <div className="progress" style={{ height: '6px' }}>
      <div
        className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
        role="progressbar"
        style={{ width: `${progress ?? 100}%` }}
      />
    </div>
  </div>
);

// ============================================
// HOC: With Loading
// ============================================

export interface WithLoadingProps {
  loading?: boolean;
  loadingComponent?: React.ReactNode;
}

export function withLoading<P extends object>(
  Component: React.ComponentType<P>,
  loadingComponent?: React.ReactNode
): React.ComponentType<P & WithLoadingProps> {
  return ({ loading, loadingComponent: customLoadingComponent, ...props }: P & WithLoadingProps) => {
    if (loading) {
      return <>{customLoadingComponent || loadingComponent || <PageLoading />}</>;
    }
    return <Component {...(props as P)} />;
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  Spinner,
  PageLoading,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  DashboardCardSkeleton,
  ChartSkeleton,
  ListSkeleton,
  FormSkeleton,
  LoadingOverlay,
  InlineLoading,
  DotPulseLoader,
  ProgressBarLoader,
  withLoading,
};
