const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true } } }
  });
  console.log('Roles in DB:');
  console.log(JSON.stringify(roles, null, 2));

  const adminRoles = roles.filter(r => r.name.toLowerCase().includes('admin'));
  const empRoles = roles.filter(r => !r.name.toLowerCase().includes('admin'));
  console.log('\nAdmin roles:', adminRoles.map(r => `${r.name} (${r._count.users})`));
  console.log('Employee roles:', empRoles.map(r => `${r.name} (${r._count.users})`));
}

run().catch(console.error).finally(() => prisma.$disconnect());

