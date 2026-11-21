import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { recordActivityLog } from '../middleware/auth.middleware';

// Helper to safely extract string params
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

// ----------------------------------------------------
// 1. DASHBOARD OVERVIEW & SYSTEM MONITORING STATS
// ----------------------------------------------------
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
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
    });

    // Active sessions in the last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeSessionsCount = await prisma.userSession.count({
      where: { isValid: true, updatedAt: { gte: twentyFourHoursAgo } },
    });

    const recentLogs = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const totalLeads = await prisma.lead.count();
    const totalDeals = await prisma.deal.count();
    const totalInvoices = await prisma.invoice.count();

    const globalSettings = await prisma.globalSetting.findMany();
    const settingsMap = globalSettings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    res.json({
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
      },
      recentLogs,
      globalSettings: settingsMap,
    });
  } catch (error: any) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: 'Failed to load dashboard statistics', error: error.message });
  }
};

// ----------------------------------------------------
// 2. ADMIN MANAGEMENT (CRUD + Suspend + Reset + Logout)
// ----------------------------------------------------

export const getAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = getParam(req.query.search as any);
    const status = getParam(req.query.status as any);
    const roleId = getParam(req.query.roleId as any);
    const type = getParam(req.query.type as any); // 'admin' | 'employee' | 'all'
    const pageStr = getParam(req.query.page as any) || '1';
    const limitStr = getParam(req.query.limit as any) || '20';

    const pageNum = parseInt(pageStr, 10) || 1;
    const limitNum = parseInt(limitStr, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (status === 'suspended') {
      whereClause.isSuspended = true;
    } else if (status === 'active') {
      whereClause.isActive = true;
      whereClause.isSuspended = false;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }
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

    const effectiveType = type || 'admin';
    if (roleId) {
      whereClause.roleId = roleId;
    } else if (effectiveType === 'admin') {
      whereClause.roleId = { in: adminRoleIds };
    } else if (effectiveType === 'employee') {
      whereClause.roleId = { notIn: adminRoleIds };
    }

    const [total, admins] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          isSuspended: true,
          twoFactorEnabled: true,
          forcePasswordReset: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: { id: true, name: true, description: true },
          },
          userPermissions: true,
          _count: {
            select: { loginHistories: true, sessions: true, activityLogs: true },
          },
        },
      }),
    ]);

    let roles = await prisma.role.findMany();
    if (roles.length === 0) {
      await prisma.role.createMany({
        data: [
          { name: 'Super Admin', description: 'Full system privileges' },
          { name: 'Admin', description: 'Standard administrator' },
          { name: 'Sales Manager', description: 'Sales & Lead unit manager' },
          { name: 'Employee', description: 'Standard staff employee' },
        ],
        skipDuplicates: true,
      });
      roles = await prisma.role.findMany();
    }

    const [totalAdminsCount, totalEmployeesCount, totalAllCount] = await Promise.all([
      prisma.user.count({ where: { roleId: { in: adminRoleIds } } }),
      prisma.user.count({ where: { roleId: { notIn: adminRoleIds } } }),
      prisma.user.count(),
    ]);

    res.json({
      data: admins,
      roles,
      counts: {
        admins: totalAdminsCount,
        employees: totalEmployeesCount,
        all: totalAllCount,
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch admin accounts', error: error.message });
  }
};

export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const { firstName, lastName, email, password, phone, roleId } = req.body;

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: 'First name, last name, email, and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // Resolve target roleId dynamically
    let targetRoleId = roleId;
    let roleRecord = targetRoleId ? await prisma.role.findUnique({ where: { id: targetRoleId } }) : null;

    if (!roleRecord && targetRoleId) {
      roleRecord = await prisma.role.findFirst({
        where: { OR: [{ name: targetRoleId }, { id: targetRoleId }] }
      });
    }

    if (!roleRecord) {
      roleRecord = await prisma.role.findFirst({
        where: { OR: [{ name: 'Admin' }, { name: 'Super Admin' }] }
      });
      if (!roleRecord) {
        roleRecord = await prisma.role.create({
          data: { name: 'Admin', description: 'Administrator Role' }
        });
      }
    }

    targetRoleId = roleRecord.id;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone: phone || null,
        roleId: targetRoleId,
        isActive: true,
        isSuspended: false,
      },
      include: { role: true },
    });

    // Default permission setup for the new Admin across standard modules
    const modules = ['users', 'admins', 'products', 'orders', 'payments', 'reports', 'settings', 'leads', 'deals', 'campaigns', 'units', 'meta', 'accounting', 'security'];
    const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

    for (const mod of modules) {
      try {
        await prisma.userPermission.upsert({
          where: {
            userId_module: {
              userId: newAdmin.id,
              module: mod,
            },
          },
          update: {},
          create: {
            userId: newAdmin.id,
            module: mod,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canExport: true,
            canApprove: true,
          },
        });

        for (const act of actions) {
          await prisma.adminPermission.upsert({
            where: {
              adminId_permissionKey: {
                adminId: newAdmin.id,
                permissionKey: `${mod}.${act}`,
              },
            },
            update: { isAllowed: true },
            create: {
              adminId: newAdmin.id,
              permissionKey: `${mod}.${act}`,
              isAllowed: true,
            },
          });
        }
      } catch (permErr) {
        console.warn(`Permission setup warning for module ${mod}:`, permErr);
      }
    }

    await recordActivityLog(superAdminId, 'ADMIN_CREATED', 'admins', newAdmin.id, 'User', null, { email, role: newAdmin.role?.name || 'Admin' }, req);

    res.status(201).json({ message: 'Admin account created successfully', admin: newAdmin });
  } catch (error: any) {
    console.error('Error in createAdmin:', error);
    res.status(500).json({ message: 'Failed to create admin account', error: error.message });
  }
};

export const updateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);
    const { firstName, lastName, email, phone, roleId, isActive, isSuspended } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Admin account not found' });
      return;
    }

    const updatedAdmin = await prisma.user.update({
      where: { id },
      data: {
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        roleId: roleId ?? existing.roleId,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        isSuspended: isSuspended !== undefined ? isSuspended : existing.isSuspended,
      },
      include: { role: true },
    });

    await recordActivityLog(superAdminId, 'ADMIN_UPDATED', 'admins', id, 'User', existing, updatedAdmin, req);

    res.json({ message: 'Admin account updated successfully', admin: updatedAdmin });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update admin account', error: error.message });
  }
};

export const toggleAdminSuspension = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);
    const { suspend, reason } = req.body;

    const admin = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!admin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    if (admin.role.name === 'Super Admin') {
      res.status(400).json({ message: 'Cannot suspend a Super Admin account' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isSuspended: suspend,
        isActive: !suspend,
      },
    });

    if (suspend) {
      await prisma.userSession.updateMany({
        where: { userId: id },
        data: { isValid: false },
      });
    }

    await recordActivityLog(
      superAdminId,
      suspend ? 'ADMIN_SUSPENDED' : 'ADMIN_RESTORED',
      'admins',
      id,
      'User',
      { isSuspended: admin.isSuspended },
      { isSuspended: suspend, reason },
      req
    );

    res.json({
      message: suspend ? 'Admin account suspended and sessions terminated' : 'Admin account restored to active status',
      admin: updated,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update admin status', error: error.message });
  }
};

export const resetAdminPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);
    const { newPassword, forcePasswordReset } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordReset: forcePasswordReset ?? true,
      },
    });

    try {
      await prisma.$executeRawUnsafe(
        "UPDATE `Users` SET `password` = ?, `updatedAt` = NOW() WHERE `id` = ?",
        hashedPassword,
        id
      );
    } catch (_) {}

    await prisma.userSession.updateMany({
      where: { userId: id },
      data: { isValid: false },
    });

    await recordActivityLog(superAdminId, 'PASSWORD_RESET', 'admins', id, 'User', null, { forcedReset: forcePasswordReset }, req);

    res.json({ message: 'Admin password reset successfully. Active sessions terminated.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to reset admin password', error: error.message });
  }
};

export const forceLogoutAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);

    await prisma.userSession.updateMany({
      where: { userId: id },
      data: { isValid: false },
    });

    await recordActivityLog(superAdminId, 'FORCE_LOGOUT', 'admins', id, 'User', null, { status: 'SESSIONS_TERMINATED' }, req);

    res.json({ message: 'Successfully logged out admin from all active sessions' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to force logout admin', error: error.message });
  }
};

export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);
    const { superAdminPassword } = req.body || {};

    if (!superAdminPassword) {
      res.status(400).json({ message: 'Super Admin password re-entry is required for deletion confirmation' });
      return;
    }

    const superAdmin = await prisma.user.findUnique({ where: { id: superAdminId } });
    if (superAdmin && superAdmin.password) {
      const isValidPass = await bcrypt.compare(superAdminPassword, superAdmin.password);
      if (!isValidPass) {
        res.status(401).json({ message: 'Invalid Super Admin password confirmation' });
        return;
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!targetUser) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    if (targetUser.role.name === 'Super Admin') {
      res.status(400).json({ message: 'Super Admin account cannot be deleted' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await recordActivityLog(superAdminId, 'ADMIN_DELETED', 'admins', id, 'User', { email: targetUser.email }, null, req);

    res.json({ message: 'Admin account deleted permanently' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete admin account', error: error.message });
  }
};

export const getAdminLoginHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam((req.params as any).id);
    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const activeSessions = await prisma.userSession.findMany({
      where: { userId: id, isValid: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ loginHistory, activeSessions });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch login history', error: error.message });
  }
};

// ----------------------------------------------------
// 3. GRANULAR PERMISSION CONTROL
// ----------------------------------------------------

export const getAdminPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam((req.params as any).id);
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
    });

    const allModules = [
      'users', 'admins', 'products', 'orders', 'payments', 
      'reports', 'settings', 'leads', 'deals', 'campaigns', 
      'units', 'meta', 'accounting', 'security'
    ];

    const permMap = userPermissions.reduce((acc: any, p) => {
      acc[p.module] = p;
      return acc;
    }, {});

    const matrix = allModules.map((mod) => {
      if (permMap[mod]) {
        return permMap[mod];
      }
      return {
        userId: id,
        module: mod,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
        canApprove: true,
      };
    });

    res.json({ userId: id, permissions: matrix });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch admin permissions', error: error.message });
  }
};

export const updateAdminPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ message: 'Permissions payload must be an array of module configurations' });
      return;
    }

    for (const perm of permissions) {
      await prisma.userPermission.upsert({
        where: {
          userId_module: {
            userId: id,
            module: perm.module,
          },
        },
        update: {
          canView: perm.canView ?? true,
          canCreate: perm.canCreate ?? true,
          canEdit: perm.canEdit ?? true,
          canDelete: perm.canDelete ?? true,
          canExport: perm.canExport ?? true,
          canApprove: perm.canApprove ?? true,
        },
        create: {
          userId: id,
          module: perm.module,
          canView: perm.canView ?? true,
          canCreate: perm.canCreate ?? true,
          canEdit: perm.canEdit ?? true,
          canDelete: perm.canDelete ?? true,
          canExport: perm.canExport ?? true,
          canApprove: perm.canApprove ?? true,
        },
      });
    }

    await recordActivityLog(superAdminId, 'PERMISSIONS_UPDATED', 'permissions', id, 'UserPermission', null, permissions, req);

    res.json({ message: 'Granular permissions updated instantly', userId: id });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update permissions', error: error.message });
  }
};

// ----------------------------------------------------
// 4. GLOBAL SETTINGS & FEATURE FLAGS
// ----------------------------------------------------

export const getGlobalSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.globalSetting.findMany({
      orderBy: { category: 'asc' },
    });
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch global settings', error: error.message });
  }
};

export const updateGlobalSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ message: 'Invalid settings format' });
      return;
    }

    const updatedList = [];
    if (Array.isArray(settings)) {
      for (const item of settings) {
        const updated = await prisma.globalSetting.upsert({
          where: { key: item.key },
          update: { value: item.value?.toString(), category: item.category, description: item.description, updatedBy: superAdminId },
          create: { key: item.key, value: item.value?.toString() || '', category: item.category || 'general', description: item.description, updatedBy: superAdminId },
        });
        updatedList.push(updated);
      }
    } else {
      for (const [key, value] of Object.entries(settings)) {
        const updated = await prisma.globalSetting.upsert({
          where: { key },
          update: { value: (value as any)?.toString(), updatedBy: superAdminId },
          create: { key, value: (value as any)?.toString() || '', updatedBy: superAdminId },
        });
        updatedList.push(updated);
      }
    }

    await recordActivityLog(superAdminId, 'GLOBAL_SETTINGS_UPDATED', 'settings', 'global', 'GlobalSetting', null, settings, req);

    res.json({ message: 'Global settings updated successfully', settings: updatedList });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update global settings', error: error.message });
  }
};

// ----------------------------------------------------
// 5. MONITORING & AUDIT LOGS
// ----------------------------------------------------

export const getActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = getParam(req.query.search as any);
    const modFilter = getParam(req.query.module as any);
    const actionFilter = getParam(req.query.action as any);
    const pageStr = getParam(req.query.page as any) || '1';
    const limitStr = getParam(req.query.limit as any) || '50';

    const pageNum = parseInt(pageStr, 10) || 1;
    const limitNum = parseInt(limitStr, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { action: { contains: search } },
        { module: { contains: search } },
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }
    if (modFilter) {
      whereClause.module = modFilter;
    }
    if (actionFilter) {
      whereClause.action = actionFilter;
    }

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where: whereClause }),
      prisma.activityLog.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } },
          },
        },
      }),
    ]);

    res.json({
      logs,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch activity logs', error: error.message });
  }
};

// ----------------------------------------------------
// 6. PERMISSION KEYS & REUSABLE TEMPLATES (module.action)
// ----------------------------------------------------

export const getAdminPermissionKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam((req.params as any).id);

    const dbPermissions = await prisma.adminPermission.findMany({
      where: { adminId: id },
    });

    const permissionMap: Record<string, boolean> = {};
    for (const p of dbPermissions) {
      permissionMap[p.permissionKey] = p.isAllowed;
    }

    res.json({ adminId: id, permissions: permissionMap });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch admin permission keys', error: error.message });
  }
};

export const updateAdminPermissionKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);
    const { permissions } = req.body; // Map of { [permissionKey: string]: boolean }

    if (!permissions || typeof permissions !== 'object') {
      res.status(400).json({ message: 'Permissions payload must be an object of key-boolean pairs' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { email: true } });

    // Fetch existing permissions for audit comparison
    const existing = await prisma.adminPermission.findMany({
      where: { adminId: id },
    });
    const existingMap = existing.reduce((acc: any, p) => {
      acc[p.permissionKey] = p.isAllowed;
      return acc;
    }, {});

    const changesLogged: string[] = [];

    for (const [key, allowed] of Object.entries(permissions)) {
      const isAllowedBool = Boolean(allowed);
      const wasAllowed = existingMap[key] ?? false;

      if (wasAllowed !== isAllowedBool) {
        changesLogged.push(`${key}: ${wasAllowed ? 'ON' : 'OFF'} -> ${isAllowedBool ? 'ON' : 'OFF'}`);
      }

      await prisma.adminPermission.upsert({
        where: {
          adminId_permissionKey: {
            adminId: id,
            permissionKey: key,
          },
        },
        update: { isAllowed: isAllowedBool },
        create: {
          adminId: id,
          permissionKey: key,
          isAllowed: isAllowedBool,
        },
      });

      // Also update legacy UserPermission for backward compatibility
      const [mod, act] = key.split('.');
      if (mod && act) {
        const fieldMap: Record<string, string> = {
          view: 'canView',
          create: 'canCreate',
          edit: 'canEdit',
          delete: 'canDelete',
          export: 'canExport',
          approve: 'canApprove',
        };
        const field = fieldMap[act];
        if (field) {
          const current = await prisma.userPermission.findUnique({
            where: { userId_module: { userId: id, module: mod } },
          });

          await prisma.userPermission.upsert({
            where: { userId_module: { userId: id, module: mod } },
            update: { [field]: isAllowedBool },
            create: {
              userId: id,
              module: mod,
              canView: act === 'view' ? isAllowedBool : current?.canView ?? false,
              canCreate: act === 'create' ? isAllowedBool : current?.canCreate ?? false,
              canEdit: act === 'edit' ? isAllowedBool : current?.canEdit ?? false,
              canDelete: act === 'delete' ? isAllowedBool : current?.canDelete ?? false,
              canExport: act === 'export' ? isAllowedBool : current?.canExport ?? false,
              canApprove: act === 'approve' ? isAllowedBool : current?.canApprove ?? false,
            },
          });
        }
      }
    }

    if (changesLogged.length > 0) {
      await recordActivityLog(
        superAdminId,
        'PERMISSIONS_TOGGLED',
        'permissions',
        id,
        'AdminPermission',
        null,
        { targetAdmin: targetUser?.email, changes: changesLogged },
        req
      );
    }

    res.json({ message: 'Permissions updated instantly across all client sessions', adminId: id });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update permission keys', error: error.message });
  }
};

