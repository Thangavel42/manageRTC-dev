import { Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { all_routes } from "./all_routes";

const routes = all_routes;

// Define role-based redirects
const ROLE_REDIRECTS: Record<string, string> = {
  superadmin: routes.superAdminDashboard,
  admin: routes.adminDashboard,
  hr: routes.hrDashboard,
  manager: routes.adminDashboard,
  leads: routes.leadsDashboard,
  employee: routes.employeeDashboard,
  public: routes.login,
};

export const withRoleCheck = (Component, allowedRoles: string[] = []) => {
  return function WrappedComponent(props) {
    const { isLoaded, user } = useUser();

    if (!isLoaded) {
      return <p>Loading...</p>;
    }

    // Get user role (default to "public" if not found)
    const userRole = (user?.publicMetadata?.role || "public").toLowerCase();
    console.log(`[RoleCheck] Checking access: userRole=${userRole}, allowedRoles=${allowedRoles?.join(',') || 'none'}`);

    // If user is public (not authenticated), redirect to login
    if (userRole === "public") {
      return <Navigate to={routes.login} replace />;
    }

    // If no roles specified, allow access
    if (!allowedRoles || allowedRoles.length === 0) {
      return <Component {...props} />;
    }

    // If "public" is in allowed roles, allow access
    if (allowedRoles.includes("public")) {
      return <Component {...props} />;
    }

    // Check if user's role is in the allowed roles list (case-insensitive)
    const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);

    if (hasAccess) {
      return <Component {...props} />;
    }

    // User doesn't have access - redirect to their role's default dashboard
    const redirectPath = ROLE_REDIRECTS[userRole] || routes.employeeDashboard;
    console.log(`[RoleCheck] Access denied. Redirecting to: ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  };
};

export default withRoleCheck;
