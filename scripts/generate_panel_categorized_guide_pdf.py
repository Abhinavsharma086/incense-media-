import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Configure paths
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(script_dir)
pdf_path_root = os.path.join(root_dir, "INCENSE_MEDIA_PANEL_FUNCTION_GUIDE.pdf")
pdf_path_desktop = r"C:\Users\a1807\Desktop\INCENSE_MEDIA_PANEL_FUNCTION_GUIDE.pdf"
pdf_path_downloads = r"C:\Users\a1807\Downloads\INCENSE_MEDIA_PANEL_FUNCTION_GUIDE.pdf"
brain_dir = r"C:\Users\a1807\.gemini\antigravity\brain\3a7b4633-dd93-49b3-b301-30f397cf2280"
pdf_path_brain = os.path.join(brain_dir, "INCENSE_MEDIA_PANEL_FUNCTION_GUIDE.pdf")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(45, 755, "Incense Media Admin Panel — Category-Wise Function & Module Master Guide")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(45, 747, 612 - 45, 747)
            
        # Footer
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(45, 40, 612 - 45, 40)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 45, 28, page_str)
        self.drawString(45, 28, "Incense Media CRM & Admin Reference Manual — Production System: admin.incensemedia.in")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    # Palette
    c_primary = colors.HexColor("#0f172a")    # Deep slate
    c_accent = colors.HexColor("#991b1b")     # Incense crimson red
    c_secondary = colors.HexColor("#334155")  # Slate gray
    c_bg_light = colors.HexColor("#f8fafc")   # Light gray
    c_bg_alt = colors.HexColor("#f1f5f9")     # Alternate gray
    c_border = colors.HexColor("#cbd5e1")     # Border gray
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_primary,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=c_accent,
        spaceAfter=8
    )

    cat_header = ParagraphStyle(
        'CatHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.white,
        spaceBefore=0,
        spaceAfter=0
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=c_primary,
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=c_secondary,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'BulletPoint',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=11,
        textColor=c_secondary,
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=2
    )

    t_header = ParagraphStyle(
        'THeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white
    )

    t_cell = ParagraphStyle(
        'TCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9.5,
        textColor=c_secondary
    )

    t_cell_bold = ParagraphStyle(
        'TCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9.5,
        textColor=c_primary
    )

    story = []

    # Title Header
    story.append(Paragraph("INCENSE MEDIA ADMIN PANEL &bull; CATEGORY-WISE FUNCTION MASTER GUIDE", subtitle_style))
    story.append(Paragraph("Konsa Function Kahan Hai aur Kya Kaam Karta Hai", title_style))
    story.append(Paragraph("Complete Panel Overview: Sidebar Categories, Frontend Files, Backend Controllers, API Endpoints, and Database Actions", body_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=4, spaceAfter=8))

    def make_category_table(category_name, color_hex, items_data):
        cat_banner = Table([[Paragraph(f"<b>CATEGORY: {category_name.upper()}</b>", cat_header)]], colWidths=[522])
        cat_banner.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(color_hex)),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        
        table_rows = [
            [
                Paragraph("Panel Screen / Menu", t_header),
                Paragraph("Frontend File & Function", t_header),
                Paragraph("Backend API & Controller", t_header),
                Paragraph("Database Table & Actual Action Performed", t_header)
            ]
        ]
        
        for item in items_data:
            table_rows.append([
                Paragraph(f"<b>{item[0]}</b><br/><font color='#64748b'>{item[1]}</font>", t_cell_bold),
                Paragraph(f"<code>{item[2]}</code><br/><b>Fn:</b> {item[3]}", t_cell),
                Paragraph(f"<code>{item[4]}</code><br/><b>Ctrl:</b> {item[5]}", t_cell),
                Paragraph(f"<b>Table:</b> <code>{item[6]}</code><br/>{item[7]}", t_cell)
            ])
            
        data_table = Table(table_rows, colWidths=[105, 135, 125, 157])
        data_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        return [cat_banner, data_table, Spacer(1, 10)]

    # CATEGORY 1: AUTHENTICATION & LOGIN
    cat1_items = [
        [
            "Unified Smart Login",
            "Path: /login",
            "src/pages/auth/RoleSelectLogin.tsx",
            "handleLogin()",
            "POST /api/auth/login",
            "auth.controller.ts (login)",
            "User, Users",
            "User email/mobile + password check karta hai (bcrypt). Role evaluate karke Super Admin, Admin ya Employee dashboard par bina button select kiye forward karta hai."
        ],
        [
            "Profile Synchronization",
            "Auto (Window Focus)",
            "src/lib/auth.ts",
            "syncCurrentUserFromServer()",
            "GET /api/auth/me",
            "auth.controller.ts (me)",
            "User, UserPermission",
            "Browser me current login user ki permissions aur live profile backend DB se sync karta hai taaki rights instant update hon bina relogin kiye."
        ],
        [
            "Employee Route Guard",
            "Path: /employee/*",
            "src/routes/EmployeePrivateRoute.tsx",
            "isEmployee(), isLoggedIn()",
            "Internal Guard",
            "auth.ts",
            "localStorage (role)",
            "Check karta hai ki user employee hai ya nahi. Agar unauthorized hai to login page par bhejta hai; employee hone par portal load karta hai."
        ]
    ]
    for el in make_category_table("1. Authentication & System Access", "#991b1b", cat1_items):
        story.append(el)

    # CATEGORY 2: SALES & CRM PIPELINE
    cat2_items = [
        [
            "All Leads Directory",
            "Path: /admin/leads",
            "src/pages/admin/AdminLeads.tsx",
            "fetchLeads(), handleSaveLead(), handleBulkReassign()",
            "GET /api/leads, POST /api/leads",
            "lead.controller.ts (getLeads, createLead)",
            "Lead, LeadActivity",
            "Sabhi leads ko list karta hai. Nayi lead create karta hai aur sales executives ko bulk lead transfer karne ka permission deta hai."
        ],
        [
            "Kanban Board Pipeline",
            "Path: /admin/pipeline",
            "src/pages/admin/AdminLeadsKanban.tsx",
            "onDragEnd(), updateLeadStatus()",
            "PATCH /api/leads/:id/status",
            "lead.controller.ts (updateLeadStatus)",
            "Lead, Deal",
            "Leads ko visual cards ke roop me drag-and-drop karke status badalta hai: New &rarr; Contacted &rarr; Qualified &rarr; Proposal Sent &rarr; Won/Lost."
        ],
        [
            "Website Inquiries Auto-Sync",
            "Path: /admin/inquiries",
            "backend/src/services/websiteLeadSync.ts",
            "syncWebsiteInquiriesToLeads()",
            "Auto 2-Min Cron & GET /api/sync",
            "cms.controller.ts, websiteLeadSync.ts",
            "Inquiries &rarr; Lead",
            "Incense Media website se aane wali sari contact inquiries ko har 2 minute me automatically fetch karke sales leads me convert aur distribute karta hai."
        ],
        [
            "Meta (Facebook) Lead Ads",
            "Path: /admin/lead-forms",
            "src/pages/admin/AdminLeadForms.tsx",
            "syncLeadsNow()",
            "POST /api/meta/sync-now",
            "meta.controller.ts (syncLeadsNow)",
            "Lead, MetaSettings",
            "Facebook Graph API se judkar Facebook Lead Ads ka sara data directly CRM me pull karke respective campaigns ke sath map karta hai."
        ],
        [
            "Lead Scoring & Rules",
            "Path: /admin/scoring",
            "src/pages/admin/AdminLeadScoring.tsx",
            "calculateScore(), handleSaveRule()",
            "POST /api/scoring/rules",
            "scoring.controller.ts",
            "LeadScoringRule, Lead",
            "Budget, urgency aur company size ke hisaab se har lead ko 0-100 score assign karta hai taaki high-value leads pehle attend hon."
        ],
        [
            "Follow-ups & Reminders",
            "Path: /admin/follow-ups",
            "src/pages/admin/AdminFollowUps.tsx",
            "handleCreateFollowUp(), completeFollowUp()",
            "POST /api/followups, PATCH /api/followups/:id",
            "followup.controller.ts",
            "FollowUp, Lead",
            "Client ko dobara call karne ya email bhejne ka reminder set karta hai aur sales executive ko overdue calls highlight karta hai."
        ]
    ]
    for el in make_category_table("2. Sales & CRM Pipeline Modules", "#0284c7", cat2_items):
        story.append(el)

    story.append(PageBreak())

    # CATEGORY 3: ACCOUNTING & BUSY ERP
    cat3_items = [
        [
            "Accounting Overview",
            "Path: /admin/accounting/dashboard",
            "src/pages/admin/accounting/AdminAccountingDashboard.tsx",
            "fetchStats()",
            "GET /api/accounting/stats",
            "accounting.controller.ts",
            "Invoice, Payment",
            "Total monthly revenue, outstanding balance, paid vs unpaid ratios aur monthly sales graphs ka real-time visual card deta hai."
        ],
        [
            "Tax Invoices (BUSY ERP)",
            "Path: /admin/accounting/invoices",
            "src/pages/admin/accounting/AdminInvoiceForm.tsx",
            "handleSaveInvoice(), handlePrintPDF()",
            "POST /api/accounting/invoices, GET /api/accounting/invoices",
            "accounting.controller.ts (createInvoice)",
            "Invoice, InvoiceItem",
            "GST-compliant final Tax Invoices banata hai. Automatic CGST, SGST, IGST calculate karta hai aur printable PDF generate karta hai."
        ],
        [
            "Proforma Invoices (PI)",
            "Path: /admin/accounting/proformas",
            "src/pages/admin/accounting/AdminProformaInvoices.tsx",
            "convertToTaxInvoice()",
            "POST /api/accounting/proformas/convert",
            "accounting.controller.ts",
            "ProformaInvoice",
            "Order confirm hone se pehle client ko quotation/estimate bhejne ke liye PI banata hai, jise baad me 1-click me Tax Invoice me convert kar sakte hain."
        ],
        [
            "Payments & Receipts",
            "Path: /admin/accounting/payments",
            "src/pages/admin/accounting/AdminPayments.tsx",
            "handleAddPayment()",
            "POST /api/accounting/payments",
            "accounting.controller.ts",
            "Payment, Invoice",
            "Client se aayi payment (NEFT, UPI, Cheque, Cash) record karta hai aur invoice ke balance ko auto-deduct karke status 'Paid' karta hai."
        ],
        [
            "Party Master (Customers)",
            "Path: /admin/accounting/parties",
            "src/pages/admin/accounting/AdminParties.tsx",
            "handleSaveParty()",
            "POST /api/accounting/parties",
            "accounting.controller.ts",
            "Party, Customer",
            "Client ka GST number, billing address, phone aur credit limit save karta hai taaki invoice banate waqt sirf naam select karna pade."
        ],
        [
            "Item Master (Products)",
            "Path: /admin/accounting/items",
            "src/pages/admin/accounting/AdminItems.tsx",
            "handleSaveItem()",
            "POST /api/accounting/items",
            "accounting.controller.ts",
            "Item, Product",
            "Magazine advertising rate, event stall space ya product pricing aur unka HSN/SAC code save karta hai."
        ]
    ]
    for el in make_category_table("3. Accounting & BUSY ERP Billing", "#059669", cat3_items):
        story.append(el)

    # CATEGORY 4: ENTERPRISE, TEAM & HR
    cat4_items = [
        [
            "Employee Management",
            "Path: /admin/employees",
            "src/pages/admin/AdminEmployees.tsx",
            "fetchLiveEmployees(), handleSubmit()",
            "GET /admin/users, POST /admin/users",
            "cms.controller.ts (createLegacyUser)",
            "User, UnitEmployee",
            "Sales staff create karta hai. Super Admin accounts ko regular admin view se hide karta hai aur non-superadmins ko Super Admin create karne se rokta hai."
        ],
        [
            "Granular Module Permissions",
            "Modal in AdminEmployees",
            "src/pages/admin/AdminEmployees.tsx",
            "handlePermissionSave()",
            "POST /api/superadmin/admins/:id/permissions",
            "superadmin.controller.ts",
            "UserPermission",
            "Har employee ko alag-alag switch on/off karke access deta hai: Can View Leads? Can Create Invoice? Can Delete Payments? etc."
        ],
        [
            "Unit & Team Allocation",
            "Path: /admin/units",
            "src/pages/admin/UnitSettings.tsx",
            "handleCreateUnit(), assignEmployeeToUnit()",
            "POST /api/units, POST /api/units/assign",
            "unit.controller.ts",
            "Unit, UnitEmployee",
            "Sales team ko units me baant'ta hai (jaise Telecalling Unit, Field Sales Unit) taaki leads unit-wise auto-distribute ho sakein."
        ],
        [
            "Users Directory",
            "Path: /admin/users",
            "src/pages/admin/AdminUsers.tsx",
            "fetchUsers(), toggleUserStatus()",
            "GET /admin/users, PUT /admin/users/:id/toggle",
            "cms.controller.ts",
            "Users",
            "System me registered users ko list karta hai, active/inactive toggle karta hai aur profile details show karta hai."
        ]
    ]
    for el in make_category_table("4. Enterprise, HR & Team Security", "#7c3aed", cat4_items):
        story.append(el)

    story.append(PageBreak())

    # CATEGORY 5: CONTENT & MEDIA CMS (WEBSITE MANAGEMENT)
    cat5_items = [
        [
            "Homepage Sliders & Banners",
            "Path: /admin/sliders & /banner-images",
            "src/pages/admin/AdminSliders.tsx, AdminBannerImages.tsx",
            "handleUpload(), handleSaveSlider()",
            "POST /admin/upload-image, POST /admin/sliders",
            "cms.controller.ts, multer",
            "Sliders, Banners",
            "Website ke top banner aur hero slider upload karta hai. Multer engine images ko /uploads folder me save karke live link banata hai."
        ],
        [
            "Stories & News Articles",
            "Path: /admin/stories",
            "src/pages/admin/AdminStories.tsx",
            "handleSaveStory()",
            "POST /admin/stories",
            "cms.controller.ts",
            "Stories, StoryCategories",
            "Agarbatti aur perfume industry ki news, press releases aur blog articles publish karta hai (CKEditor rich text ke sath)."
        ],
        [
            "Digital Magazines & PDFs",
            "Path: /admin/publications",
            "src/pages/admin/AdminPublications.tsx",
            "handleUploadMagazine()",
            "POST /admin/publications",
            "cms.controller.ts",
            "Publications",
            "Incense Media ki monthly magazine ka cover photo aur PDF version upload karta hai taaki website visitors use online padh sakein."
        ],
        [
            "Events & Expos Management",
            "Path: /admin/events",
            "src/pages/admin/AdminEvents.tsx",
            "handleSaveEvent()",
            "POST /admin/events",
            "cms.controller.ts",
            "Events, EventLinks",
            "Upcoming industrial exhibitions aur fairs ki dates, venue location, brochure download links aur registration forms set karta hai."
        ],
        [
            "Main Gallery & Videos",
            "Path: /admin/main-images",
            "src/pages/admin/AdminMainImages.tsx",
            "saveGalleryItem()",
            "POST /admin/gallery",
            "cms.controller.ts",
            "Gallery",
            "Exhibitions aur factory visits ke high-resolution photos aur YouTube video links ko categorise karke website par live karta hai."
        ]
    ]
    for el in make_category_table("5. Content & Media CMS (Website Management)", "#ea580c", cat5_items):
        story.append(el)

    # CATEGORY 6: SUPER ADMIN & EXCLUSIVE WORKSPACES
    cat6_items = [
        [
            "Super Admin Management",
            "Path: /super-admin/admins",
            "src/pages/superadmin/SuperAdminAdmins.tsx",
            "loadAdmins(), createAdminApi()",
            "GET /api/superadmin/admins, POST /api/superadmin/admins",
            "superadmin.controller.ts",
            "User, Role",
            "Sirf Super Admin ke liye accessible. Naye company Admin accounts create karta hai, unka password reset karta hai aur session force-logout karta hai."
        ],
        [
            "Employee Portal Dashboard",
            "Path: /employee/dashboard",
            "src/pages/employee/EmployeeDashboard.tsx",
            "fetchLeads()",
            "GET /api/leads?myLeads=true",
            "lead.controller.ts",
            "Lead (ownerId = emp)",
            "Field/sales employee ka dedicated home page jahan sirf unki assigned leads, daily pending calls aur monthly targets dikhte hain."
        ],
        [
            "Employee Assigned Leads",
            "Path: /employee/leads",
            "src/pages/employee/EmployeeLeads.tsx",
            "updateLeadStatus()",
            "PATCH /api/leads/:id/status",
            "lead.controller.ts",
            "Lead, LeadActivity",
            "Employee sirf apni assigned leads par call notes daal sakta hai aur status update kar sakta hai. Dusre staff ki leads access karne se blocked rehta hai."
        ]
    ]
    for el in make_category_table("6. Super Admin & Exclusive Role Workspaces", "#b91c1c", cat6_items):
        story.append(el)

    # Signoff Box
    signoff_data = [[
        Paragraph(
            "<b>SUMMARY & DIRECT USE:</b><br/>"
            "Ye complete reference guide Incense Media Admin ke har menu button, screen, frontend file, backend controller, aur database action ko simple language me map karta hai. "
            "Aap is PDF ko apne desktop ya mobile par refer karke system ka koi bhi function turant locate aur operate kar sakte hain.",
            body_style
        )
    ]]
    signoff_table = Table(signoff_data, colWidths=[522])
    signoff_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef2f2")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#991b1b")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(signoff_table)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[+] Successfully generated: {filename}")

if __name__ == "__main__":
    os.makedirs(os.path.dirname(pdf_path_root), exist_ok=True)
    os.makedirs(os.path.dirname(pdf_path_brain), exist_ok=True)
    build_pdf(pdf_path_root)
    build_pdf(pdf_path_desktop)
    build_pdf(pdf_path_downloads)
    build_pdf(pdf_path_brain)
    print("All Category-Wise PDFs generated successfully!")

