import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ element, requiredPermission, adminOnly = false, fallback = "/login" }) => {
  const { user, hasPermission, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // adminOnly routes: only users with admin role can access
  if (adminOnly && !isAdmin()) {
    return <Navigate to={fallback} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={fallback} replace />;
  }

  return element;
};

export default ProtectedRoute;
