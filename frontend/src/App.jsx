import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import LoginPage from "./features/auth/LoginPage";
import HomeRedirect from "./features/auth/HomeRedirect";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import RoleRoute from "./features/auth/RoleRoute";
import DashboardPage from "./features/dashboard/DashboardPage";
import OrdersPage from "./features/orders/OrdersPage";
import AppShell from "./layouts/AppShell";
import ErrorBoundary from "./shared/components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeRedirect />} />
              <Route element={<RoleRoute allow={["shopkeeper"]} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route element={<RoleRoute allow={["dealer", "shopkeeper"]} />}>
                <Route path="/orders" element={<OrdersPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