export const copyAdminPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const { fromAdminId, toAdminId } = req.body;

    if (!fromAdminId || !toAdminId) {
      res.status(400).json({ message: 'Source (fromAdminId) and target (toAdminId) Admin IDs are required' });
      return;
    }

    const sourcePerms = await prisma.adminPermission.findMany({
      where: { adminId: fromAdminId },
    });

    for (const p of sourcePerms) {
      await prisma.adminPermission.upsert({
        where: {
          adminId_permissionKey: {
            adminId: toAdminId,
            permissionKey: p.permissionKey,
          },
        },
        update: { isAllowed: p.isAllowed },
        create: {
          adminId: toAdminId,
          permissionKey: p.permissionKey,
          isAllowed: p.isAllowed,
        },
      });
    }

    await recordActivityLog(superAdminId, 'PERMISSIONS_COPIED', 'permissions', toAdminId, 'AdminPermission', { fromAdminId }, { toAdminId }, req);

    res.json({ message: 'Permissions copied successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to copy permissions', error: error.message });
  }
};

export const getPermissionTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.permissionTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
};

export const createPermissionTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !permissions) {
      res.status(400).json({ message: 'Template name and permissions are required' });
      return;
    }

    const template = await prisma.permissionTemplate.upsert({
      where: { name },
      update: {
        description,
        permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions),
      },
      create: {
        name,
        description,
        permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions),
      },
    });

    res.status(201).json({ message: 'Permission template saved successfully', template });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save template', error: error.message });
  }
};

export const applyPermissionTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminId = (req as any).user?.id || 'super-admin-root';
    const id = getParam((req.params as any).id);
    const { templateId } = req.body;

    const template = await prisma.permissionTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    let allowedKeys: string[] = [];
    try {
      allowedKeys = JSON.parse(template.permissions);
    } catch (e) {
      allowedKeys = [];
    }

    const standardModules = ['users', 'admins', 'products', 'orders', 'payments', 'reports', 'settings', 'leads', 'deals', 'campaigns', 'units', 'meta', 'accounting', 'security'];
    const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

    for (const m of standardModules) {
      for (const a of actions) {
        const key = `${m}.${a}`;
        const isAllowed = allowedKeys.includes(key);

        await prisma.adminPermission.upsert({
          where: {
            adminId_permissionKey: {
              adminId: id,
              permissionKey: key,
            },
          },
          update: { isAllowed },
          create: {
            adminId: id,
            permissionKey: key,
            isAllowed,
          },
        });
      }
    }

    await recordActivityLog(superAdminId, 'TEMPLATE_APPLIED', 'permissions', id, 'PermissionTemplate', null, { templateName: template.name }, req);

    res.json({ message: `Permission template '${template.name}' applied successfully` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to apply template', error: error.message });
  }
};

export const getMyPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Super Admin gets ALL permissions unconditionally
    if (user.roleName === 'Super Admin') {
      const standardModules = ['users', 'admins', 'products', 'orders', 'payments', 'reports', 'settings', 'leads', 'deals', 'campaigns', 'units', 'meta', 'accounting', 'security'];
      const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve'];
      const all: string[] = [];
      for (const m of standardModules) {
        for (const a of actions) {
          all.push(`${m}.${a}`);
        }
      }
      res.json({ isSuperAdmin: true, permissions: all });
      return;
    }

    const dbPermissions = await prisma.adminPermission.findMany({
      where: { adminId: user.id, isAllowed: true },
      select: { permissionKey: true },
    });

    const allowedKeys = dbPermissions.map((p) => p.permissionKey);
    res.json({ isSuperAdmin: false, permissions: allowedKeys });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch my permissions', error: error.message });
  }
};

