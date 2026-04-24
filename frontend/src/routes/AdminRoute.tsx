import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser.roles || !currentUser.roles.some(role => ["admin", "super-admin"].includes(role.toLowerCase()))) {
    return <Navigate to="/" replace />; // Redireciona para home se não for admin
  }

  return children;
}
