import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCampaigns = async (req: Request, res: Response): Promise<void> => {
    try {
        const { platform, status } = req.query;
        const where: any = {};
        
        if (platform) where.platform = platform;
        if (status) where.status = status;

        const campaigns = await prisma.mediaCampaign.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                assignedTo: {
                    select: { firstName: true, lastName: true }
                }
            }
        });
        res.json(campaigns);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        const campaign = await prisma.mediaCampaign.findUnique({
            where: { id },
            include: {
                assignedTo: {
                    select: { firstName: true, lastName: true }
                }
            }
        });
        if (!campaign) {
            res.status(404).json({ message: 'Campaign not found' });
            return;
        }
        res.json(campaign);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
        const campaign = await prisma.mediaCampaign.create({
            data: {
                ...req.body,
                startDate: new Date(req.body.startDate),
                endDate: req.body.endDate ? new Date(req.body.endDate) : null,
                budget: parseFloat(req.body.budget),
                adSpend: parseFloat(req.body.adSpend || 0),
                impressions: parseInt(req.body.impressions || 0),
                reach: parseInt(req.body.reach || 0),
                clicks: parseInt(req.body.clicks || 0),
                leadsGenerated: parseInt(req.body.leadsGenerated || 0),
                qualifiedLeads: parseInt(req.body.qualifiedLeads || 0),
                conversions: parseInt(req.body.conversions || 0),
                revenue: parseFloat(req.body.revenue || 0),
            }
        });
        res.status(201).json(campaign);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        
        const dataToUpdate = { ...req.body };
        if (req.body.startDate) dataToUpdate.startDate = new Date(req.body.startDate);
        if (req.body.endDate) dataToUpdate.endDate = new Date(req.body.endDate);
        if (req.body.budget !== undefined) dataToUpdate.budget = parseFloat(req.body.budget);
        if (req.body.adSpend !== undefined) dataToUpdate.adSpend = parseFloat(req.body.adSpend);
        if (req.body.impressions !== undefined) dataToUpdate.impressions = parseInt(req.body.impressions);
        if (req.body.reach !== undefined) dataToUpdate.reach = parseInt(req.body.reach);
        if (req.body.clicks !== undefined) dataToUpdate.clicks = parseInt(req.body.clicks);
        if (req.body.leadsGenerated !== undefined) dataToUpdate.leadsGenerated = parseInt(req.body.leadsGenerated);
        if (req.body.qualifiedLeads !== undefined) dataToUpdate.qualifiedLeads = parseInt(req.body.qualifiedLeads);
        if (req.body.conversions !== undefined) dataToUpdate.conversions = parseInt(req.body.conversions);
        if (req.body.revenue !== undefined) dataToUpdate.revenue = parseFloat(req.body.revenue);

        const campaign = await prisma.mediaCampaign.update({
            where: { id },
            data: dataToUpdate
        });
        res.json(campaign);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        await prisma.mediaCampaign.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCampaignDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const campaigns = await prisma.mediaCampaign.findMany();
        
        const totalAdSpend = campaigns.reduce((sum, c) => sum + c.adSpend, 0);
        const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
        const totalLeads = campaigns.reduce((sum, c) => sum + c.leadsGenerated, 0);
        const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
        const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
        
        // Distribution by platform
        const platformData = campaigns.reduce((acc: any, c) => {
            if (!acc[c.platform]) {
                acc[c.platform] = { spend: 0, revenue: 0, leads: 0 };
            }
            acc[c.platform].spend += c.adSpend;
            acc[c.platform].revenue += c.revenue;
            acc[c.platform].leads += c.leadsGenerated;
            return acc;
        }, {});

        res.json({
            summary: {
                totalAdSpend,
                totalRevenue,
                totalLeads,
                totalConversions,
                totalImpressions,
                globalROI: totalAdSpend > 0 ? ((totalRevenue - totalAdSpend) / totalAdSpend) * 100 : 0,
                avgCPL: totalLeads > 0 ? totalAdSpend / totalLeads : 0,
            },
            platformDistribution: Object.entries(platformData).map(([name, data]: [string, any]) => ({
                name,
                ...data
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
