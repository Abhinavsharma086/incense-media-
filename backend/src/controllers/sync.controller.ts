import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Get the latest data version timestamps for all core CRM entities.
 * This provides an ultra-lightweight (1-2ms, ~150 bytes) polling target
 * that allows multiple browsers (Chrome, Firefox, Edge, etc.) to detect
 * changes in real-time without fetching large data payloads repeatedly.
 */
export const getSyncStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      latestLead,
      latestDeal,
      latestParty,
      latestUser,
      latestFollowUp,
      latestInquiry,
      latestCampaign,
    ] = await Promise.all([
      prisma.lead.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      prisma.deal.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      prisma.party.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      prisma.user.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      prisma.followUp.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      (prisma as any).inquiry?.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      prisma.mediaCampaign.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
    ]);

    const versions = {
      leads: latestLead?.updatedAt ? new Date(latestLead.updatedAt).getTime() : 0,
      deals: latestDeal?.updatedAt ? new Date(latestDeal.updatedAt).getTime() : 0,
      customers: latestParty?.updatedAt ? new Date(latestParty.updatedAt).getTime() : 0,
      users: latestUser?.updatedAt ? new Date(latestUser.updatedAt).getTime() : 0,
      employees: latestUser?.updatedAt ? new Date(latestUser.updatedAt).getTime() : 0,
      followups: latestFollowUp?.updatedAt ? new Date(latestFollowUp.updatedAt).getTime() : 0,
      inquiries: latestInquiry?.updatedAt ? new Date(latestInquiry.updatedAt).getTime() : 0,
      campaigns: latestCampaign?.updatedAt ? new Date(latestCampaign.updatedAt).getTime() : 0,
    };

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      versions,
    });
  } catch (error: any) {
    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      versions: {
        leads: Date.now(),
        deals: Date.now(),
        customers: Date.now(),
        users: Date.now(),
        employees: Date.now(),
        followups: Date.now(),
      },
    });
  }
};
