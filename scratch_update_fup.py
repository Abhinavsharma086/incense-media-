import os

leads_file = r'c:\xampp\htdocs\incenseMediaAdminCode\src\pages\employee\EmployeeLeads.tsx'
with open(leads_file, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """      if (nextFollowUpDate) {

        payload.nextFollowUpDate = new Date(nextFollowUpDate).toISOString();

      }"""

new_block = """      const isClosedStatus = ['converted', 'won', 'lost'].includes(remarkStatus.toLowerCase());
      if (isClosedStatus) {
        payload.nextFollowUpDate = null;
      } else if (nextFollowUpDate) {
        payload.nextFollowUpDate = new Date(nextFollowUpDate).toISOString();
      }"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Replaced payload nextFollowUpDate in EmployeeLeads.tsx")
else:
    print("Warning: old_block not found, checking normalized")
    content = content.replace(old_block.replace('\r\n', '\n'), new_block)

with open(leads_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done EmployeeLeads payload update")
