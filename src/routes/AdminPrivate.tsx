import React from "react";
import { Navigate, Route, Outlet } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminClients from "../pages/admin/AdminClients";
import AdminEvents from "../pages/admin/AdminEvents";
import AdminBlogs from "../pages/admin/AdminBlogs";
import AdminBlogCategories from "../pages/admin/AdminBlogCategories";
import AdminServiceCategories from "../pages/admin/AdminServiceCategories";
import AdminSliders from "../pages/admin/AdminSliders";
import AdminContacts from "../pages/admin/AdminContacts";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminMagazines from "../pages/admin/AdminMagazines";
import AdminSettings from "../pages/admin/AdminSettings";
import AdminCMS from "../pages/admin/AdminCMS";
import AdminCourses from "../pages/admin/AdminCourses";
import AdminServices from "../pages/admin/AdminServices";
import AdminTeams from "../pages/admin/AdminTeams";
import AdminInquiries from "../pages/admin/AdminInquiries";
import AdminBreakingNews from "../pages/admin/AdminBreakingNews";
import AdminAwardsListing from "../pages/admin/AdminAwardsListing";
import AdminAwardsCreate from "../pages/admin/AdminAwardsCreate";
import AdminServicesCreate from "../pages/admin/AdminServicesCreate";
import AdminHomeContent from "../pages/admin/AdminHomeContent";
import AdminBannerImages from "../pages/admin/AdminBannerImages";
import AdminMainImages from "../pages/admin/AdminMainImages";
import AdminTestimonials from "../pages/admin/AdminTestimonials";
import AdminPromotionBanner from "@/pages/admin/AdminPromotionBanner";
import AdminLogin from "../pages/admin/auth/AdminLogin";
import CrmLogin from "../pages/admin/auth/CrmLogin";
import CrmTeam from "../pages/admin/CrmTeam";
import AdminLeads from "../pages/admin/AdminLeads";
import AdminLeadDashboard from "../pages/admin/AdminLeadDashboard";
import AdminLeadProfile from "../pages/admin/AdminLeadProfile";
import AdminSalesPipeline from "../pages/admin/AdminSalesPipeline";
import AdminFollowUps from "../pages/admin/AdminFollowUps";
import AdminLeadScoring from "../pages/admin/AdminLeadScoring";
import AdminCampaigns from "../pages/admin/AdminCampaigns";
import AdminCampaignDashboard from "../pages/admin/AdminCampaignDashboard";
import MetaSettings from "../pages/admin/MetaSettings";
import AdminLeadForms from "../pages/admin/AdminLeadForms";
import AdminLeadsKanban from "../pages/admin/AdminLeadsKanban";
import AdminLeadDuplicates from "../pages/admin/AdminLeadDuplicates";
import AdminLeadAnalytics from "../pages/admin/AdminLeadAnalytics";
import UnitSettings from "../pages/admin/UnitSettings";
import { isAdmin } from "@/lib/auth";


// Super Admin Imports
import SuperAdminRoute from "./SuperAdminRoute";
import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import SuperAdminAdmins from "../pages/superadmin/SuperAdminAdmins";
import SuperAdminPermissions from "../pages/superadmin/SuperAdminPermissions";
import SuperAdminModules from "../pages/superadmin/SuperAdminModules";
import SuperAdminActivityLogs from "../pages/superadmin/SuperAdminActivityLogs";
import SuperAdminSettings from "../pages/superadmin/SuperAdminSettings";
import SuperAdminSecurity from "../pages/superadmin/SuperAdminSecurity";

// Employee Portal Imports
import EmployeePrivateRoute from "./EmployeePrivateRoute";
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";
import EmployeeLeads from "../pages/employee/EmployeeLeads";
import EmployeePaymentReminders from "../pages/employee/EmployeePaymentReminders";
import EmployeeLeadReminders from "../pages/employee/EmployeeLeadReminders";

// Admin Extension Pages

import AdminEmployees from "../pages/admin/AdminEmployees";
import AdminCustomers from "../pages/admin/AdminCustomers";

