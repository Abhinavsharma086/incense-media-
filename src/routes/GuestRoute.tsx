import React from "react";
import { Route } from "react-router-dom";

import GuestRoute from "@/components/common/GuestRoute";
// import Login from "@/pages/auth/Login";
// import AdminLogin from "@/pages/admin/auth/AdminLogin";
import TestPage from "@/pages/TestPage";

export const GuestRoutes = (
  <Route element={<GuestRoute />}>
    {/* <Route path="admin/login" element={<AdminLogin />} /> */}
    <Route path="test" element={<TestPage />} />
  </Route>
);
