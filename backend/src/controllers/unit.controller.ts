import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employees: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: { select: { name: true } } } },
          },
        },
        assignmentRules: true,
        _count: { select: { leads: true } },
      },
    });
    res.json(units);
  } catch (error: any) {
    console.error('Error fetching units:', error);
    res.status(500).json({ message: error?.message || 'Failed to fetch units' });
  }
};

export const getUnitById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: { select: { name: true } } } },
          },
        },
        assignmentRules: true,
        leads: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { owner: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }

    res.json(unit);
  } catch (error: any) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ message: error?.message || 'Failed to fetch unit' });
  }
};

export const createUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, ruleType, isSourceMatching, leadSourceFilter } = req.body;

    if (!name || String(name).trim() === '') {
      res.status(400).json({ message: 'Unit name is required' });
      return;
    }

    const unit = await prisma.unit.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        assignmentRules: {
          create: {
            ruleType: ruleType === 'workload' ? 'workload' : 'round_robin',
            isSourceMatching: Boolean(isSourceMatching),
            leadSourceFilter: leadSourceFilter ? String(leadSourceFilter).trim() : null,
            isActive: true,
          },
        },
      },
      include: {
        employees: true,
        assignmentRules: true,
      },
    });

    res.status(201).json(unit);
  } catch (error: any) {
    console.error('Error creating unit:', error);
    res.status(500).json({ message: error?.message || 'Failed to create unit' });
  }
};

export const updateUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    const { name, description } = req.body;

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name: name ? String(name).trim() : undefined,
        description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
      },
      include: { assignmentRules: true, employees: true },
    });

    res.json(unit);
  } catch (error: any) {
    console.error('Error updating unit:', error);
    res.status(500).json({ message: error?.message || 'Failed to update unit' });
  }
};

export const deleteUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any);
    await prisma.unit.delete({ where: { id } });
    res.json({ message: 'Unit deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ message: error?.message || 'Failed to delete unit' });
  }
};

export const addEmployeeToUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unitId } = (req.params as any);
    const { employeeId, maxCapacity, isActive } = req.body;

    if (!employeeId) {
      res.status(400).json({ message: 'Employee ID is required' });
      return;
    }

    const unitEmployee = await prisma.unitEmployee.upsert({
      where: {
        unitId_employeeId: {
          unitId,
          employeeId,
        },
      },
      update: {
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : 50,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      create: {
        unitId,
        employeeId,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : 50,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.status(200).json(unitEmployee);
  } catch (error: any) {
    console.error('Error adding employee to unit:', error);
    res.status(500).json({ message: error?.message || 'Failed to add employee to unit' });
  }
};

export const updateUnitEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any); // unitEmployeeId
    const { maxCapacity, isActive } = req.body;

    const updated = await prisma.unitEmployee.update({
      where: { id },
      data: {
        maxCapacity: maxCapacity !== undefined ? parseInt(maxCapacity) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating unit employee:', error);
    res.status(500).json({ message: error?.message || 'Failed to update unit employee' });
  }
};

export const removeEmployeeFromUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req.params as any); // unitEmployeeId
    await prisma.unitEmployee.delete({ where: { id } });
    res.json({ message: 'Employee removed from unit' });
  } catch (error: any) {
    console.error('Error removing employee from unit:', error);
    res.status(500).json({ message: error?.message || 'Failed to remove employee from unit' });
  }
};

