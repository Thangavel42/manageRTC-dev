import { Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { all_routes } from "./all_routes";
import { useCompanyPages } from "../../contexts/CompanyPagesContext";

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

export const withRoleCheck = (Component, allowedRoles: string[] = [], routePath?: string) => {
  return function WrappedComponent(props) {
    const { isLoaded, user } = useUser();
    const { isRouteEnabled, allEnabled, isLoading: planLoading } = useCompanyPages();

    if (!isLoaded || planLoading) {
      return <p>Loading...</p>;
    }

    // Get user role (default to "public" if not found)
    const userRole = ((user?.publicMetadata?.role as string) || "public").toLowerCase();
    console.log(`[RoleCheck] Checking access: userRole=${userRole}, allowedRoles=${allowedRoles?.join(',') || 'none'}`);

    // If user is public (not authenticated), redirect to login
    if (userRole === "public") {
      return <Navigate to={routes.login} replace />;
    }

    // If no roles specified, allow access
    if (!allowedRoles || allowedRoles.length === 0) {
      return <Component {...props} />;
    }

    // If "public" is in allowed roles, allow access (still subject to plan check below)
    if (!allowedRoles.includes("public")) {
      // Check if user's role is in the allowed roles list (case-insensitive)
      const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);

      if (!hasAccess) {
        // User doesn't have access - redirect to their role's default dashboard
        const redirectPath = ROLE_REDIRECTS[userRole] || routes.employeeDashboard;
        console.log(`[RoleCheck] Access denied. Redirecting to: ${redirectPath}`);
        return <Navigate to={redirectPath} replace />;
      }
    }

    // Plan-based route check: superadmin bypasses, others must have the route in their plan
    if (!allEnabled && routePath && userRole !== 'superadmin') {
      if (!isRouteEnabled(routePath)) {
        const redirectPath = ROLE_REDIRECTS[userRole] || routes.employeeDashboard;
        console.log(`[RoleCheck] Route not in company plan: ${routePath}. Redirecting to: ${redirectPath}`);
        return <Navigate to={redirectPath} replace />;
      }
    }

    return <Component {...props} />;
  };
};

export default withRoleCheck;
