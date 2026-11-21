import prisma from './prisma';
import bcrypt from 'bcryptjs';

async function seedEmployee() {
  try {
    let role = await prisma.role.findFirst({ where: { name: 'Employee' } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: 'Employee', description: 'Standard employee portal access' },
      });
    }

    const hashedPassword = await bcrypt.hash('emp123', 10);
    let emp = await prisma.user.findUnique({ where: { email: 'employee@incense.com' } });
    if (!emp) {
      emp = await prisma.user.create({
        data: {
          id: 'emp-1',
          firstName: 'Alex',
          lastName: 'Mercer',
          email: 'employee@incense.com',
          password: hashedPassword,
          phone: '+91 9876543210',
          roleId: role.id,
          isActive: true,
        },
      });
      console.log('Created employee user in DB:', emp.id, emp.email);
    } else {
      emp = await prisma.user.update({
        where: { id: emp.id },
        data: { password: hashedPassword, isActive: true, roleId: role.id },
      });
      console.log('Updated employee user in DB:', emp.id, emp.email);
    }

    // Assign adminPermission or userPermission so permissions checks never fail
    const modules = [
      'dashboard', 'leads', 'customers', 'products', 'invoices',
      'payments', 'reports', 'expenses', 'attendance', 'accounting'
    ];
    for (const mod of modules) {
      await prisma.userPermission.upsert({
        where: {
          userId_module: {
            userId: emp.id,
            module: mod,
          },
        },
        create: {
          id: `uperm-${emp.id}-${mod}`,
          userId: emp.id,
          module: mod,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canExport: true,
          canApprove: true,
          updatedAt: new Date(),
        },
        update: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canExport: true,
          canApprove: true,
          updatedAt: new Date(),
        },
      });

      // Also adminPermission fallback
      const actions = ['view', 'create', 'edit', 'delete', 'approve'];
      for (const act of actions) {
        const permKey = `${mod}.${act}`;
        await prisma.adminPermission.upsert({
          where: {
            adminId_permissionKey: {
              adminId: emp.id,
              permissionKey: permKey,
            },
          },
          create: {
            id: `aperm-${emp.id}-${permKey}`,
            adminId: emp.id,
            permissionKey: permKey,
            isAllowed: true,
            updatedAt: new Date(),
          },
          update: {
            isAllowed: true,
            updatedAt: new Date(),
          },
        });
      }
    }

    // Ensure sample leads exist and assign them to the employee
    let leads = await prisma.lead.findMany();
    if (leads.length === 0) {
      await prisma.lead.create({
        data: {
          fullName: 'Rajesh Agarwal',
          phone: '+91 9820011223',
          email: 'rajesh@agarwalfragrance.com',
          companyName: 'Agarwal Fragrances',
          city: 'Mumbai',
          source: 'manual',
          status: 'contacted',
          priority: 'high',
          notes: '[Initial Contact]: Client interested in raw materials catalog.',
          ownerId: emp.id,
        },
      });
      await prisma.lead.create({
        data: {
          fullName: 'Pooja Verma',
          phone: '+91 9811122233',
          email: 'pooja@vermaenterprises.in',
          companyName: 'Verma Enterprises',
          city: 'Delhi',
          source: 'meta',
          status: 'new',
          priority: 'medium',
          notes: '[Meta Ad]: Interested in wholesale dealership.',
          ownerId: emp.id,
        },
      });
      await prisma.lead.create({
        data: {
          fullName: 'Vikram Joshi',
          phone: '+91 9845566778',
          email: 'vikram@joshienterprises.com',
          companyName: 'Joshi Sugandh',
          city: 'Bengaluru',
          source: 'website',
          status: 'follow_up',
          priority: 'high',
          notes: '[Follow-up Call]: Send sample kit tomorrow.',
          ownerId: emp.id,
        },
      });
    } else {
      // Assign existing leads to emp.id so employee sees them
      for (const l of leads) {
        await prisma.lead.update({
          where: { id: l.id },
          data: { ownerId: emp.id },
        });
      }
    }

    console.log('Employee seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedEmployee();
