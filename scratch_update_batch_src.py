import os

backend_file = r'c:\xampp\htdocs\incenseMediaAdminCode\backend\src\controllers\lead.controller.ts'
with open(backend_file, 'r', encoding='utf-8') as f:
    content = f.read()

old_s = "const source = (row.source || defaultSource || `Imported - ${fullName}`).trim();"
new_s = """const rawSrc = String(row.source || defaultSource || 'import').trim().toLowerCase();
            const source = rawSrc.includes('web') ? 'website' :
                           rawSrc.includes('meta') ? 'meta' :
                           rawSrc.includes('whats') ? 'whatsapp' :
                           rawSrc.includes('expo') ? 'expo' :
                           rawSrc.includes('manual') ? 'manual' : 'import';"""

if old_s in content:
    content = content.replace(old_s, new_s)
    print("Replaced batchImportLeads source logic")
else:
    print("Warning: old_s not found")

with open(backend_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("backend lead.controller.ts updated!")
