import { Navigate } from 'react-router-dom';

/**
 * RoleGuard — wraps route groups to enforce role-based access.
 *
 * Usage in AppRoutes:
 *   <Route element={<RoleGuard allow={['admin','manager']} role={role} />}>
 *     <Route path="admin" element={<AdminPanel />} />
 *   </Route>
 *
 * If the user's role is not in `allow`, they get redirected to their default route.
 */
export default function RoleGuard({ allow, role, children }) {
  if (!allow.includes(role)) {
    const fallback =
      role === 'chef'     ? '/shop'  :
      role === 'employee' ? '/crew'  :
      role === 'driver'   ? '/deliveries' :
      '/kanban';
    return <Navigate to={fallback} replace />;
  }
  return children;
}