export const setAssignmentRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unitId } = (req.params as any);
    const { ruleType, isSourceMatching, leadSourceFilter, isActive } = req.body;

    // Deactivate existing rules or update rule
    const existingRule = await prisma.assignmentRule.findFirst({ where: { unitId } });

    let rule;
    if (existingRule) {
      rule = await prisma.assignmentRule.update({
        where: { id: existingRule.id },
        data: {
          ruleType: ruleType ? (ruleType === 'workload' ? 'workload' : 'round_robin') : undefined,
          isSourceMatching: isSourceMatching !== undefined ? Boolean(isSourceMatching) : undefined,
          leadSourceFilter: leadSourceFilter !== undefined ? (leadSourceFilter ? String(leadSourceFilter).trim() : null) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });
    } else {
      rule = await prisma.assignmentRule.create({
        data: {
          unitId,
          ruleType: ruleType === 'workload' ? 'workload' : 'round_robin',
          isSourceMatching: Boolean(isSourceMatching),
          leadSourceFilter: leadSourceFilter ? String(leadSourceFilter).trim() : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    }

    res.json(rule);
  } catch (error: any) {
    console.error('Error setting assignment rule:', error);
    res.status(500).json({ message: error?.message || 'Failed to set assignment rule' });
  }
};

export const getEmployeesForAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    let employees = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    // Auto-seed default employees if DB User table is empty
    if (employees.length === 0) {
      console.log('[Auto-Seed] Empty User table detected. Seeding default employee accounts...');
      
      const bcrypt = await import('bcryptjs');
      const defaultPasswordHash = await bcrypt.hash('emp123', 10);

      const defaultRoles = [
        { name: 'Admin', description: 'Company Administrator' },
        { name: 'Sales Manager', description: 'Sales Manager' },
        { name: 'Sales Executive', description: 'Sales Executive' },
        { name: 'Telecaller', description: 'Telecaller' },
      ];

      const roleMap: Record<string, string> = {};
      for (const r of defaultRoles) {
        let roleObj = await prisma.role.findUnique({ where: { name: r.name } });
        if (!roleObj) {
          roleObj = await prisma.role.create({ data: r });
        }
        roleMap[r.name] = roleObj.id;
      }

      const defaultUsers = [
        { firstName: 'Robert', lastName: 'Vance', email: 'admin@incense.com', phone: '+1 (555) 234-5678', roleName: 'Admin' },
        { firstName: 'Alex', lastName: 'Mercer', email: 'alex@incense.com', phone: '+1 (555) 345-6789', roleName: 'Sales Executive' },
        { firstName: 'David', lastName: 'Miller', email: 'david@incense.com', phone: '+1 (555) 456-7890', roleName: 'Sales Executive' },
        { firstName: 'Sarah', lastName: 'Connor', email: 'sarah@incense.com', phone: '+1 (555) 567-8901', roleName: 'Telecaller' },
        { firstName: 'John', lastName: 'Doe', email: 'john@incense.com', phone: '+1 (555) 678-9012', roleName: 'Sales Manager' },
      ];

      for (const u of defaultUsers) {
        const roleId = roleMap[u.roleName] || roleMap['Admin'];
        await prisma.user.upsert({
          where: { email: u.email },
          update: { isActive: true },
          create: {
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phone: u.phone,
            password: defaultPasswordHash,
            roleId,
            isActive: true,
          },
        });
      }

      employees = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { firstName: 'asc' },
      });
    }

    res.json(employees);
  } catch (error: any) {
    console.error('Error fetching assignment employees:', error);
    res.status(500).json({ message: error?.message || 'Failed to fetch employees' });
  }
};

export const syncEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, firstName, lastName, email, phone, designation, status, password } = req.body;
    const emailVal = email ? String(email).trim().toLowerCase() : '';
    const phoneVal = phone ? String(phone).trim() : '';

    if (!emailVal && !phoneVal) {
      res.status(400).json({ message: 'Either Email or Mobile Number is required' });
      return;
    }

    const effectiveEmail = emailVal || `${phoneVal.replace(/\D/g, "") || Date.now()}@noemail.incense.com`;

    const fn = firstName || (name ? name.split(' ')[0] : 'Employee');
    const ln = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '');
    const roleName = designation || 'Sales Executive';

    let roleObj = await prisma.role.findUnique({ where: { name: roleName } });
    if (!roleObj) {
      roleObj = await prisma.role.create({
        data: { name: roleName, description: 'Auto-created role' },
      });
    }

    const bcrypt = await import('bcryptjs');
    const defaultPasswordHash = await bcrypt.hash('Incense@123', 10);
    let hashedPassword: string | undefined = undefined;
    if (password && typeof password === 'string' && password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    // Lookup existing user by ID, Email, or Phone
    let existingUser = null;
    if (id && !id.startsWith('emp-')) {
      existingUser = await prisma.user.findUnique({ where: { id } });
    }
    if (!existingUser && effectiveEmail) {
      existingUser = await prisma.user.findUnique({ where: { email: effectiveEmail } });
    }
    if (!existingUser && phoneVal) {
      const cleanDigits = phoneVal.replace(/\\D/g, '');
      if (cleanDigits.length >= 10) {
        existingUser = await prisma.user.findFirst({
          where: { phone: { contains: cleanDigits.slice(-10) } }
        });
      }
    }

    let user;
    if (existingUser) {
      const updateData: any = {
        firstName: fn,
        lastName: ln,
        phone: phoneVal || null,
        roleId: roleObj.id,
        isActive: status !== 'inactive',
      };
      if (effectiveEmail && effectiveEmail !== existingUser.email) {
        updateData.email = effectiveEmail;
      }
      if (hashedPassword) {
        updateData.password = hashedPassword;
      }
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: { select: { id: true, name: true } },
        },
      });

      if (hashedPassword) {
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE `Users` SET `password` = ?, `updatedAt` = NOW() WHERE `id` = ? OR `email` = ?',
            hashedPassword,
            existingUser.id,
            effectiveEmail
          );
        } catch (_) {}
      }
    } else {
      user = await prisma.user.create({
        data: {
          id: id && !id.startsWith('emp-') ? id : undefined,
          firstName: fn,
          lastName: ln,
          email: effectiveEmail,
          phone: phoneVal || null,
          password: hashedPassword || defaultPasswordHash,
          roleId: roleObj.id,
          isActive: status !== 'inactive',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: { select: { id: true, name: true } },
        },
      });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Error syncing employee:', error);
    res.status(500).json({ message: error?.message || 'Failed to sync employee' });
  }
};

export const resetEmployeePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id || "");
    const { password, email, phone } = req.body;
    if (!password || String(password).trim().length < 4) {
      res.status(400).json({ message: 'Password must be at least 4 characters long' });
      return;
    }

    const cleanPass = String(password).trim();
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(cleanPass, 10);

    let user = null;
    if (id && !id.startsWith('emp-')) {
      user = await prisma.user.findUnique({ where: { id } });
    }
    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    }
    if (!user && phone) {
      const cleanDigits = String(phone).replace(/\\D/g, '');
      if (cleanDigits.length >= 10) {
        user = await prisma.user.findFirst({
          where: { phone: { contains: cleanDigits.slice(-10) } }
        });
      }
    }

    if (!user) {
      res.status(404).json({ message: 'Employee user account not found' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    try {
      await prisma.$executeRawUnsafe(
        'UPDATE `Users` SET `password` = ?, `updatedAt` = NOW() WHERE `id` = ? OR `email` = ?',
        hashedPassword,
        user.id,
        user.email
      );
    } catch (_) {}

    res.json({
      success: true,
      message: `Password changed successfully for ${user.firstName} ${user.lastName || ''}`.trim()
    });
  } catch (error: any) {
    console.error('Error in resetEmployeePassword:', error);
    res.status(500).json({ message: 'Failed to reset employee password', error: error.message });
  }
};


export const syncEmployeeBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employees } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      const current = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { firstName: 'asc' },
      });
      res.json(current);
      return;
    }

    const bcrypt = await import('bcryptjs');
    const defaultPasswordHash = await bcrypt.hash('emp123', 10);

    for (const emp of employees) {
      const emailVal = emp.email ? String(emp.email).trim().toLowerCase() : '';
      const phoneVal = emp.phone ? String(emp.phone).trim() : '';
      if (!emailVal && !phoneVal) continue;

      const effectiveEmail = emailVal || `${phoneVal.replace(/\D/g, '') || emp.id || Date.now()}@incense.com`;
      const fn = emp.firstName || (emp.name ? emp.name.split(' ')[0] : 'Employee');
      const ln = emp.lastName || (emp.name && emp.name.split(' ').length > 1 ? emp.name.split(' ').slice(1).join(' ') : '');
      const roleName = emp.designation || 'Sales Executive';

      let roleObj = await prisma.role.findUnique({ where: { name: roleName } });
      if (!roleObj) {
        roleObj = await prisma.role.create({
          data: { name: roleName, description: 'Auto-created role' },
        });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: effectiveEmail },
            phoneVal ? { phone: phoneVal } : { email: effectiveEmail },
          ],
        },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: fn,
            lastName: ln,
            phone: phoneVal || existingUser.phone,
            roleId: roleObj.id,
            isActive: emp.status !== 'inactive',
          },
        });
      } else {
        await prisma.user.create({
          data: {
            firstName: fn,
            lastName: ln,
            email: effectiveEmail,
            phone: phoneVal || null,
            password: defaultPasswordHash,
            roleId: roleObj.id,
            isActive: emp.status !== 'inactive',
          },
        });
      }
    }

    const allActive = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    res.json(allActive);
  } catch (error: any) {
    console.error('Error in syncEmployeeBatch:', error);
    res.status(500).json({ message: error?.message || 'Failed to sync employees' });
  }
};


