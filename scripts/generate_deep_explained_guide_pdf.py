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
pdf_path_root = os.path.join(root_dir, "INCENSE_MEDIA_EASY_EXPLANATION_GUIDE.pdf")
pdf_path_desktop = r"C:\Users\a1807\Desktop\INCENSE_MEDIA_EASY_EXPLANATION_GUIDE.pdf"
pdf_path_downloads = r"C:\Users\a1807\Downloads\INCENSE_MEDIA_EASY_EXPLANATION_GUIDE.pdf"
brain_dir = r"C:\Users\a1807\.gemini\antigravity\brain\3a7b4633-dd93-49b3-b301-30f397cf2280"
pdf_path_brain = os.path.join(brain_dir, "INCENSE_MEDIA_EASY_EXPLANATION_GUIDE.pdf")

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
            self.drawString(45, 755, "Incense Media Admin Panel — Detailed Function & Workflow Handbook")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(45, 747, 612 - 45, 747)
            
        # Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(45, 40, 612 - 45, 40)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 45, 28, page_str)
        self.drawString(45, 28, "Easy-To-Understand Technical Handbook — Incense Media System")
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
    c_accent = colors.HexColor("#991b1b")     # Incense red
    c_secondary = colors.HexColor("#334155")  # Slate gray
    c_bg_light = colors.HexColor("#f8fafc")   # Light gray
    c_card_bg = colors.HexColor("#ffffff")
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
        spaceAfter=6
    )

    cat_banner_style = ParagraphStyle(
        'CatBannerStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14.5,
        textColor=colors.white
    )
    
    func_title_style = ParagraphStyle(
        'FuncTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=c_primary
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=c_secondary
    )

    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11.5,
        textColor=c_accent
    )

    story = []

    # Title & Introduction
    story.append(Paragraph("INCENSE MEDIA &bull; DETAILED TECHNICAL & OPERATIONAL HANDBOOK", subtitle_style))
    story.append(Paragraph("Panel Overview & In-Depth Function Breakdown", title_style))
    story.append(Paragraph("Har function ki location, trigger, input data, backend process, aur database effect ka simple bhasha me poora vivran.", body_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=4, spaceAfter=8))

    def make_category_header(cat_num, cat_title, color_hex):
        table = Table([[Paragraph(f"<b>CATEGORY {cat_num}: {cat_title.upper()}</b>", cat_banner_style)]], colWidths=[522])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(color_hex)),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        return table

    def make_function_card(func_name, screen_path, file_path, endpoint, trigger_text, purpose_text, logic_steps, db_effect, screen_result):
        content = [
            [
                Paragraph(f"<b>{func_name}</b>", func_title_style),
                Paragraph(f"<b>Screen:</b> <code>{screen_path}</code>", body_style)
            ],
            [
                Paragraph(f"<b>File:</b> <code>{file_path}</code>", body_style),
                Paragraph(f"<b>API:</b> <code>{endpoint}</code>", body_style)
            ],
            [
                Paragraph("<b>1. Kaam (Purpose):</b>", label_style),
                Paragraph(purpose_text, body_style)
            ],
            [
                Paragraph("<b>2. Trigger (Kab chalta hai?):</b>", label_style),
                Paragraph(trigger_text, body_style)
            ],
            [
                Paragraph("<b>3. Parde ke peeche (How it works):</b>", label_style),
                Paragraph("<br/>".join([f"&bull; {step}" for step in logic_steps]), body_style)
            ],
            [
                Paragraph("<b>4. Database par asar:</b>", label_style),
                Paragraph(db_effect, body_style)
            ],
            [
                Paragraph("<b>5. User ko kya dikhta hai:</b>", label_style),
                Paragraph(screen_result, body_style)
            ],
        ]
        
        card_table = Table(content, colWidths=[140, 382])
        card_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('LINEBELOW', (0,0), (-1,1), 0.5, c_border),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        return KeepTogether([card_table, Spacer(1, 8)])

    # ----------------------------------------------------
    # CATEGORY 1: LOGIN & AUTHENTICATION
    # ----------------------------------------------------
    story.append(make_category_header("1", "Login, Security & Access Control", "#991b1b"))
    story.append(Spacer(1, 6))

    story.append(make_function_card(
        func_name="handleLogin(e)",
        screen_path="/login",
        file_path="src/pages/auth/RoleSelectLogin.tsx",
        endpoint="POST /api/auth/login",
        trigger_text="User jab Login Screen par Email/Phone aur Password daal kar 'Sign In' button dabata hai.",
        purpose_text="User ko verify karna aur bina koi button chune uske sahi workspace (Super Admin, Admin, ya Employee) par auto-redirect karna.",
        logic_steps=[
            "Input ko clean karta hai (email lowercase aur phone me se extra symbols hatana).",
            "Backend API ko credentials bhejta hai; backend <code>bcrypt.compare</code> se password verify karta hai.",
            "User ka role inspect karta hai: Agar 'Super Admin' hai to /super-admin/dashboard, employee hai to /employee/dashboard, warna /admin/dashboard par bhejta hai.",
            "JWT token aur permissions ko browser ke <code>localStorage</code> me save karta hai taaki page refresh hone par login bana rahe."
        ],
        db_effect="<code>User</code> table me <code>lastLoginAt</code> timestamp update hota hai.",
        screen_result="'Welcome back!' ka green success toast message dikhta hai aur user turant apne dashboard par pahuch jata hai."
    ))

    story.append(make_function_card(
        func_name="syncCurrentUserFromServer()",
        screen_path="System-wide (Window Focus)",
        file_path="src/lib/auth.ts",
        endpoint="GET /api/auth/me",
        trigger_text="Jab user dusre tab se waapis CRM tab par click karta hai (window focus).",
        purpose_text="Database me agar admin ne employee ki permissions ya status change kiya ho, to wo bina logout kiye turant reflect ho jaye.",
        logic_steps=[
            "Active JWT token lekar <code>/api/auth/me</code> ko call karta hai.",
            "Database se live user details aur module permissions fetch karta hai.",
            "Employee session me Super Admin overwrite na ho iska dhyan rakhta hai aur fresh permissions update karta hai."
        ],
        db_effect="Database me read-only query chalti hai: <code>SELECT * FROM User WHERE id = ?</code>.",
        screen_result="User ko koi popup nahi aata, background me buttons aur menus live permissions ke according adjust ho jate hain."
    ))

    story.append(make_function_card(
        func_name="checkPermission(module, action)",
        screen_path="All Backend Protected Routes",
        file_path="backend/src/middleware/auth.middleware.ts",
        endpoint="Middleware on /api/*",
        trigger_text="Jab bhi user kisi button par click karke koi action (view, create, delete) trigger karta hai.",
        purpose_text="Unauthorized access ko rokna taaki employee sirf wahi cheez kar sake jo use allow ki gayi hai.",
        logic_steps=[
            "Request ke header se user token nikal kar role check karta hai.",
            "Super Admin hone par turant aage badhne deta hai (Bypass).",
            "Admin ya Employee hone par <code>UserPermission</code> table me check karta hai ki kya us module par allow hai. Agar nahi, to HTTP 403 Forbidden return karta hai."
        ],
        db_effect="<code>UserPermission</code> table me query chalti hai.",
        screen_result="Permission na hone par screen par red error alert dikhta hai: 'Access denied: Requires privileges'."
    ))

    story.append(PageBreak())

    # ----------------------------------------------------
    # CATEGORY 2: SALES & CRM PIPELINE
    # ----------------------------------------------------
    story.append(make_category_header("2", "Sales & CRM Pipeline", "#0284c7"))
    story.append(Spacer(1, 6))

    story.append(make_function_card(
        func_name="syncWebsiteInquiriesToLeads()",
        screen_path="Background Service / Admin Inquiries",
        file_path="backend/src/services/websiteLeadSync.ts",
        endpoint="Auto 2-Minute Cron Daemon",
        trigger_text="Har 2 minute me automatically chalta hai aur server boot hone par execute hota hai.",
        purpose_text="Incense Media main website par contact form bharne wale clients ko turant CRM leads me convert karna.",
        logic_steps=[
            "Main website ki <code>Inquiries</code> table check karta hai jahan <code>syncedToCrm = false</code> ho.",
            "New inquiry ke client name, email, phone aur message ko lekar CRM ki <code>Lead</code> table me insert karta hai.",
            "Round-robin distribution algorithm se active sales employees ko ek-ek karke auto-assign karta hai.",
            "LeadActivity table me log daalta hai: 'Auto-converted from website inquiry'."
        ],
        db_effect="<code>Lead</code> table me new row insert hoti hai aur <code>Inquiries</code> me <code>syncedToCrm = true</code> hota hai.",
        screen_result="Sales employee ke dashboard par turant nayi lead dikhne lagti hai."
    ))

    story.append(make_function_card(
        func_name="updateLeadStatus(leadId, newStatus)",
        screen_path="/admin/pipeline (Kanban Board)",
        file_path="src/pages/admin/AdminLeadsKanban.tsx",
        endpoint="PATCH /api/leads/:id/status",
        trigger_text="User jab Kanban board par kisi lead card ko drag karke dusre column me drop karta hai.",
        purpose_text="Deal ki progression update karna (Jaise 'New' se 'Contacted' ya 'Won').",
        logic_steps=[
            "Frontend par card ki position instant update karta hai (Optimistic UI update).",
            "Backend API ko PATCH request bhejta hai jisme lead ID aur naya status hota hai.",
            "Backend <code>LeadActivity</code> table me audit entry banata hai ki status kisne aur kab badla."
        ],
        db_effect="<code>Lead</code> table me <code>status</code> column update hota hai aur <code>updatedAt</code> fresh ho jata hai.",
        screen_result="Card naye column me set rehta hai aur green toast notification aata hai: 'Lead status updated successfully'."
    ))

    story.append(make_function_card(
        func_name="handleBulkReassign()",
        screen_path="/admin/leads",
        file_path="src/pages/admin/AdminLeads.tsx",
        endpoint="POST /api/leads/bulk-assign",
        trigger_text="Admin jab multi-select checkbox se 10 ya 50 leads select karke 'Assign To' dropdown se naya employee chunta hai.",
        purpose_text="Staff chutti par ho ya resign kar de to ek click me sari pending leads dusre employee ko transfer karna.",
        logic_steps=[
            "Selected Lead IDs ka array aur target Employee ID collect karta hai.",
            "Backend me transaction run hoti hai jo sabhi selected leads ka <code>ownerId</code> badal deti hai.",
            "Har lead ke audit trail me entry ho jati hai ki leads transfer ho gayi hain."
        ],
        db_effect="<code>Lead</code> table me multiple rows ka <code>ownerId</code> ek saath update hota hai.",
        screen_result="Leads table me owner ka naam turant badal jata hai aur success notification show hota hai."
    ))

    story.append(PageBreak())

    # ----------------------------------------------------
    # CATEGORY 3: ACCOUNTING & BUSY ERP
    # ----------------------------------------------------
    story.append(make_category_header("3", "Accounting & BUSY ERP Invoicing", "#059669"))
    story.append(Spacer(1, 6))

    story.append(make_function_card(
        func_name="handleSaveInvoice()",
        screen_path="/admin/accounting/invoices/new",
        file_path="src/pages/admin/accounting/AdminInvoiceForm.tsx",
        endpoint="POST /api/accounting/invoices",
        trigger_text="User jab New Invoice screen par items fill karke 'Save & Generate Invoice' button dabata hai.",
        purpose_text="GST-compliant official Tax Invoice create karna aur BUSY accounting standards ke mutabiq ledger me record karna.",
        logic_steps=[
            "Client Party select hone par uska GST number aur billing address auto-fill karta hai.",
            "Items add hone par rate, quantity, discount aur GST (CGST/SGST ya IGST) calculate karta hai.",
            "Backend invoice number generate karta hai (Jaise INV-2026-0042) aur items ko bundle karke save karta hai."
        ],
        db_effect="<code>Invoice</code> table me master record aur <code>InvoiceItem</code> table me har product row save hoti hai.",
        screen_result="Invoice successfully create ho jata hai aur direct 'Print / Download PDF' ka option khulta hai."
    ))

    story.append(make_function_card(
        func_name="convertToTaxInvoice(proformaId)",
        screen_path="/admin/accounting/proformas",
        file_path="src/pages/admin/accounting/AdminProformaInvoices.tsx",
        endpoint="POST /api/accounting/proformas/:id/convert",
        trigger_text="Client se quotation confirm hone par jab user Proforma list me 'Convert to Tax Invoice' button dabata hai.",
        purpose_text="Estimate (PI) ko bina dobara typing kiye official Final Bill me badalna.",
        logic_steps=[
            "Proforma Invoice ka sara data (items, tax, client) read karta hai.",
            "Ek naya official Tax Invoice create karta hai aur naya Invoice Number assign karta hai.",
            "Proforma status ko 'Converted' mark karta hai taaki duplicate billing na ho."
        ],
        db_effect="<code>Invoice</code> table me new row insert hoti hai aur <code>ProformaInvoice</code> ka status 'converted' hota hai.",
        screen_result="Tax Invoice screen open ho jati hai jahan invoice number live dikhta hai."
    ))

    story.append(make_function_card(
        func_name="handleAddPayment()",
        screen_path="/admin/accounting/payments",
        file_path="src/pages/admin/accounting/AdminPayments.tsx",
        endpoint="POST /api/accounting/payments",
        trigger_text="Client se NEFT, Cheque, UPI ya Cash payment milne par jab accountant 'Add Payment' modal submit karta hai.",
        purpose_text="Received amount record karna aur invoice balance ko automatically clear karna.",
        logic_steps=[
            "Payment amount, date, reference/UTR number aur payment mode collect karta hai.",
            "Target Invoice par amount apply karta hai: Agar balance 0 ho gaya to Invoice status 'Paid' karta hai, warna 'Partially Paid'.",
            "Payment receipt generate hoti hai."
        ],
        db_effect="<code>Payment</code> table me row insert hoti hai aur <code>Invoice</code> table me <code>paidAmount</code> badh jata hai.",
        screen_result="Invoice list me 'Overdue' ya 'Unpaid' red badge badal kar 'Paid' green badge ho jata hai."
    ))

    story.append(PageBreak())

    # ----------------------------------------------------
    # CATEGORY 4: ENTERPRISE, TEAM & HR
    # ----------------------------------------------------
    story.append(make_category_header("4", "Enterprise, HR & Team Security", "#7c3aed"))
    story.append(Spacer(1, 6))

    story.append(make_function_card(
        func_name="handleSubmit() (Employee Creation Barrier)",
        screen_path="/admin/employees",
        file_path="src/pages/admin/AdminEmployees.tsx",
        endpoint="POST /admin/users",
        trigger_text="Admin jab 'Add Employee' modal me details bhar kar submit karta hai.",
        purpose_text="Naya staff create karna aur security shield ensure karna (Admin se Super Admin na ban sake).",
        logic_steps=[
            "Check karta hai: Agar current user Super Admin nahi hai aur designation me 'Super Admin' likha hai, to turant block karta hai.",
            "Backend par bhi double check hota hai: non-superadmin se roleId 1 aane par 403 Forbidden throw karta hai.",
            "Valid data hone par employee account banta hai aur default permissions assign hoti hain."
        ],
        db_effect="<code>User</code> table me row insert hoti hai aur password bcrypt hash ke sath save hota hai.",
        screen_result="Employee list me naya staff member add ho jata hai jise login credentials diye ja sakte hain."
    ))

    story.append(make_function_card(
        func_name="handlePermissionSave(userId, perms)",
        screen_path="/admin/employees (Permissions Modal)",
        file_path="src/pages/admin/AdminEmployees.tsx",
        endpoint="POST /api/superadmin/admins/:id/permissions",
        trigger_text="Admin jab kisi employee ke samne 'Permissions' icon par click karke switches on/off karke Save karta hai.",
        purpose_text="Employee ke modules ko customize karna (Jaise 'Leads View: YES', 'Delete Invoice: NO').",
        logic_steps=[
            "Modal me 20+ permissions switches ka state array banta hai.",
            "Backend purani permissions clear karke nayi permissions batch insert karta hai.",
            "Employee jab bhi window focus karega, ye permissions instant live ho jayengi."
        ],
        db_effect="<code>UserPermission</code> table me user ki permissions update hoti hain.",
        screen_result="Toast aati hai: 'Permissions updated successfully'. Employee ke portal par wahi modules dikhte hain jo allow kiye gaye hain."
    ))

    # ----------------------------------------------------
    # CATEGORY 5: WEBSITE CMS MANAGEMENT
    # ----------------------------------------------------
    story.append(make_category_header("5", "Website Content Management (CMS)", "#ea580c"))
    story.append(Spacer(1, 6))

    story.append(make_function_card(
        func_name="handleFileUpload() & handleSaveSlider()",
        screen_path="/admin/sliders & /admin/banner-images",
        file_path="src/pages/admin/AdminSliders.tsx, backend/src/index.ts",
        endpoint="POST /admin/upload-image, POST /admin/sliders",
        trigger_text="Admin jab homepage banner image select karke 'Save Slider' dabata hai.",
        purpose_text="Website par promotions, festival greetings, aur magazine announcements live karna.",
        logic_steps=[
            "Image file ko Multer multipart engine se backend server ke <code>uploads/</code> directory me save karta hai.",
            "Unique filename generate karta hai taaki purani image overwrite na ho.",
            "Website API par link set karta hai: /uploads/filename.jpg jise public visitors dekh sakein."
        ],
        db_effect="<code>Sliders</code> table me image URL, title, link aur order index save hota hai.",
        screen_result="Main website ke homepage par naya sliding banner turant live ho jata hai."
    ))

    story.append(PageBreak())

    # ----------------------------------------------------
    # CATEGORY 6: SUPER ADMIN EXCLUSIVE
    # ----------------------------------------------------
    story.append(make_category_header("6", "Super Admin Master Control", "#b91c1c"))
    story.append(Spacer(1, 6))

    story.append(make_function_card(
        func_name="createAdminApi(formData) & resetAdminPasswordApi()",
        screen_path="/super-admin/admins",
        file_path="src/pages/superadmin/SuperAdminAdmins.tsx",
        endpoint="POST /api/superadmin/admins, POST /api/superadmin/admins/:id/reset-password",
        trigger_text="Super Admin jab master panel se naya Company Admin create karta hai ya kisi Admin ka password reset karta hai.",
        purpose_text="Company level ke Admin accounts manage karna. Ye feature normal admin se poori tarah invisible hai.",
        logic_steps=[
            "Sirf wahi request accept karta hai jisme Super Admin ka valid token ho.",
            "Naye Admin ka profile create karta hai aur company name assign karta hai.",
            "Password reset hone par Admin ke purane sare active sessions force-logout kar deta hai."
        ],
        db_effect="<code>User</code> table me role 'Admin' ke sath naya account banta hai.",
        screen_result="Super Admin table me live admin dikhta hai aur use instant credential share kiye ja sakte hain."
    ))

    # ----------------------------------------------------
    # CATEGORY 7: EMPLOYEE WORKSPACE
    # ----------------------------------------------------
    story.append(make_category_header("7", "Employee Private Workspace", "#047857"))
    story.append(Spacer(1, 6))

    story.append(make_function_card(
        func_name="fetchLeads() (Employee Private Query)",
        screen_path="/employee/dashboard & /employee/leads",
        file_path="src/pages/employee/EmployeeDashboard.tsx",
        endpoint="GET /api/leads?myLeads=true",
        trigger_text="Employee jab apna portal open karta hai.",
        purpose_text="Data confidentiality ensure karna: Employee ko dusre staff ya company ki secret leads na dikhein.",
        logic_steps=[
            "Request ke sath employee ka token jata hai.",
            "Backend query me condition lagata hai: <code>WHERE ownerId = req.user.id</code>.",
            "Sirf wahi leads return hoti hain jo is sales executive ko assign ki gayi hain."
        ],
        db_effect="Database me filtered query chalti hai: <code>SELECT * FROM Lead WHERE ownerId = ?</code>.",
        screen_result="Employee ko clean list dikhti hai: 'My Assigned Leads (12)', 'Pending Calls (4)', 'Closed Deals (2)'."
    ))

    # Signoff Block
    signoff_data = [[
        Paragraph(
            "<b>HANDBOOK VERIFICATION SUMMARY:</b><br/>"
            "Ye detailed handbook Incense Media ke 7 main categories ke 12 sabse zaroori functions ko deep explanation ke sath define karta hai. "
            "Aap is handbook ki madad se kisi bhi module ke kaam karne ka tareeqa aur database impact bina kisi confusion ke samajh sakte hain.",
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
    story.append(Spacer(1, 8))
    story.append(signoff_table)

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[+] Successfully generated: {filename}")

if __name__ == "__main__":
    os.makedirs(os.path.dirname(pdf_path_root), exist_ok=True)
    os.makedirs(os.path.dirname(pdf_path_brain), exist_ok=True)
    build_pdf(pdf_path_root)
    build_pdf(pdf_path_desktop)
    build_pdf(pdf_path_downloads)
    build_pdf(pdf_path_brain)
    print("All Deep Explained PDFs generated successfully!")

