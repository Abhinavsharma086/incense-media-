with open('backend/src/controllers/superadmin.controller.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update getDashboardStats
old_stats = """export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalAdmins = await prisma.user.count();
    const activeAdmins = await prisma.user.count({ where: { isActive: true, isSuspended: false } });
    const suspendedAdmins = await prisma.user.count({ where: { isSuspended: true } });"""

new_stats = """export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminRoles = await prisma.role.findMany({
      where: {
        OR: [
          { name: { contains: 'Admin' } },
          { name: { contains: 'admin' } },
        ]
      },
      select: { id: true }
    });
    const adminRoleIds = adminRoles.map(r => r.id);

    const totalAdmins = await prisma.user.count({
      where: { roleId: { in: adminRoleIds } }
    });
    const activeAdmins = await prisma.user.count({
      where: { roleId: { in: adminRoleIds }, isActive: true, isSuspended: false }
    });
    const suspendedAdmins = await prisma.user.count({
      where: { roleId: { in: adminRoleIds }, isSuspended: true }
    });

    const totalEmployees = await prisma.user.count({
      where: { roleId: { notIn: adminRoleIds } }
    });
    const activeEmployees = await prisma.user.count({
      where: { roleId: { notIn: adminRoleIds }, isActive: true, isSuspended: false }
    });
    const suspendedEmployees = await prisma.user.count({
      where: { roleId: { notIn: adminRoleIds }, isSuspended: true }
    });"""

code = code.replace(old_stats, new_stats)

old_res_stats = """    res.json({
      stats: {
        totalAdmins,
        activeAdmins,
        suspendedAdmins,
        activeSessionsCount,
        totalLeads,
        totalDeals,
        totalInvoices,
        maintenanceMode: settingsMap['maintenance_mode'] === 'true',
      },"""

new_res_stats = """    res.json({
      stats: {
        totalAdmins,
        activeAdmins,
        suspendedAdmins,
        totalEmployees,
        activeEmployees,
        suspendedEmployees,
        activeSessionsCount,
        totalLeads,
        totalDeals,
        totalInvoices,
        maintenanceMode: settingsMap['maintenance_mode'] === 'true',
      },"""

code = code.replace(old_res_stats, new_res_stats)

# 2. Update getAdmins to support filtering by type=admin / employee / all
old_get_admins = """export const getAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = getParam(req.query.search as any);
    const status = getParam(req.query.status as any);
    const roleId = getParam(req.query.roleId as any);"""

new_get_admins = """export const getAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = getParam(req.query.search as any);
    const status = getParam(req.query.status as any);
    const roleId = getParam(req.query.roleId as any);
    const type = getParam(req.query.type as any); // 'admin' | 'employee' | 'all'"""

code = code.replace(old_get_admins, new_get_admins)

old_where_clause = """    if (roleId) {
      whereClause.roleId = roleId;
    }"""

new_where_clause = """    const adminRoles = await prisma.role.findMany({
      where: {
        OR: [
          { name: { contains: 'Admin' } },
          { name: { contains: 'admin' } },
        ]
      },
      select: { id: true }
    });
    const adminRoleIds = adminRoles.map(r => r.id);

    if (roleId) {
      whereClause.roleId = roleId;
    } else if (type === 'admin') {
      whereClause.roleId = { in: adminRoleIds };
    } else if (type === 'employee') {
      whereClause.roleId = { notIn: adminRoleIds };
    }"""

code = code.replace(old_where_clause, new_where_clause)

# Also add counts in response
old_admins_res = """    res.json({
      admins,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      roles,
    });"""

new_admins_res = """    const [totalAdminsCount, totalEmployeesCount, totalAllCount] = await Promise.all([
      prisma.user.count({ where: { roleId: { in: adminRoleIds } } }),
      prisma.user.count({ where: { roleId: { notIn: adminRoleIds } } }),
      prisma.user.count(),
    ]);

    res.json({
      admins,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      counts: {
        admins: totalAdminsCount,
        employees: totalEmployeesCount,
        all: totalAllCount,
      },
      roles,
    });"""

code = code.replace(old_admins_res, new_admins_res)

with open('backend/src/controllers/superadmin.controller.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated superadmin.controller.ts with employee/admin separation!')

