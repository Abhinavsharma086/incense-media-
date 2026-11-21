import React, { useEffect, useState, useMemo } from "react";
import { instance } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";
import { toast } from "../../components/ui/sonner";
import {
  Search,
  RefreshCw,
  Zap,
  FileDown,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Building2,
  Calendar,
  Eye,
  Trash2,
  X,
  ExternalLink,
  CheckCircle2,
  Users,
  Award,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import { openWhatsAppChat } from "@/lib/whatsapp";

interface InquiryItem {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  itemId: number | null;
  type: string;
  contactFor: string | null;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const AdminInquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>("business-leads");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch inquiries from backend
  const fetchInquiries = async () => {
    setLoading(true);
    try {
      // Fetch all inquiries
      const res = await instance.get(ENDPOINTS.ADMIN_INQUIRIES);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setInquiries(res.data.data);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      } else if (Array.isArray(res.data)) {
        setInquiries(res.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  // Trigger sync of website inquiries into CRM Lead table
  const handleSyncToCRM = async () => {
    setSyncing(true);
    try {
      const res = await instance.post("/admin/inquiries/sync-to-crm", { autoAssign: false });
      const stats = res.data?.data;
      if (stats) {
        toast.success(
          `Sync Successful! ${stats.newlySynced} new leads added to CRM Pipeline (${stats.alreadySynced} already synced).`
        );
      } else {
        toast.success(res.data?.message || "Website leads successfully synced to CRM!");
      }
      fetchInquiries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to sync website leads to CRM");
    } finally {
      setSyncing(false);
    }
  };

  // Handle single inquiry deletion
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this inquiry?")) return;
    try {
      await instance.delete(`/admin/inquiries/${id}`);
      setInquiries((prev) => prev.filter((item) => item.id !== id));
      toast.success("Inquiry removed successfully");
      if (selectedInquiry?.id === id) {
        setIsDetailModalOpen(false);
      }
    } catch (err: any) {
      toast.error("Failed to delete inquiry");
    }
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    const listToExport = filteredInquiries;
    if (listToExport.length === 0) {
      toast.error("No inquiries to export");
      return;
    }

    const headers = ["ID", "Name", "Email", "Phone", "Type", "Company/Subject", "Message", "Submission Date"];
    const rows = listToExport.map((item) => [
      `"${item.id}"`,
      `"${(item.name || "").replace(/"/g, '""')}"`,
      `"${(item.email || "").replace(/"/g, '""')}"`,
      `"${(item.phone || "").replace(/"/g, '""')}"`,
      `"${item.type || ""}"`,
      `"${(item.contactFor || "").replace(/"/g, '""')}"`,
      `"${(item.message || "").replace(/"/g, '""')}"`,
      `"${item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `website_inquiries_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} inquiries to CSV`);
  };

  // Filter inquiries by active tab and search query
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      // Tab matching
      if (activeTab === "business-leads") {
        if (item.type?.toLowerCase() === "newsletter") return false;
      } else if (activeTab === "all") {
        // all items
      } else if (item.type !== activeTab) {
        return false;
      }

      // Search matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.phone && item.phone.toLowerCase().includes(q)) ||
        (item.contactFor && item.contactFor.toLowerCase().includes(q)) ||
        (item.message && item.message.toLowerCase().includes(q))
      );
    });
  }, [inquiries, activeTab, searchQuery]);

  // Derived category counts
  const businessLeadsCount = inquiries.filter((i) => i.type?.toLowerCase() !== "newsletter").length;
  const exhibitorCount = inquiries.filter((i) => i.type === "exhibitor-inquiry").length;
  const contactUsCount = inquiries.filter((i) => i.type === "contactUs").length;
  const inquiryGeneralCount = inquiries.filter((i) => i.type === "inquiry").length;
  const newsletterCount = inquiries.filter((i) => i.type?.toLowerCase() === "newsletter").length;

  const tabOptions = [
    { id: "business-leads", label: "All Business Leads", count: businessLeadsCount, badgeColor: "bg-blue-100 text-blue-800" },
    { id: "exhibitor-inquiry", label: "Exhibitor Stall Queries", count: exhibitorCount, badgeColor: "bg-purple-100 text-purple-800" },
    { id: "contactUs", label: "Contact Us Forms", count: contactUsCount, badgeColor: "bg-emerald-100 text-emerald-800" },
    { id: "inquiry", label: "General Inquiries", count: inquiryGeneralCount, badgeColor: "bg-amber-100 text-amber-800" },
    { id: "newsletter", label: "Newsletter Subscribers", count: newsletterCount, badgeColor: "bg-gray-100 text-gray-800" },
    { id: "all", label: "All Submissions", count: inquiries.length, badgeColor: "bg-slate-100 text-slate-800" },
  ];

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "exhibitor-inquiry":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">🎪 Exhibitor Stall Query</span>;
      case "contactUs":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">✉️ Contact Us Form</span>;
      case "inquiry":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">💬 General Query</span>;
      case "newsletter":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">📰 Newsletter</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">{type}</span>;
    }
  };

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return null;
    return phone.replace(/[^\d+]/g, "");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              incensemedia.in
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Lead Sync Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Website Leads & Inquiries
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Real-time exhibition stall bookings, business inquiries, and contact form submissions originating from the incensemedia.in portal.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncToCRM}
            disabled={syncing}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            title="Sync all website inquiries into CRM Sales Pipeline"
          >
            <Zap className={`w-4 h-4 text-slate-950 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing to CRM..." : "Sync All to CRM Pipeline"}
          </button>

          <Link
            to="/admin/leads"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Users className="w-4 h-4" />
            Open CRM Leads
          </Link>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={fetchInquiries}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-50"
            title="Refresh Inquiries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Business Leads</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-gray-900">{businessLeadsCount}</span>
            <p className="text-xs text-blue-600 font-medium mt-1">Exhibitor + Contact Us</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Exhibitor Queries</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-purple-900">{exhibitorCount}</span>
            <p className="text-xs text-purple-600 font-medium mt-1">Stall & Expo booking leads</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Contact Us</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-emerald-900">{contactUsCount}</span>
            <p className="text-xs text-emerald-600 font-medium mt-1">General partnerships & inquiries</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Newsletter</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-800">{newsletterCount}</span>
            <p className="text-xs text-gray-500 font-medium mt-1">Subscribed email readers</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-gray-50/50 px-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {tabOptions.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
                  activeTab === tab.id
                    ? "bg-white text-indigo-700 border-indigo-200 shadow-xs"
                    : "text-gray-600 border-transparent hover:bg-gray-100/70"
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${tab.badgeColor}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-3 justify-between items-center bg-white">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, email, company, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium w-full md:w-auto justify-end">
            <span>Showing <strong className="text-gray-900 font-bold">{filteredInquiries.length}</strong> inquiries</span>
          </div>
        </div>

        {/* Inquiries Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Loading website inquiries...</h3>
              <p className="text-xs text-gray-500 mt-1">Fetching live submissions from database</p>
            </div>
          ) : filteredInquiries.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <th className="px-5 py-3.5 w-12">#</th>
                  <th className="px-5 py-3.5">Lead / Submitter</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Inquiry Type</th>
                  <th className="px-5 py-3.5">Subject / Company</th>
                  <th className="px-5 py-3.5">Message / Requirement</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredInquiries.map((item, index) => {
                  const cleanPhone = getCleanPhone(item.phone);
                  const isExhibitor = item.type === "exhibitor-inquiry";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedInquiry(item);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      {/* ID / Index */}
                      <td className="px-5 py-3.5 text-gray-400 font-mono font-medium">
                        #{item.id}
                      </td>

                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                              isExhibitor ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {(item.name || item.contactFor || item.email || "W")[0]}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {item.name || (item.type === "newsletter" ? "Subscriber" : "Not Provided")}
                            </div>
                            {item.contactFor && item.type === "exhibitor-inquiry" && (
                              <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {item.contactFor}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          {item.phone ? (
                            <div className="flex items-center gap-1.5 font-medium text-gray-900">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <a
                                href={`tel:${cleanPhone}`}
                                className="hover:underline hover:text-emerald-700"
                              >
                                {item.phone}
                              </a>
                              {cleanPhone && (
                                <button
                                  type="button"
                                  onClick={(e) => openWhatsAppChat(cleanPhone, undefined, e)}
                                  className="ml-1 p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Chat on WhatsApp (re-uses running window)"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                </button>
                              )}
                            </div>
                          ) : null}

                          {item.email ? (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Mail className="w-3.5 h-3.5 text-blue-500" />
                              <a
                                href={`mailto:${item.email}`}
                                className="hover:underline hover:text-blue-700"
                              >
                                {item.email}
                              </a>
                            </div>
                          ) : null}

                          {!item.phone && !item.email && (
                            <span className="text-gray-400 italic">No contact info</span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getTypeBadge(item.type)}
                      </td>

                      {/* Subject / Company */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-800 max-w-xs truncate" title={item.contactFor || ""}>
                          {item.contactFor || "-"}
                        </div>
                      </td>

                      {/* Message */}
                      <td className="px-5 py-3.5 max-w-sm">
                        <p className="text-gray-600 line-clamp-2 text-xs leading-relaxed" title={item.message || ""}>
                          {item.message || (item.type === "newsletter" ? "Newsletter email subscriber" : "-")}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-gray-500 font-medium">
                        {item.createdAt ? (
                          <div title={new Date(item.createdAt).toLocaleString()}>
                            <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedInquiry(item);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {cleanPhone && (
                            <button
                              type="button"
                              onClick={(e) => openWhatsAppChat(cleanPhone, `Hello ${item.name || ""}, we received your inquiry on Incense Media.`, e)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="WhatsApp Customer (re-uses running window)"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {item.email && (
                            <a
                              href={`mailto:${item.email}?subject=Regarding%20your%20inquiry%20on%20Incense%20Media`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">No Inquiries Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No inquiry matched your active tab or search filter. Try clearing your search query or selecting a different tab.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {isDetailModalOpen && selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded-md text-slate-200">
                    Inquiry #{selectedInquiry.id}
                  </span>
                  {getTypeBadge(selectedInquiry.type)}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {selectedInquiry.name || "Website Lead Details"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Submitted via incensemedia.in on {selectedInquiry.createdAt ? new Date(selectedInquiry.createdAt).toLocaleString() : "N/A"}
                </p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Key Details Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Full Name</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedInquiry.name || "-"}</p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Company / Subject</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedInquiry.contactFor || "-"}</p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone / Mobile</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-bold text-gray-900">{selectedInquiry.phone || "-"}</p>
                    {getCleanPhone(selectedInquiry.phone) && (
                      <div className="flex gap-1">
                        <a
                          href={`tel:${getCleanPhone(selectedInquiry.phone)}`}
                          className="p-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => openWhatsAppChat(selectedInquiry.phone, undefined, e)}
                          className="p-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                          title="WhatsApp (re-uses running window)"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email Address</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{selectedInquiry.email || "-"}</p>
                    {selectedInquiry.email && (
                      <a
                        href={`mailto:${selectedInquiry.email}`}
                        className="p-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                        title="Email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Box */}
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer Message / Requirement</span>
                <div className="mt-1.5 p-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedInquiry.message || "No message body provided in this submission."}
                </div>
              </div>

              {/* Inquiry Metadata */}
              <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Submitted: {selectedInquiry.createdAt ? new Date(selectedInquiry.createdAt).toLocaleString() : "-"}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" /> Source: incensemedia.in
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <Link
                to="/admin/leads"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Users className="w-4 h-4" /> Go to CRM Leads Table
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(selectedInquiry.id)}
                  className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInquiries;