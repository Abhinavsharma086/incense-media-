import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { useDispatch } from "react-redux";
import Loader from "./components/common/Loader";
import { AdminRoutes } from "./routes/AdminPrivate";
import NotFound from "./pages/NotFound";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import type { AppDispatch } from "./redux/store";
import { getRole, isLoggedIn, isSuperAdmin, isEmployee, syncCurrentUserFromServer } from "./lib/auth";

import { PermissionProvider } from "./context/PermissionContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 5000,
    },
  },
});

function RootRedirect() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (isSuperAdmin()) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }
  if (isEmployee()) {
    return <Navigate to="/employee/dashboard" replace />;
  }
  return <Navigate to="/admin/dashboard" replace />;
}

function App() {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  // Always scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Synchronize authenticated user profile from backend on app load
  useEffect(() => {
    if (isLoggedIn()) {
      syncCurrentUserFromServer().catch(() => {});
    }
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <PermissionProvider>
          <TooltipProvider>
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />

            <Suspense fallback={<Loader />}>
              <Routes>
                {/* Intelligent Root Redirect based on role */}
                <Route path="/" element={<RootRedirect />} />
                {AdminRoutes}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </PermissionProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
