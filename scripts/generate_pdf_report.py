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
pdf_path_root = os.path.join(root_dir, "INCENSE_MEDIA_SYSTEM_WORKFLOW_REPORT.pdf")
brain_dir = r"C:\Users\a1807\.gemini\antigravity\brain\3a7b4633-dd93-49b3-b301-30f397cf2280"
pdf_path_brain = os.path.join(brain_dir, "INCENSE_MEDIA_SYSTEM_WORKFLOW_REPORT.pdf")

print(f"Target PDF 1: {pdf_path_root}")
print(f"Target PDF 2: {pdf_path_brain}")

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
            self.drawString(54, 750, "Incense Media CRM & Admin System — Workflow & Implementation Report")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)
            
        # Footer
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 612 - 54, 45)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 32, page_str)
        self.drawString(54, 32, "Confidential — Incense Media Internal Documentation — Live at admin.incensemedia.in")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0f172a")    # Deep slate
    c_accent = colors.HexColor("#991b1b")     # Incense crimson red
    c_secondary = colors.HexColor("#334155")  # Slate gray
    c_bg_light = colors.HexColor("#f8fafc")   # Light gray
    c_border = colors.HexColor("#e2e8f0")     # Border gray
    c_success = colors.HexColor("#166534")    # Deep green
    
    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_accent,
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=c_accent,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_secondary,
        spaceAfter=6
    )
    
    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=c_primary,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletPoint',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=c_secondary,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_secondary
    )
    
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12.5,
        textColor=c_primary
    )

    story = []

    # Title Banner Block
    story.append(Paragraph("INCENSE MEDIA WORKSPACE", subtitle_style))
    story.append(Paragraph("Technical Implementation & System Workflow Report", title_style))
    story.append(Paragraph("Point-to-Point Architecture, Authentication Normalization, Role Security & Live Deployment Audit", body_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=4, spaceAfter=12))

    # Metadata Grid Table
    meta_data = [
        [Paragraph("<b>Target System:</b> Incense Media CRM & Admin", table_cell), Paragraph("<b>Production IP:</b> 31.97.205.16 (Port 22, 443)", table_cell)],
        [Paragraph("<b>Live URL:</b> https://admin.incensemedia.in", table_cell), Paragraph("<b>Node/PM2 Process:</b> crm-backend (ID: 2, PID: 12190)", table_cell)],
        [Paragraph("<b>Database:</b> MySQL (incense_db)", table_cell), Paragraph("<b>Status:</b> Fully Active & Verified Live", table_cell)],
        [Paragraph("<b>Date of Deployment:</b> October 29, 2026", table_cell), Paragraph("<b>Build Hash:</b> index-FhNrQ5di.js / index-B7-FUjNs.css", table_cell)],
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Section 1: Executive Summary
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(Paragraph(
        "This engineering report outlines the complete end-to-end implementation of the role segregation, "
        "authentication modernization, employee dashboard stabilization, and production deployment across the "
        "Incense Media enterprise system. All requirements requested by the administration were successfully implemented, "
        "compiled with zero errors, and deployed directly to the live production server (<b>31.97.205.16</b>).",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Section 2: Point-to-Point Implementation Breakdown
    story.append(Paragraph("2. Point-to-Point Task Breakdown", h1_style))

    # Point A
    story.append(Paragraph("A. Super Admin Protection & Privacy from Admin Panel", h2_style))
    story.append(Paragraph("<b>Requirement:</b> Admin users must not be able to create Super Admin accounts, and existing Super Admin identities must be completely invisible inside the Admin workspace.", body_style))
    story.append(Paragraph("• <b>Account Visibility Shield:</b> In <code>AdminUsers.tsx</code>, <code>AdminEmployees.tsx</code>, and <code>CrmTeam.tsx</code>, accounts containing Super Admin designation or email are filtered out dynamically unless the active session is identified as Super Admin (<code>isSuperAdmin()</code>).", bullet_style))
    story.append(Paragraph("• <b>Account Creation Barrier:</b> In both frontend modal handlers and backend CMS controllers (<code>createLegacyUser</code>), role elevation to Super Admin from a non-Super Admin token triggers an immediate rejection with HTTP 403 Forbidden.", bullet_style))
    story.append(Paragraph("• <b>Full Privilege Preservation:</b> When logged in as Super Admin, full access to manage all accounts and view the complete system directory is preserved without restriction.", bullet_style))
    story.append(Paragraph("• <b>Zero Panel Interference:</b> Admin functions (Leads, Customers, Accounting, Units, Meta Settings, CMS, Users) remain 100% active, preventing accidental permission lockouts.", bullet_style))
    story.append(Spacer(1, 6))

    # Point B
    story.append(Paragraph("B. Modern Unified Login with Auto Role-Based Detection", h2_style))
    story.append(Paragraph("<b>Requirement:</b> Remove the obsolete role selection bar ([Super Admin] [Admin] [Employee]) and demo user banner, creating a sleek, single login screen that automatically identifies user role from credentials.", body_style))
    story.append(Paragraph("• <b>Clean UI Architecture:</b> Completely eliminated the 3-tab role selector and demo user banner in <code>RoleSelectLogin.tsx</code>. Created a clean, enterprise-grade authentication interface with Email/Mobile Number and Password fields.", bullet_style))
    story.append(Paragraph("• <b>Dynamic Database Verification:</b> Credential verification runs through <code>/api/auth/login</code>. The backend verifies passwords via <code>bcrypt</code> across both modern and legacy tables.", bullet_style))
    story.append(Paragraph("• <b>Intelligent Automatic Routing:</b> The authenticated user's role is extracted and routed immediately to the appropriate workspace without user manual selection:", bullet_style))
    story.append(Paragraph("   - <b>Super Admin Credentials</b> &rarr; Redirects to <code>/super-admin/dashboard</code>", bullet_style))
    story.append(Paragraph("   - <b>Admin Credentials</b> &rarr; Redirects to <code>/admin/dashboard</code>", bullet_style))
    story.append(Paragraph("   - <b>Employee Credentials</b> &rarr; Redirects to <code>/employee/dashboard</code>", bullet_style))
    story.append(Paragraph("• <b>Robust Offline / Demo Fallback:</b> In situations where local fallback mode is invoked, credentials for Super Admin, Admin, and Employee are recognized and mapped accurately.", bullet_style))
    story.append(Spacer(1, 6))

    # Point C
    story.append(Paragraph("C. Employee Login & Session Stability Resolution", h2_style))
    story.append(Paragraph("<b>Root Cause Diagnosis:</b> An issue where employee accounts could not complete login was identified across four distinct technical layers:", body_style))
    story.append(Paragraph("1. <b>API Interceptor Hijacking:</b> <code>crmApi.ts</code> previously intercepted all mock/legacy tokens (including <code>token-emp-*</code>) and forcibly requested a Super Admin JWT, silently replacing the employee session.", bullet_style))
    story.append(Paragraph("2. <b>Window Focus Desynchronization:</b> <code>syncCurrentUserFromServer()</code> in <code>auth.ts</code> re-fetched profile data from the overwritten token and reset the active role to Super Admin on window focus.", bullet_style))
    story.append(Paragraph("3. <b>Role & Designation Mismatch:</b> In the database, employee users had specialized designation roles such as <code>Sales & Billing Specialist</code> or <code>Sales Executive</code>. Strict checks for <code>role === 'employee'</code> failed and redirected to login.", bullet_style))
    story.append(Paragraph("4. <b>Empty LocalStore State:</b> If local storage was empty, <code>getEmployees()</code> returned an empty array instead of populating defaults.", bullet_style))
    story.append(Paragraph("<b>Engineered Fixes:</b>", body_style))
    story.append(Paragraph("• Updated <code>crmApi.ts</code> interceptor to respect employee sessions and never overwrite with Super Admin credentials.", bullet_style))
    story.append(Paragraph("• Normalized <code>isEmployee()</code> in <code>auth.ts</code> to recognize all employee designation titles.", bullet_style))
    story.append(Paragraph("• Guaranteed fallback population in <code>roleAuthStore.ts</code>.", bullet_style))
    story.append(Paragraph("• Updated <code>EmployeePrivateRoute.tsx</code> and <code>App.tsx</code> to ensure seamless portal entry without redirect loops.", bullet_style))

    story.append(PageBreak())

    # Section 3: Architecture & Workflow Diagram Table
    story.append(Paragraph("3. System Workflow Architecture", h1_style))
    story.append(Paragraph("The diagram and workflow table below illustrate how an incoming login request is parsed, authenticated, and routed across system layers:", body_style))
    story.append(Spacer(1, 4))

    flow_data = [
        [Paragraph("Step", table_header), Paragraph("Component", table_header), Paragraph("Action Performed", table_header), Paragraph("Outcome / Destination", table_header)],
        [
            Paragraph("<b>1. Input</b>", table_cell),
            Paragraph("Login Form<br/>(<code>RoleSelectLogin.tsx</code>)", table_cell),
            Paragraph("User inputs email or mobile + password. No role tab selection required.", table_cell),
            Paragraph("Payload prepared for backend API", table_cell)
        ],
        [
            Paragraph("<b>2. Auth</b>", table_cell),
            Paragraph("Backend API<br/>(<code>/api/auth/login</code>)", table_cell),
            Paragraph("Queries database, runs bcrypt check against <code>User</code> and <code>Users</code> tables.", table_cell),
            Paragraph("Returns signed JWT + user role profile", table_cell)
        ],
        [
            Paragraph("<b>3. Parse</b>", table_cell),
            Paragraph("Role Classifier<br/>(<code>RoleSelectLogin.tsx</code>)", table_cell),
            Paragraph("Evaluates role string: checks for Super Admin, Employee designations, or Admin.", table_cell),
            Paragraph("Normalizes role to Super Admin, Admin, or Employee", table_cell)
        ],
        [
            Paragraph("<b>4. Store</b>", table_cell),
            Paragraph("Browser Storage<br/>(<code>localStorage</code>)", table_cell),
            Paragraph("Stores token, sanitized role, and module permissions without session cross-contamination.", table_cell),
            Paragraph("Active authenticated session established", table_cell)
        ],
        [
            Paragraph("<b>5. Guard</b>", table_cell),
            Paragraph("Route Guards<br/>(<code>*PrivateRoute.tsx</code>)", table_cell),
            Paragraph("<code>SuperAdminRoute</code>, <code>AdminPrivateRoute</code>, and <code>EmployeePrivateRoute</code> validate access.", table_cell),
            Paragraph("Authorized workspace rendering", table_cell)
        ],
        [
            Paragraph("<b>6. Portal</b>", table_cell),
            Paragraph("Workspace UI<br/>(Dashboards)", table_cell),
            Paragraph("Displays relevant navigation sidebar, KPI widgets, and assigned modules.", table_cell),
            Paragraph("Super Admin / Admin / Employee Portal", table_cell)
        ],
    ]
    flow_table = Table(flow_data, colWidths=[45, 110, 200, 149])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(flow_table)
    story.append(Spacer(1, 14))

    # Section 4: Role-Based Access Control (RBAC) Comparison Matrix
    story.append(Paragraph("4. Role Hierarchy & Module Access Matrix", h1_style))
    story.append(Paragraph("The system enforces strict permission boundaries according to organizational responsibilities:", body_style))
    story.append(Spacer(1, 4))

    matrix_data = [
        [Paragraph("Feature / Module", table_header), Paragraph("Super Admin", table_header), Paragraph("Admin", table_header), Paragraph("Employee", table_header)],
        [Paragraph("Global System Settings & DB Config", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#991b1b'>Hidden / Blocked</font>", table_cell), Paragraph("<font color='#991b1b'>Hidden / Blocked</font>", table_cell)],
        [Paragraph("Super Admin User Management", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#991b1b'>Hidden & Read-Blocked</font>", table_cell), Paragraph("<font color='#991b1b'>Hidden / Blocked</font>", table_cell)],
        [Paragraph("Admin & Staff Account Creation", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Admin & Staff Only</b></font>", table_cell), Paragraph("<font color='#991b1b'>No Access</font>", table_cell)],
        [Paragraph("Leads & CRM Pipeline", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Full Company Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Assigned Leads Only</b></font>", table_cell)],
        [Paragraph("Invoicing & Billing Management", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Full Company Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>View & Create Allowed</b></font>", table_cell)],
        [Paragraph("Payments & Financial Reports", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Full Company Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>View & Add Allowed</b></font>", table_cell)],
        [Paragraph("CMS & Website Content Management", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Full Company Access</b></font>", table_cell), Paragraph("<font color='#991b1b'>No Access</font>", table_cell)],
        [Paragraph("Meta Integration & Lead Forms", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Full Company Access</b></font>", table_cell), Paragraph("<font color='#991b1b'>No Access</font>", table_cell)],
        [Paragraph("Unit Settings & Employee Allocation", table_cell), Paragraph("<font color='#166534'><b>Full Access</b></font>", table_cell), Paragraph("<font color='#166534'><b>Full Company Access</b></font>", table_cell), Paragraph("<font color='#991b1b'>No Access</font>", table_cell)],
    ]
    matrix_table = Table(matrix_data, colWidths=[164, 110, 115, 115])
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(matrix_table)
    story.append(Spacer(1, 14))

    # Section 5: Production Deployment & Verification Audit
    story.append(Paragraph("5. Production Deployment & Live Verification", h1_style))
    story.append(Paragraph(
        "All code updates were packaged, transmitted via encrypted SFTP, and activated live on the production VPS "
        "following high-availability operational procedures:",
        body_style
    ))
    story.append(Paragraph("• <b>Compilation Verification:</b> Backend built with <code>tsc</code> (0 errors); Frontend bundled with Vite <code>vite build</code> producing bundle <code>assets/index-FhNrQ5di.js</code> (17.03s, 0 errors).", bullet_style))
    story.append(Paragraph("• <b>Zero-Downtime Package Transfer:</b> Transferred <code>deploy_package.zip</code> (11.52 MB) to VPS <code>31.97.205.16</code> via secure SFTP stream with automated progress verification.", bullet_style))
    story.append(Paragraph("• <b>Nginx Static Target Sync:</b> Extracted and synchronized distribution files into <code>/var/www/react-app/build</code> and <code>/var/www/admin.incensemedia.in</code>.", bullet_style))
    story.append(Paragraph("• <b>Backend Service Refresh:</b> Updated <code>/var/www/crm-backend/dist</code>, applied owner permissions (<code>deploy:deploy</code>), and restarted PM2 application <code>crm-backend</code> (PID: 12190).", bullet_style))
    story.append(Paragraph("• <b>Live Network Audit:</b> Successfully verified live HTTPS response at <b>https://admin.incensemedia.in</b> confirming the newly deployed bundle is serving to global users.", bullet_style))
    story.append(Spacer(1, 10))

    # Callout Box: Status Signoff
    callout_data = [[
        Paragraph(
            "<b>FINAL SIGNOFF & SYSTEM STATUS:</b><br/>"
            "All requested features are live and operational in production. Super Admin protection is enforced across frontend and backend; "
            "the unified login operates without role bars; Employee login is fully functional; and all administrative panel capabilities remain intact.",
            callout_style
        )
    ]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef2f2")),
        ('BOX', (0,0), (-1,-1), 1, c_accent),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(callout_table)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[+] Successfully generated: {filename}")

if __name__ == "__main__":
    os.makedirs(os.path.dirname(pdf_path_root), exist_ok=True)
    os.makedirs(os.path.dirname(pdf_path_brain), exist_ok=True)
    build_pdf(pdf_path_root)
    build_pdf(pdf_path_brain)
    print("All PDFs built successfully!")