// Accounting & BUSY ERP Imports
import AdminAccountingDashboard from "../pages/admin/accounting/AdminAccountingDashboard";
import AdminAccountingInvoices from "../pages/admin/accounting/AdminInvoices";
import AdminInvoiceForm from "../pages/admin/accounting/AdminInvoiceForm";
import AdminProformaInvoices from "../pages/admin/accounting/AdminProformaInvoices";
import AdminPayments from "../pages/admin/accounting/AdminPayments";
import AdminParties from "../pages/admin/accounting/AdminParties";
import AdminItems from "../pages/admin/accounting/AdminItems";
import AdminAccountingReports from "../pages/admin/accounting/AdminAccountingReports";
import AdminSyncLogs from "../pages/admin/accounting/AdminSyncLogs";
import AdminAccountingSettings from "../pages/admin/accounting/AdminAccountingSettings";
import AdminProducts from "../pages/admin/AdminProducts";
import AdminExpenses from "../pages/admin/AdminExpenses";

// Role Login
import RoleSelectLogin from "../pages/auth/RoleSelectLogin";

// Private route wrapper
const AdminPrivateRoute: React.FC = () => {
  if (!isAdmin()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

// ✅ Export only <Route> elements
export const AdminRoutes = (
  <>
    {/* Public & Role Logins */}
    <Route path="/login" element={<RoleSelectLogin />} />
    <Route path="/super-admin/login" element={<RoleSelectLogin />} />
    <Route path="/employee/login" element={<RoleSelectLogin />} />
    <Route path="/admin/login" element={<RoleSelectLogin />} />
    <Route path="/admin/crm-login" element={<CrmLogin />} />

    {/* --- Super Admin Portal --- */}
    <Route path="/super-admin/*" element={<SuperAdminRoute />}>
      <Route index element={<Navigate replace to="dashboard" />} />
      <Route path="dashboard" element={<SuperAdminDashboard />} />
      <Route path="admins" element={<SuperAdminAdmins />} />
      <Route path="permissions" element={<SuperAdminPermissions />} />
      <Route path="modules" element={<SuperAdminModules />} />
      <Route path="employees" element={<AdminEmployees />} />
      <Route path="activity-logs" element={<SuperAdminActivityLogs />} />
      <Route path="settings" element={<SuperAdminSettings />} />
      <Route path="security" element={<SuperAdminSecurity />} />
      <Route path="reports" element={<AdminAccountingReports />} />
      <Route path="*" element={<Navigate replace to="/super-admin/dashboard" />} />
    </Route>

    {/* Route alias for /superadmin without hyphen */}
    <Route path="/superadmin/*" element={<Navigate replace to="/super-admin/dashboard" />} />

    {/* --- Employee Portal --- */}
    <Route path="/employee/*" element={<EmployeePrivateRoute />}>
      <Route path="dashboard" element={<EmployeeDashboard />} />
      <Route path="leads" element={<EmployeeLeads />} />
      <Route path="lead-reminders" element={<EmployeeLeadReminders />} />
      <Route path="follow-ups" element={<EmployeeLeadReminders />} />
      <Route path="customers" element={<Navigate replace to="/employee/dashboard" />} />
      <Route path="reminders" element={<EmployeePaymentReminders />} />
      <Route path="payment-reminders" element={<EmployeePaymentReminders />} />
      <Route path="invoices" element={<AdminAccountingInvoices />} />
      <Route path="invoices/new" element={<AdminInvoiceForm />} />
      <Route path="accounting/invoices/new" element={<AdminInvoiceForm />} />
      <Route path="payments" element={<AdminPayments />} />
      <Route path="reports" element={<AdminAccountingReports />} />
      <Route path="*" element={<Navigate replace to="/employee/dashboard" />} />
    </Route>


    {/* --- Admin Protected Routes --- */}
    <Route path="/admin/*" element={<AdminPrivateRoute />}>
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="employees" element={<AdminEmployees />} />
      <Route path="customers" element={<AdminCustomers />} />
      <Route path="products" element={<AdminProducts />} />
      {/* Accounting & BUSY ERP Module Routes */}
      <Route path="accounting/dashboard" element={<AdminAccountingDashboard />} />
      <Route path="accounting/invoices/new" element={<AdminInvoiceForm />} />
      <Route path="accounting/invoices" element={<AdminAccountingInvoices />} />
      <Route path="accounting/reminders" element={<EmployeePaymentReminders />} />
      <Route path="accounting/proformas/new" element={<AdminInvoiceForm />} />
      <Route path="accounting/proformas" element={<AdminProformaInvoices />} />
      <Route path="accounting/payments" element={<AdminPayments />} />
      <Route path="accounting/parties" element={<AdminParties />} />
      <Route path="accounting/items" element={<AdminItems />} />
      <Route path="accounting/reports" element={<AdminAccountingReports />} />
      <Route path="accounting/sync-logs" element={<AdminSyncLogs />} />
      <Route path="accounting/settings" element={<AdminAccountingSettings />} />

      <Route path="reminders" element={<EmployeePaymentReminders />} />
      <Route path="payment-reminders" element={<EmployeePaymentReminders />} />
      <Route path="invoices" element={<AdminAccountingInvoices />} />
      <Route path="expenses" element={<AdminExpenses />} />
      <Route path="finance" element={<AdminAccountingInvoices />} />
      <Route path="reports" element={<AdminAccountingReports />} />

      <Route path="users" element={<AdminUsers />} />
      <Route path="team" element={<CrmTeam />} />
      <Route path="crm/team" element={<CrmTeam />} />
      <Route path="leads/dashboard" element={<AdminLeadDashboard />} />
      <Route path="leads/kanban" element={<AdminLeadsKanban />} />
      <Route path="leads/duplicates" element={<AdminLeadDuplicates />} />
      <Route path="leads/analytics" element={<AdminLeadAnalytics />} />
      <Route path="leads" element={<AdminLeads />} />
      <Route path="leads/:id" element={<AdminLeadProfile />} />
      <Route path="units" element={<UnitSettings />} />
      <Route path="lead-forms" element={<AdminLeadForms />} />

      <Route path="meta-settings" element={<MetaSettings />} />
      <Route path="pipeline" element={<AdminSalesPipeline />} />
      <Route path="follow-ups" element={<AdminFollowUps />} />
      <Route path="scoring" element={<AdminLeadScoring />} />
      <Route path="campaigns/dashboard" element={<AdminCampaignDashboard />} />
      <Route path="campaigns" element={<AdminCampaigns />} />
      <Route path="clients" element={<AdminClients />} />
      <Route path="events" element={<AdminEvents />} />
      <Route path="awards" element={<AdminAwardsListing />} />
      <Route path="awards/create" element={<AdminAwardsCreate />} />
      <Route path="publications" element={<AdminMagazines />} />
      <Route path="breaking-news" element={<AdminBreakingNews />} />
      <Route path="academy" element={<AdminCourses />} />
      <Route path="services" element={<AdminServices />} />
      <Route path="services/create" element={<AdminServicesCreate />} />
      <Route path="service-categories" element={<AdminServiceCategories />} />
      <Route path="stories" element={<AdminBlogs />} />
      <Route path="story-categories" element={<AdminBlogCategories />} />
      <Route path="sliders" element={<AdminSliders />} />
      <Route path="promotion-banner" element={<AdminPromotionBanner />} />
      <Route path="teams" element={<AdminTeams />} />
      <Route path="about-us" element={<AdminCMS />} />
      <Route path="home-content" element={<AdminHomeContent />} />
      <Route path="banner-images" element={<AdminBannerImages />} />
      <Route path="main-images" element={<AdminMainImages />} />
      <Route path="testimonials" element={<AdminTestimonials />} />
      <Route path="contact" element={<AdminContacts />} />
      <Route path="orders" element={<AdminOrders />} />
      <Route path="appointments" element={<AdminOrders />} />
      <Route path="feedbacks" element={<AdminOrders />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="blog-comments" element={<AdminBlogs />} />
      <Route path="inquiries" element={<AdminInquiries />} />

      <Route path="*" element={<Navigate replace to="/admin/dashboard" />} />
    </Route>
  </>
);
