import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const employeesData = [
  { phone: "9950360444", name: "Management - Direct Sales", role: "Sales Manager", email: "direct.sales@incensemedia.in" },
  { phone: "9413090552", name: "Associate-Channel Sales", role: "Sales Executive", email: "channel.sales@incensemedia.in" },
  { phone: "6350603260", name: "Vimla Yadav", role: "Sales Executive", email: "vimla.yadav@incensemedia.in" },
  { phone: "8209367867", name: "Shanti Sharma", role: "Sales Executive", email: "shanti.sharma@incensemedia.in" },
  { phone: "9899496492", name: "Nikhil Premchandani", role: "Sales Executive", email: "nikhil.premchandani@incensemedia.in" },
  { phone: "8619052394", name: "Soniya Kumawat", role: "Sales Executive", email: "soniya.kumawat@incensemedia.in" },
  { phone: "8619064548", name: "Rajesh Jaitwal", role: "Sales Executive", email: "rajesh.jaitwal@incensemedia.in" },
  { phone: "6350236331", name: "Pinki Joshi", role: "Sales Executive", email: "pinki.joshi@incensemedia.in" },
  { phone: "9352103088", name: "Rajesh Thakur", role: "Sales Executive", email: "rajesh.thakur@incensemedia.in" },
  { phone: "6376363879", name: "Tarun Mittal", role: "Sales Executive", email: "tarun.mittal@incensemedia.in" },
  { phone: "9571388762", name: "Ashish Vijay", role: "Sales Executive", email: "ashish.vijay@incensemedia.in" },
  { phone: "9079681554", name: "Laxmi Mahawar", role: "Sales Executive", email: "laxmi.mahawar@incensemedia.in" },
  { phone: "7357323273", name: "Ankit Kedia", role: "Sales Executive", email: "ankit.kedia@incensemedia.in" },
  { phone: "9521755811", name: "Rajendra Yogi", role: "Sales Executive", email: "rajendra.yogi@incensemedia.in" },
  { phone: "8302400683", name: "Madhu Thakur", role: "Sales Executive", email: "madhu.thakur@incensemedia.in" },
  { phone: "7878437633", name: "Anand Singh", role: "Sales Executive", email: "anand.singh@incensemedia.in" },
  { phone: "7378115811", name: "Narendra Kumar Mittal", role: "Sales Executive", email: "narendra.mittal@incensemedia.in" },
  { phone: "7023567056", name: "Komal Ahuja", role: "Sales Executive", email: "komal.ahuja@incensemedia.in" },
  { phone: "8003563599", name: "Ved Prakash Lalwani", role: "Sales Executive", email: "vedprakash.lalwani@incensemedia.in" },
  { phone: "9351347234", name: "Kavita Meena", role: "Sales Executive", email: "kavita.meena@incensemedia.in" },
  { phone: "9664258629", name: "Sunita Khandelwal", role: "Sales Executive", email: "sunita.khandelwal@incensemedia.in" }
];

export async function seedAllEmployees() {
  console.log("=== STARTING SEEDING OF 21 EMPLOYEES ===");

  // 1. Ensure Roles
  const roles = await prisma.role.findMany();
  let salesExecRole = roles.find(r => r.name.toLowerCase() === 'sales executive');
  if (!salesExecRole) {
    salesExecRole = await prisma.role.create({
      data: { name: 'Sales Executive', description: 'Handles individual lead follow-ups and deals' }
    });
  }

  let salesMgrRole = roles.find(r => r.name.toLowerCase() === 'sales manager');
  if (!salesMgrRole) {
    salesMgrRole = await prisma.role.create({
      data: { name: 'Sales Manager', description: 'Manages sales team, assigned units, leads, and deals' }
    });
  }

  // 2. Ensure Unit
  let unit = await prisma.unit.findFirst({ where: { name: 'Sales & Telecalling Team' } });
  if (!unit) {
    unit = await prisma.unit.create({
      data: {
        name: 'Sales & Telecalling Team',
        description: 'Core sales and telecalling executive distribution unit'
      }
    });
  }

  // Default Password for all employees: Incense@123
  const defaultPasswordPlain = 'Incense@123';
  const hashedPassword = await bcrypt.hash(defaultPasswordPlain, 10);

  const modules = [
    'dashboard', 'leads', 'customers', 'products', 'invoices',
    'payments', 'reports', 'expenses', 'attendance', 'accounting'
  ];

  const results = [];

  for (const emp of employeesData) {
    const parts = emp.name.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    const roleId = emp.role === 'Sales Manager' ? salesMgrRole.id : salesExecRole.id;

    // Check by phone or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: emp.phone },
          { email: emp.email }
        ]
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: emp.email,
          phone: emp.phone,
          password: hashedPassword,
          roleId,
          isActive: true
        }
      });
      console.log(`[+] Created employee user: ${emp.name} (${emp.phone})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          phone: emp.phone,
          password: hashedPassword, // Reset to standard password Incense@123
          roleId,
          isActive: true
        }
      });
      console.log(`[*] Updated employee user: ${emp.name} (${emp.phone})`);
    }

    // Connect to UnitEmployee
    const ue = await prisma.unitEmployee.findFirst({
      where: {
        unitId: unit.id,
        employeeId: user.id
      }
    });

    if (!ue) {
      await prisma.unitEmployee.create({
        data: {
          unitId: unit.id,
          employeeId: user.id,
          maxCapacity: 200,
          isActive: true
        }
      });
    } else {
      await prisma.unitEmployee.update({
        where: { id: ue.id },
        data: {
          maxCapacity: 200,
          isActive: true
        }
      });
    }

    // Permissions
    for (const mod of modules) {
      await prisma.userPermission.upsert({
        where: {
          userId_module: {
            userId: user.id,
            module: mod
          }
        },
        create: {
          id: `uperm-${user.id}-${mod}`,
          userId: user.id,
          module: mod,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: false,
          canExport: true,
          canApprove: false,
          updatedAt: new Date()
        },
        update: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canExport: true,
          updatedAt: new Date()
        }
      });
    }

    results.push({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone,
      email: user.email,
      role: emp.role,
      defaultPassword: defaultPasswordPlain
    });
  }

  console.log(`[SUCCESS] Seeded/Updated ${results.length} employees successfully!`);
  return results;
}

if (require.main === module) {
  seedAllEmployees()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      prisma.$disconnect();
      process.exit(1);
    });
}

