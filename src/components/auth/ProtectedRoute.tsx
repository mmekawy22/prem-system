import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/UserContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  permission: string;
  children: ReactNode;
}

const ProtectedRoute = ({ permission, children }: ProtectedRouteProps) => {
  const { user, hasPermission } = useAuth();
  

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!hasPermission(permission)) {
    // If user doesn't have permission, send them to their default page
    const defaultPage = user.role === 'cashier' ? '/pos' : '/dashboard';
    return <Navigate to={defaultPage} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;