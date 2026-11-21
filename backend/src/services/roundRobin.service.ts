import prisma from '../utils/prisma';

/**
 * Round-Robin Auto-Assigner for incoming Meta Leads
 * Finds active users with Sales role and assigns leads sequentially.
 */
export const getNextRoundRobinUser = async (): Promise<string | null> => {
  try {
    // 1. Get all active sales users
    const salesUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: {
            in: ['Sales Manager', 'Sales Executive', 'Admin'],
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (salesUsers.length === 0) return null;

    // 2. Find the last assigned lead
    const lastAssignedLead = await prisma.lead.findFirst({
      where: { ownerId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { ownerId: true },
    });

    if (!lastAssignedLead || !lastAssignedLead.ownerId) {
      return salesUsers[0].id;
    }

    // 3. Determine next user index
    const lastUserIndex = salesUsers.findIndex((u) => u.id === lastAssignedLead.ownerId);
    const nextUserIndex = (lastUserIndex + 1) % salesUsers.length;

    return salesUsers[nextUserIndex].id;
  } catch (error) {
    console.error('Round Robin calculation failed:', error);
    return null;
  }
};
