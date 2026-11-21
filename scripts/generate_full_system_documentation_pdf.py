import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf_path_root = os.path.join(root_dir, "INCENSE_MEDIA_FULL_SYSTEM_DOCUMENTATION.pdf")
pdf_path_desktop = r"C:\Users\a1807\Desktop\INCENSE_MEDIA_FULL_SYSTEM_DOCUMENTATION.pdf"
pdf_path_downloads = r"C:\Users\a1807\Downloads\INCENSE_MEDIA_FULL_SYSTEM_DOCUMENTATION.pdf"
brain_dir = r"C:\Users\a1807\.gemini\antigravity\brain\3a7b4633-dd93-49b3-b301-30f397cf2280"
pdf_path_brain = os.path.join(brain_dir, "INCENSE_MEDIA_FULL_SYSTEM_DOCUMENTATION.pdf")

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
            self.drawString(45, 755, "Incense Media Admin & CRM — Complete System Documentation")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(45, 747, 612 - 45, 747)
            
        # Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(45, 40, 612 - 45, 40)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 45, 28, page_str)
        self.drawString(45, 28, "Incense Media Platform Documentation — Production: admin.incensemedia.in")
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
    c_primary = colors.HexColor("#0f172a")
    c_accent = colors.HexColor("#991b1b")
    c_secondary = colors.HexColor("#334155")
    c_bg_light = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#cbd5e1")
    
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=18, leading=22,
        textColor=c_primary, spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=13,
        textColor=c_accent, spaceAfter=8
    )

    sec_h1 = ParagraphStyle(
        'SecH1', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=15,
        textColor=c_primary, spaceBefore=12, spaceAfter=5,
        keepWithNext=True
    )

    sec_h2 = ParagraphStyle(
        'SecH2', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=13,
        textColor=c_accent, spaceBefore=7, spaceAfter=3,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=11,
        textColor=c_secondary, spaceAfter=3
    )

    bullet_style = ParagraphStyle(
        'BulletPoint', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10.5,
        textColor=c_secondary, leftIndent=10, firstLineIndent=-6,
        spaceAfter=2
    )

    table_header = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7, leading=9.5,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontName='Helvetica', fontSize=6.8, leading=9,
        textColor=c_secondary
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=6.8, leading=9,
        textColor=c_primary
    )

    fn_title = ParagraphStyle(
        'FnTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8.5, leading=11.5,
        textColor=c_primary
    )

    fn_label = ParagraphStyle(
        'FnLabel', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.2, leading=10,
        textColor=c_accent
    )

    story = []

    # Title Banner
    story.append(Paragraph("INCENSE MEDIA &bull; ENTERPRISE PLATFORM", subtitle_style))
    story.append(Paragraph("Complete System Documentation & Codebase Reference", title_style))
    story.append(Paragraph("Beginner-Friendly & Developer-Ready Guide covering Architecture, Panel Overview, and Categorized Function Reference", body_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=4, spaceAfter=8))

    # Meta Table
    meta_data = [
        [Paragraph("<b>System:</b> Incense Media CRM & Admin", table_cell), Paragraph("<b>Production IP:</b> 31.97.205.16 (Port 443, 22)", table_cell)],
        [Paragraph("<b>Live URL:</b> https://admin.incensemedia.in", table_cell), Paragraph("<b>Database:</b> MySQL (incense_db)", table_cell)],
        [Paragraph("<b>Frontend:</b> React 18, Vite, Tailwind UI", table_cell), Paragraph("<b>Backend:</b> Node.js Express, Prisma ORM, PM2", table_cell)],
    ]
    meta_table = Table(meta_data, colWidths=[260, 262])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6))

    # SECTION 1: PROJECT OVERVIEW
    story.append(Paragraph("1. Project Overview", sec_h1))
    story.append(Paragraph("<b>Ye Project Kya Karta Hai?:</b> Incense Media Admin & CRM ek all-in-one cloud business management software hai jo public website se aane wali inquiries, Facebook/Meta ads leads, sales follow-ups, BUSY ERP accounting (tax invoices & payments), staff allocation aur website CMS content ko ek central secure portal se automate karta hai.", body_style))
    story.append(Paragraph("<b>Kis Problem Ko Solve Karta Hai?:</b> (1) Manual lead loss ko rokk kar 2 minute ke andar automated conversion karta hai, (2) Role-based access partition se Super Admin ki ID aur company revenue ko unauthorized staff se hide karta hai, (3) Manual billing ke errors ko GST-compliant auto-invoicing se khatam karta hai.", body_style))
    story.append(Paragraph("<b>Target Users:</b> Super Admin (System Owner/IT Head), Admin (Business/Operations Manager, Accounts Team), Employee (Telecaller, Field Sales Representative, Billing Operator).", body_style))
    story.append(Spacer(1, 4))

    # SECTION 2: FEATURES
    story.append(Paragraph("2. Main Features", sec_h1))
    feats = [
        "<b>Unified Smart Login:</b> Auto-detects Super Admin, Admin, and Employee from credentials without manual role tabs.",
        "<b>Role & Privacy Protection Shield:</b> Prevents regular Admins from viewing or creating Super Admin level accounts.",
        "<b>Multi-Source Lead Sync Engines:</b> 2-minute automated cron for website inquiries & 15-minute background sync for Meta (Facebook) lead ads.",
        "<b>Visual Kanban Pipeline:</b> Drag-and-drop cards across deal progression stages: New &rarr; Contacted &rarr; Qualified &rarr; Won/Lost.",
        "<b>Serial & Workload-Based Assignment:</b> Round-robin distribution algorithm to allocate leads fairly across sales executives.",
        "<b>BUSY ERP Invoicing Suite:</b> GST Tax Invoices, Proformas (PI), Payment receipts, Party ledger, Item master, and PDF generation.",
        "<b>Comprehensive Media CMS:</b> Upload homepage sliders, magazine PDFs, event expos, news articles, and video galleries."
    ]
    for f in feats:
        story.append(Paragraph(f"&bull; {f}", bullet_style))
    story.append(Spacer(1, 4))

    # SECTION 3: TECH STACK & REQUIREMENTS
    story.append(Paragraph("3. Tech Stack & Installation Requirements", sec_h1))
    tech_data = [
        [Paragraph("Layer", table_header), Paragraph("Stack / Library", table_header), Paragraph("Version", table_header), Paragraph("Purpose / Command", table_header)],
        [Paragraph("Frontend", table_cell_bold), Paragraph("React + TypeScript + Vite", table_cell), Paragraph("React 18, Vite 5", table_cell), Paragraph("Single Page App UI (`npm run dev`)", table_cell)],
        [Paragraph("Styling", table_cell_bold), Paragraph("Tailwind CSS + Lucide Icons", table_cell), Paragraph("Tailwind 3", table_cell), Paragraph("Modern, responsive dashboard layouts", table_cell)],
        [Paragraph("Backend", table_cell_bold), Paragraph("Node.js + Express (TypeScript)", table_cell), Paragraph("Node 18+, Express 4", table_cell), Paragraph("REST API service (`npm run dev` in backend)", table_cell)],
        [Paragraph("Database ORM", table_cell_bold), Paragraph("Prisma ORM", table_cell), Paragraph("Prisma 5", table_cell), Paragraph("Type-safe MySQL schema & client (`npx prisma generate`)", table_cell)],
        [Paragraph("Database", table_cell_bold), Paragraph("MySQL Server", table_cell), Paragraph("MySQL 8.0", table_cell), Paragraph("Relational database `incense_db` on port 3306", table_cell)],
        [Paragraph("Production", table_cell_bold), Paragraph("Nginx + PM2 Daemon", table_cell), Paragraph("Ubuntu 22.04", table_cell), Paragraph("Reverse proxy & process monitoring (PID: 12190)", table_cell)],
    ]
    tech_table = Table(tech_data, colWidths=[65, 135, 75, 247])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 4))

    # SECTION 4: PROJECT STRUCTURE
    story.append(Paragraph("4. Project Structure (Key Folders & Files)", sec_h1))
    struct_data = [
        [Paragraph("File / Folder", table_header), Paragraph("Role & Responsibility in Codebase", table_header)],
        [Paragraph("<code>src/pages/auth/RoleSelectLogin.tsx</code>", table_cell_bold), Paragraph("Unified login page with auto role detection and smart redirect.", table_cell)],
        [Paragraph("<code>src/routes/AdminPrivate.tsx</code>", table_cell_bold), Paragraph("Route definitions and permission authorization gates for Admin.", table_cell)],
        [Paragraph("<code>src/routes/EmployeePrivateRoute.tsx</code>", table_cell_bold), Paragraph("Security shield ensuring employees only see allowed work portals.", table_cell)],
        [Paragraph("<code>src/lib/auth.ts</code>", table_cell_bold), Paragraph("Session tokens, role helpers (`isSuperAdmin`, `isAdmin`, `isEmployee`).", table_cell)],
        [Paragraph("<code>src/api/crmApi.ts</code>", table_cell_bold), Paragraph("Axios instance adding JWT Bearer headers and anti-cache parameters.", table_cell)],
        [Paragraph("<code>backend/src/index.ts</code>", table_cell_bold), Paragraph("Express server boot, 2-min & 15-min background cron jobs, Multer uploads.", table_cell)],
        [Paragraph("<code>backend/src/middleware/auth.middleware.ts</code>", table_cell_bold), Paragraph("JWT verification and granular module permissions checker.", table_cell)],
        [Paragraph("<code>backend/prisma/schema.prisma</code>", table_cell_bold), Paragraph("Complete MySQL database tables: User, Role, Lead, Deal, Unit, Invoice.", table_cell)],
    ]
    struct_table = Table(struct_data, colWidths=[180, 342])
    struct_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(struct_table)

    story.append(PageBreak())

    # SECTION 5: WORKFLOW
    story.append(Paragraph("5. Step-by-Step Workflow & Data Lifecycle", sec_h1))
    story.append(Paragraph("<b>End-to-End System Journey:</b>", body_style))
    story.append(Paragraph("&bull; <b>Step 1 (Lead Influx):</b> A visitor submits a contact form on the website or clicks a Meta Lead Ad. Raw data is stored in the database.", bullet_style))
    story.append(Paragraph("&bull; <b>Step 2 (Automated Ingestion):</b> Backend cron jobs convert the raw submission into an active CRM `Lead` and assign an owner.", bullet_style))
    story.append(Paragraph("&bull; <b>Step 3 (Authentication & Route Guarding):</b> The user logs in via `RoleSelectLogin.tsx`. Credentials are validated via bcrypt and routed to `/super-admin`, `/admin`, or `/employee`.", bullet_style))
    story.append(Paragraph("&bull; <b>Step 4 (Sales Follow-up & Deal Progression):</b> The executive logs call notes, sets reminders, and drags the lead through the Kanban stages.", bullet_style))
    story.append(Paragraph("&bull; <b>Step 5 (Invoicing & Accounting):</b> Upon winning, the deal is converted into a GST Tax Invoice via BUSY ERP model and payment is logged.", bullet_style))
    story.append(Spacer(1, 4))

    # SECTION 6: CATEGORIZED FUNCTION REFERENCE
    story.append(Paragraph("6. Function & Class Reference (Categorized by Live Panel Menu)", sec_h1))
    story.append(Paragraph("Each function below follows the required strict specification format:", body_style))

    def render_function_block(name, category, purpose, inputs, outputs, how_it_works, example, called_by):
        rows = [
            [Paragraph(f"<b>Name:</b> <code>{name}</code>", fn_title), Paragraph(f"<b>Category:</b> {category}", fn_label)],
            [Paragraph("<b>Purpose:</b>", fn_label), Paragraph(purpose, body_style)],
            [Paragraph("<b>Inputs:</b>", fn_label), Paragraph(inputs, body_style)],
            [Paragraph("<b>Output:</b>", fn_label), Paragraph(outputs, body_style)],
            [Paragraph("<b>Kaise Kaam Karta Hai:</b>", fn_label), Paragraph(how_it_works, body_style)],
            [Paragraph("<b>Example:</b>", fn_label), Paragraph(f"<code>{example}</code>", body_style)],
            [Paragraph("<b>Kahan Call Hota Hai:</b>", fn_label), Paragraph(called_by, body_style)],
        ]
        t = Table(rows, colWidths=[120, 402])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('LINEBELOW', (0,0), (-1,0), 0.5, c_border),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        return KeepTogether([t, Spacer(1, 5)])

    # 1. Login Function
    story.append(render_function_block(
        name="handleLogin(e: React.FormEvent)",
        category="Category 1: Authentication & Access Control",
        purpose="User credentials verify karta hai aur bina role choose kiye automatic sahi dashboard par bhejta hai.",
        inputs="e: FormEvent, email: string (clean input), password: string",
        outputs="Promise<void> (localStorage me token/role set aur window navigation)",
        how_it_works="1. Input ko sanitize karta hai.<br/>2. Backend API `/api/auth/login` ko bhejta hai jahan bcrypt password compare hota hai.<br/>3. User role ke mutabiq Super Admin, Admin ya Employee workspace par redirect karta hai.<br/>4. JWT token ko localStorage me save karta hai.",
        example="handleLogin(event) // Navigates to /admin/dashboard or /employee/dashboard",
        called_by="Form onSubmit in `src/pages/auth/RoleSelectLogin.tsx`"
    ))

    # 2. Check Permission
    story.append(render_function_block(
        name="checkPermission(moduleName: string, action: string)",
        category="Category 1: Authentication & Access Control",
        purpose="Backend API routes ko guard karna taaki unallowed employee access na le sake.",
        inputs="moduleName: string (e.g. 'leads', 'accounting'), action: 'view'|'create'|'edit'|'delete'",
        outputs="Express Middleware Function `(req, res, next) => Promise<void>`",
        how_it_works="1. Token se user role check karta hai.<br/>2. Super Admin hai to bypass (next()) kar deta hai.<br/>3. Regular user hone par UserPermission table se check karta hai. Denied hone par 403 Forbidden deta hai.",
        example="router.post('/', checkPermission('leads', 'create'), createLead);",
        called_by="Mounted on all protected routes in `backend/src/routes/*`"
    ))

    # 3. syncWebsiteInquiriesToLeads
    story.append(render_function_block(
        name="syncWebsiteInquiriesToLeads(manualTrigger: boolean)",
        category="Category 2: Sales & CRM Pipeline",
        purpose="Incense Media main website ki contact inquiries ko har 2 minute me automatically CRM leads me convert karna.",
        inputs="manualTrigger: boolean (default: false)",
        outputs="Promise<{ newlySynced: number, alreadySynced: number, totalInquiries: number }>",
        how_it_works="1. Website ki `Inquiries` table query karta hai jahan `syncedToCrm = false` ho.<br/>2. Har inquiry ke data se CRM `Lead` create karta hai.<br/>3. Active sales staff ko round-robin rule se auto-assign karta hai aur synced=true mark karta hai.",
        example="await syncWebsiteInquiriesToLeads(false);",
        called_by="2-Minute cron interval and boot sequence in `backend/src/index.ts`"
    ))

    story.append(PageBreak())

    # 4. updateLeadStatus
    story.append(render_function_block(
        name="updateLeadStatus(leadId: string, status: string)",
        category="Category 2: Sales & CRM Pipeline (Kanban Board)",
        purpose="Kanban board par card drag-and-drop karne par deal ki stage update karna.",
        inputs="leadId: string (ID of the lead), status: string ('contacted', 'qualified', 'won', 'lost')",
        outputs="Promise<AxiosResponse> updating local state and backend record",
        how_it_works="1. UI card ko turant naye column me move karta hai.<br/>2. Backend `PATCH /api/leads/:id/status` call karke `Lead.status` update karta hai.<br/>3. `LeadActivity` audit table me entry create karta hai.",
        example="updateLeadStatus('lead-101', 'won');",
        called_by="`onDragEnd` in `src/pages/admin/AdminLeadsKanban.tsx`"
    ))

    # 5. handleSaveInvoice
    story.append(render_function_block(
        name="handleSaveInvoice(formData: InvoiceData)",
        category="Category 3: Accounting & BUSY ERP Billing",
        purpose="GST-compliant official Tax Invoice create karna aur BUSY ERP standard ke mutabiq ledger me save karna.",
        inputs="partyId, items array (desc, qty, rate, taxRate), discount, paymentMode",
        outputs="Promise<InvoiceResponse> with generated invoice number and PDF download link",
        how_it_works="1. Party master se GST details auto-fetch karta hai.<br/>2. Items ka subtotal, CGST/SGST/IGST calculate karta hai.<br/>3. Master `Invoice` aur detail `InvoiceItem` rows MySQL me insert karta hai.",
        example="handleSaveInvoice({ partyId: 'p-1', items: [{ desc: 'Ad', qty: 1, rate: 10000 }] });",
        called_by="Form submit in `src/pages/admin/accounting/AdminInvoiceForm.tsx`"
    ))

    # 6. handleSubmit (Employee Creation Barrier)
    story.append(render_function_block(
        name="handleSubmit(e: FormEvent) in AdminEmployees",
        category="Category 4: Enterprise, HR & Team Security",
        purpose="Staff account banana aur ye ensure karna ki koi regular Admin Super Admin account na create kar sake.",
        inputs="formData: { name, email, phone, designation, password }",
        outputs="Promise<void> (creates employee and refreshes live list)",
        how_it_works="1. Frontend check: Agar login user Super Admin nahi hai aur designation me 'Super Admin' likha hai, to submit hone se rokta hai.<br/>2. Backend 403 shield se request protect hoti hai.<br/>3. Valid data hone par employee banta hai aur default permissions milti hain.",
        example="handleSubmit(event) // Rejects Super Admin creation by normal admin",
        called_by="Modal submission in `src/pages/admin/AdminEmployees.tsx`"
    ))

    # 7. handleFileUpload
    story.append(render_function_block(
        name="handleFileUpload(req: Request, res: Response)",
        category="Category 5: Content & Media CMS",
        purpose="Website banners, magazine PDFs aur gallery images ko server disk par save karke live link dena.",
        inputs="req.file (Multipart form data handled by Multer)",
        outputs="JSON `{ success: true, url: '/uploads/filename.jpg' }`",
        how_it_works="1. File ko unique timestamp filename allot karta hai.<br/>2. `/uploads` directory me store karta hai.<br/>3. Public URL return karta hai jo website par show ho sake.",
        example="app.post('/admin/upload-image', uploadMiddleware.single('image'), handleFileUpload);",
        called_by="Slider, Banner, Magazine, and Gallery uploads in `backend/src/index.ts`"
    ))

    # 8. createAdminApi
    story.append(render_function_block(
        name="createAdminApi(formData: AdminUser)",
        category="Category 6: Super Admin Master Control",
        purpose="Company level ke Admin accounts create karna (sirf Super Admin ke command panel se).",
        inputs="firstName, lastName, email, password, phone, roleId",
        outputs="Promise<AdminResponse> with new admin ID",
        how_it_works="1. Sirf Super Admin token allow hota hai.<br/>2. Naya Admin user create karke role 'Admin' allot karta hai.<br/>3. Normal admin ko ye feature ya accounts kabhi nahi dikhte.",
        example="createAdminApi({ email: 'newadmin@incense.com', roleId: 'Admin' });",
        called_by="Submit in `src/pages/superadmin/SuperAdminAdmins.tsx`"
    ))

    # 9. fetchLeads (Employee Private)
    story.append(render_function_block(
        name="fetchLeads(myLeads=true)",
        category="Category 7: Employee Workspace",
        purpose="Employee ko sirf uski assigned leads dikhana aur company ka baki private data hide rakhna.",
        inputs="HTTP Query Parameter `myLeads=true` + Employee Bearer Token",
        outputs="Array of Lead objects where `ownerId === employeeId`",
        how_it_works="1. Backend query me `WHERE ownerId = req.user.id` filter lagata hai.<br/>2. Sirf employee ki apni leads return hoti hain.<br/>3. Unauthorized access completely blocked rehta hai.",
        example="crmApi.get('/leads?myLeads=true');",
        called_by="`useEffect` in `src/pages/employee/EmployeeDashboard.tsx`"
    ))

    story.append(PageBreak())

    # SECTION 7: USAGE GUIDE
    story.append(Paragraph("7. Usage Guide (Daily Operation Walkthrough)", sec_h1))
    story.append(Paragraph("<b>Step-by-Step Instructions:</b>", body_style))
    story.append(Paragraph("1. <b>Login:</b> Open `https://admin.incensemedia.in`. Enter Email/Phone and Password. Click 'Sign In'. System auto-routes to your dashboard.", bullet_style))
    story.append(Paragraph("2. <b>Handling Leads:</b> Click `CRM & Leads` &rarr; `Leads Directory`. Click any lead to add notes or change status. Use Kanban board to drag deals.", bullet_style))
    story.append(Paragraph("3. <b>Creating Invoices:</b> Click `Accounting & BUSY` &rarr; `Tax Invoices`. Select client party, add items, verify GST, and click 'Print/Download PDF'.", bullet_style))
    story.append(Paragraph("4. <b>CMS Updates:</b> Click `Content & Media CMS` &rarr; `Hero Sliders`. Upload promotional banner and click Save.", bullet_style))
    story.append(Spacer(1, 4))

    # SECTION 8: CONFIGURATION
    story.append(Paragraph("8. Configuration & Environment Variables", sec_h1))
    env_data = [
        [Paragraph("File", table_header), Paragraph("Key", table_header), Paragraph("Value / Example", table_header), Paragraph("Description", table_header)],
        [Paragraph("`backend/.env`", table_cell_bold), Paragraph("`PORT`", table_cell), Paragraph("`5000`", table_cell), Paragraph("Backend server network port", table_cell)],
        [Paragraph("`backend/.env`", table_cell_bold), Paragraph("`DATABASE_URL`", table_cell), Paragraph("`mysql://incense_user:...@localhost:3306/incense_db`", table_cell), Paragraph("MySQL database connection string", table_cell)],
        [Paragraph("`backend/.env`", table_cell_bold), Paragraph("`JWT_SECRET`", table_cell), Paragraph("`supersecret_crm_key_...`", table_cell), Paragraph("Secret key used for JWT session encryption", table_cell)],
        [Paragraph("`.env` (Root)", table_cell_bold), Paragraph("`VITE_API_BASE_URL`", table_cell), Paragraph("`https://api.incensemedia.in`", table_cell), Paragraph("Live backend API URL for frontend AJAX", table_cell)],
    ]
    env_table = Table(env_data, colWidths=[80, 100, 170, 172])
    env_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(env_table)
    story.append(Spacer(1, 4))

    # SECTION 9: TROUBLESHOOTING
    story.append(Paragraph("9. Error Handling & Troubleshooting", sec_h1))
    trouble_data = [
        [Paragraph("Error / Symptom", table_header), Paragraph("Probable Cause", table_header), Paragraph("Step-by-Step Resolution", table_header)],
        [Paragraph("Invalid credentials", table_cell_bold), Paragraph("Incorrect password or inactive user", table_cell), Paragraph("Check Caps Lock; verify account status in database or reset password.", table_cell)],
        [Paragraph("Blank screen after login", table_cell_bold), Paragraph("Old browser cache or corrupted token", table_cell), Paragraph("Press Ctrl + Shift + R to force refresh browser cache.", table_cell)],
        [Paragraph("Database error P1001", table_cell_bold), Paragraph("MySQL service stopped on port 3306", table_cell), Paragraph("Run `sudo systemctl restart mysql` on Linux VPS or start MySQL in XAMPP.", table_cell)],
        [Paragraph("File upload fails", table_cell_bold), Paragraph("File exceeds 10MB or uploads folder permission", table_cell), Paragraph("Ensure file is under 10MB; verify `chmod 755 uploads` on server.", table_cell)],
    ]
    trouble_table = Table(trouble_data, colWidths=[110, 160, 252])
    trouble_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(trouble_table)
    story.append(Spacer(1, 4))

    # SECTION 10: FAQ
    story.append(Paragraph("10. Frequently Asked Questions (FAQ)", sec_h1))
    faqs = [
        ("Q1: Kya normal Admin Super Admin ki ID dekh ya delete kar sakta hai?", "Nahi. Frontend aur Backend dono jagah security filters enabled hain jo Super Admin accounts ko completely hide aur lock rakhte hain."),
        ("Q2: Website inquiry CRM me kab sync hoti hai?", "Har 2 minute me automated cron service background me check karti hai aur new leads ko insert karke staff ko allocate karti hai."),
        ("Q3: Kya employee doosre staff ki leads dekh sakta hai?", "Nahi. Employee portal strict `myLeads=true` filter par chalta hai, jisse sales reps sirf apni assigned leads hi dekh sakte hain."),
        ("Q4: Invoice me GST rate kaise calculate hota hai?", "Party master ke state code ke mutabiq system auto-detect karta hai: Same state hone par CGST + SGST aur different state hone par IGST calculate hota hai."),
        ("Q5: Mobile phone se access kar sakte hain?", "Haan, pura admin panel responsive Tailwind CSS par designed hai jo mobile aur tablet screens par perfectly adapt hota hai.")
    ]
    for q, a in faqs:
        story.append(Paragraph(f"<b>{q}</b>", sec_h2))
        story.append(Paragraph(f"<b>Ans:</b> {a}", body_style))
    story.append(Spacer(1, 4))

    # SECTION 11: LIMITATIONS & ROADMAP
    story.append(Paragraph("11. Limitations & Future Roadmap", sec_h1))
    story.append(Paragraph("&bull; <b>WhatsApp Cloud API:</b> Adding instant quotation and invoice PDF dispatch via official WhatsApp Business API.", bullet_style))
    story.append(Paragraph("&bull; <b>Push Notifications:</b> Instant mobile notification sound when a new high-priority lead is allocated to a sales rep.", bullet_style))
    story.append(Paragraph("&bull; <b>Automated Cloud Backup:</b> Daily encrypted MySQL dump upload to Google Drive/AWS S3 at 00:00 midnight.", bullet_style))

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
    print("All Full System Documentation PDFs generated successfully!")

