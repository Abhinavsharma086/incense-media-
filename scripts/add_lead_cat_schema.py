with open('backend/prisma/schema.prisma', 'r', encoding='utf-8') as f:
    text = f.read()

model_code = """
model LeadCategory {
  id        String   @id @default(uuid())
  name      String   @unique
  label     String
  icon      String?  @default("🏷️")
  color     String?  @default("purple")
  createdBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
"""

if 'model LeadCategory' not in text:
    text += model_code
    with open('backend/prisma/schema.prisma', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Added LeadCategory to schema.prisma')
else:
    print('Already present')

