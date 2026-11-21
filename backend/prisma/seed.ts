import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial test data for Super Admin & Invoicing...');

  // 0. Create Roles
  const rolesData = [
    { name: 'Super Admin', description: 'Root system access with full control over all modules and admins' },
    { name: 'Admin', description: 'Administrator with access based on assigned permissions' },
    { name: 'Sales Manager', description: 'Manages sales team, assigned units, leads, and deals' },
    { name: 'Sales Executive', description: 'Handles individual lead follow-ups and deals' },
    { name: 'Account Manager', description: 'Manages invoices, accounting items, and client accounts' },
    { name: 'Employee', description: 'Standard employee portal access' },
  ];

  const rolesMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    rolesMap[r.name] = role.id;
  }
  console.log('✔ Roles seeded:', Object.keys(rolesMap).join(', '));

  // 0b. Create Initial Super Admin Account (seeded securely)
  const bcrypt = await import('bcryptjs');
  const superAdminHashedPassword = await bcrypt.hash('SuperAdmin@123', 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@incensemedia.in' },
    update: {
      roleId: rolesMap['Super Admin'],
      isActive: true,
      isSuspended: false,
    },
    create: {
      firstName: 'System',
      lastName: 'SuperAdmin',
      email: 'superadmin@incensemedia.in',
      password: superAdminHashedPassword,
      phone: '9549404000',
      isActive: true,
      isSuspended: false,
      roleId: rolesMap['Super Admin'],
    },
  });
  console.log('✔ Super Admin seeded:', superAdminUser.email);

  // Seed default Admin Account
  const adminHashedPassword = await bcrypt.hash('Admin@123', 10);
  const defaultAdminUser = await prisma.user.upsert({
    where: { email: 'admin@incensemedia.in' },
    update: {
      roleId: rolesMap['Admin'],
      isActive: true,
    },
    create: {
      firstName: 'General',
      lastName: 'Admin',
      email: 'admin@incensemedia.in',
      password: adminHashedPassword,
      phone: '9829011111',
      isActive: true,
      roleId: rolesMap['Admin'],
    },
  });
  console.log('✔ Default Admin seeded:', defaultAdminUser.email);

  // Seed initial permissions matrix for default Admin
  const modules = [
    'users', 'admins', 'products', 'orders', 'payments', 
    'reports', 'settings', 'leads', 'deals', 'campaigns', 
    'units', 'meta', 'accounting', 'security'
  ];
  for (const mod of modules) {
    await prisma.userPermission.upsert({
      where: {
        userId_module: {
          userId: defaultAdminUser.id,
          module: mod,
        },
      },
      update: {},
      create: {
        userId: defaultAdminUser.id,
        module: mod,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: mod !== 'security', // default restrict security delete
        canExport: true,
        canApprove: true,
      },
    });
  }
  console.log('✔ Default Admin Permissions Matrix seeded');

  // Seed AdminPermission Keys (module.action) for default Admin
  const standardModules = ['users', 'admins', 'products', 'orders', 'payments', 'reports', 'settings', 'leads', 'deals', 'campaigns', 'units', 'meta', 'accounting', 'security'];
  const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve'];
  const allKeys: string[] = [];

  for (const m of standardModules) {
    for (const a of actions) {
      const key = `${m}.${a}`;
      allKeys.push(key);
      await prisma.adminPermission.upsert({
        where: {
          adminId_permissionKey: {
            adminId: defaultAdminUser.id,
            permissionKey: key,
          },
        },
        update: { isAllowed: m !== 'security' || a === 'view' },
        create: {
          adminId: defaultAdminUser.id,
          permissionKey: key,
          isAllowed: m !== 'security' || a === 'view',
        },
      });
    }
  }
  console.log('✔ AdminPermission Keys seeded');

  // Seed Reusable Permission Templates
  const templates = [
    {
      name: 'Full Admin Access',
      description: 'Full access to all module functions except system security deletion',
      permissions: JSON.stringify(allKeys.filter((k) => k !== 'security.delete')),
    },
    {
      name: 'Sales Manager Template',
      description: 'Access to Leads, Deals, Campaigns, Units, and Reports',
      permissions: JSON.stringify(
        allKeys.filter((k) =>
          k.startsWith('leads.') ||
          k.startsWith('deals.') ||
          k.startsWith('campaigns.') ||
          k.startsWith('units.') ||
          k.startsWith('reports.') ||
          k === 'users.view'
        )
      ),
    },
    {
      name: 'Accountant & Billing Template',
      description: 'Access to Orders, Payments, Accounting, Invoices, and Reports',
      permissions: JSON.stringify(
        allKeys.filter((k) =>
          k.startsWith('orders.') ||
          k.startsWith('payments.') ||
          k.startsWith('accounting.') ||
          k.startsWith('reports.') ||
          k === 'products.view'
        )
      ),
    },
    {
      name: 'Read-Only Inspector',
      description: 'View and Export only across all modules',
      permissions: JSON.stringify(allKeys.filter((k) => k.endsWith('.view') || k.endsWith('.export'))),
    },
  ];

  for (const t of templates) {
    await prisma.permissionTemplate.upsert({
      where: { name: t.name },
      update: { description: t.description, permissions: t.permissions },
      create: t,
    });
  }
  console.log('✔ Reusable Permission Templates seeded');

  // Seed Global Settings
  const initialSettings = [
    { key: 'site_name', value: 'Incense Media Command Portal', category: 'site_config', description: 'Application Site Title' },
    { key: 'maintenance_mode', value: 'false', category: 'maintenance', description: 'Toggle maintenance mode system-wide' },
    { key: 'ip_whitelist_enabled', value: 'false', category: 'security', description: 'Restrict SuperAdmin access to whitelisted IPs' },
    { key: 'whitelisted_ips', value: '127.0.0.1,::1', category: 'security', description: 'Allowed IP addresses' },
    { key: 'max_failed_login_attempts', value: '5', category: 'security', description: 'Rate limit threshold before lock' },
    { key: 'two_factor_required_super_admin', value: 'false', category: 'security', description: 'Enforce 2FA for Super Admin accounts' },
    { key: 'email_notifications_enabled', value: 'true', category: 'email_sms', description: 'Send automated email alerts' },
    { key: 'payment_gateway_mode', value: 'live', category: 'payment', description: 'Razorpay / Stripe Payment Gateway Mode' },
  ];
  for (const s of initialSettings) {
    await prisma.globalSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, category: s.category, description: s.description },
      create: s,
    });
  }
  console.log('✔ Global Settings seeded');

  // 1. Ensure Accounting Settings exist
  const existingSetting = await prisma.accountingSetting.findFirst();
  if (!existingSetting) {
    await prisma.accountingSetting.create({
      data: {
        companyGstin: '08AJCPG7964J1ZU',
        panNo: 'AJCPG7964J',
        companyPhone: '9549404000',
        companyEmail: 'info@incensemedia.in',
        companyState: 'Rajasthan',
        companyAddress: 'Plot No. 45, Incense Media Complex, Mansarovar Industrial Area, Jaipur, Rajasthan 302020',
        bankName: 'INDUSIND BANK',
        bankAccountNo: '201003249032',
        bankIfsc: 'INDB0001491',
        bankBranch: 'MANSAROVAR JAIPUR',
        upiNumber: '9549404000',
        termsAndConditions: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is delayed beyond due date.\n3. Subject to Jaipur Jurisdiction only.',
        invoicePrefix: '2025-26/',
        proformaPrefix: 'PI/2025-26/',
      }
    });
    console.log('✔ Accounting settings created');
  }

  // 2. Create Categories
  const cat1 = await prisma.itemCategory.upsert({
    where: { name: 'Agarbatti & Incense Products' },
    update: {},
    create: {
      name: 'Agarbatti & Incense Products',
      description: 'Finished incense sticks, dhoop cones, and aromatic items',
      type: 'PRODUCT'
    }
  });

  const cat2 = await prisma.itemCategory.upsert({
    where: { name: 'Raw Materials & Packaging' },
    update: {},
    create: {
      name: 'Raw Materials & Packaging',
      description: 'Bamboo sticks, jigat powder, raw fragrances, and outer boxes',
      type: 'PRODUCT'
    }
  });

  const cat3 = await prisma.itemCategory.upsert({
    where: { name: 'Digital Marketing & Advertising' },
    update: {},
    create: {
      name: 'Digital Marketing & Advertising',
      description: 'Magazine ads, digital banners, WhatsApp campaigns, social media promotion',
      type: 'SERVICE'
    }
  });

  const cat4 = await prisma.itemCategory.upsert({
    where: { name: 'Event & Expo Services' },
    update: {},
    create: {
      name: 'Event & Expo Services',
      description: 'Stall booking, pavilion setup, branding & event management',
      type: 'SERVICE'
    }
  });

  console.log('✔ Item Categories created');

  // 3. Create Products & Services
  const items = [
    {
      name: 'Lavender Premium Incense Sticks (250g Box)',
      type: 'PRODUCT',
      sku: 'PRD-LAV-01',
      categoryId: cat1.id,
      hsnSac: '33074100',
      unit: 'Pcs',
      purchasePrice: 110,
      salesRate: 180,
      gstPercentage: 12,
      openingStock: 500,
      currentStock: 500,
      description: 'Natural soothing lavender scented incense sticks in eco box'
    },
    {
      name: 'Sandalwood Royal Dhoop Cones (Pack of 50)',
      type: 'PRODUCT',
      sku: 'PRD-SND-02',
      categoryId: cat1.id,
      hsnSac: '33074100',
      unit: 'Pcs',
      purchasePrice: 140,
      salesRate: 240,
      gstPercentage: 12,
      openingStock: 350,
      currentStock: 350,
      description: 'Charcoal-free sandalwood royal dhoop cones with ceramic holder'
    },
    {
      name: 'Bamboo Sticks Grade A (10kg Bundle)',
      type: 'PRODUCT',
      sku: 'RAW-BAM-10',
      categoryId: cat2.id,
      hsnSac: '14011000',
      unit: 'Bundle',
      purchasePrice: 900,
      salesRate: 1200,
      gstPercentage: 18,
      openingStock: 100,
      currentStock: 100,
      description: 'Smooth round 8 inch & 9 inch bamboo sticks for incense rolling'
    },
    {
      name: 'Jigat Powder Premium (25kg Bag)',
      type: 'PRODUCT',
      sku: 'RAW-JIG-25',
      categoryId: cat2.id,
      hsnSac: '13019099',
      unit: 'Bags',
      purchasePrice: 2800,
      salesRate: 3500,
      gstPercentage: 18,
      openingStock: 40,
      currentStock: 40,
      description: 'High binding capacity natural bark jigat powder for Agarbatti manufacturing'
    },
    {
      name: 'Incense Media Expo Full Page Magazine Advert',
      type: 'SERVICE',
      sku: 'SRV-MAG-01',
      categoryId: cat3.id,
      hsnSac: '998363',
      unit: 'Units',
      purchasePrice: 15000,
      salesRate: 25000,
      gstPercentage: 18,
      openingStock: 0,
      currentStock: 0,
      description: 'Full page multi-color glossy print ad in Incense Media quarterly edition'
    },
    {
      name: 'WhatsApp Bulk Lead Promotion (50,000 Reach)',
      type: 'SERVICE',
      sku: 'SRV-WA-50K',
      categoryId: cat3.id,
      hsnSac: '998365',
      unit: 'Campaign',
      purchasePrice: 8000,
      salesRate: 15000,
      gstPercentage: 18,
      openingStock: 0,
      currentStock: 0,
      description: 'Targeted broadcast of brand catalogue & video to 50,000 B2B buyers'
    },
    {
      name: 'International Expo Shell Scheme Stall (10x10 ft)',
      type: 'SERVICE',
      sku: 'SRV-EXPO-10',
      categoryId: cat4.id,
      hsnSac: '998596',
      unit: 'Stall',
      purchasePrice: 55000,
      salesRate: 85000,
      gstPercentage: 18,
      openingStock: 0,
      currentStock: 0,
      description: '3x3m octanorm booth with 3 chairs, 1 counter table, fascia name & spotlights'
    }
  ];

  for (const item of items) {
    await prisma.accountingItem.upsert({
      where: { sku: item.sku },
      update: item,
      create: item
    });
  }

  console.log('✔ Sample Products & Services created');

  // 4. Create Parties / Customers
  const parties = [
    {
      name: 'Sharma Fragrances & Traders Pvt Ltd',
      gstin: '08AABCS1429B1Z2',
      state: 'Rajasthan',
      city: 'Jaipur',
      pincode: '302001',
      address: '124, Johari Bazar, Near Sanganeri Gate, Jaipur, Rajasthan 302001',
      phone: '9829012345',
      email: 'contact@sharmafragrances.com',
      creditDays: 30,
      currentBalance: 15400
    },
    {
      name: 'Rajesh Agencies & Distributors',
      gstin: '27AABCU9603R1ZM',
      state: 'Maharashtra',
      city: 'Mumbai',
      pincode: '400003',
      address: 'Shop No 14, Crawford Market, D.N. Road, Fort, Mumbai, Maharashtra 400003',
      phone: '9819098765',
      email: 'rajesh.agencies.mumbai@gmail.com',
      creditDays: 45,
      currentBalance: 42800
    },
    {
      name: 'Anand Media Works',
      gstin: '07AAACA1234A1Z5',
      state: 'Delhi',
      city: 'New Delhi',
      pincode: '110001',
      address: 'Suite 402, Connaught Place, Inner Circle, New Delhi 110001',
      phone: '9811054321',
      email: 'billing@anandmedia.co.in',
      creditDays: 15,
      currentBalance: 0
    },
    {
      name: 'Gulab Perfumers',
      gstin: '09AABCG7788P1Z9',
      state: 'Uttar Pradesh',
      city: 'Kannauj',
      pincode: '209725',
      address: 'Attar Gali, Main Bazar, Kannauj, Uttar Pradesh 209725',
      phone: '9415067890',
      email: 'info@gulabperfumers.com',
      creditDays: 30,
      currentBalance: 8500
    }
  ];

  for (const party of parties) {
    const existing = await prisma.party.findFirst({ where: { name: party.name } });
    if (!existing) {
      await prisma.party.create({ data: party });
    }
  }

  console.log('✔ Sample Parties/Customers created');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
