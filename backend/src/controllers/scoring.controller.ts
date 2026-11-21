import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getRules = async (req: Request, res: Response): Promise<void> => {
    try {
        const rules = await prisma.leadScoreRule.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(rules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createRule = async (req: Request, res: Response): Promise<void> => {
    try {
        const rule = await prisma.leadScoreRule.create({
            data: req.body
        });
        res.status(201).json(rule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateRule = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        const rule = await prisma.leadScoreRule.update({
            where: { id },
            data: req.body
        });
        res.json(rule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteRule = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        await prisma.leadScoreRule.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const recalculateLeadScore = async (leadId: string): Promise<void> => {
    try {
        const rules = await prisma.leadScoreRule.findMany({ where: { isActive: true } });
        const activities = await prisma.leadActivity.findMany({ where: { leadId } });

        let score = 0;
        activities.forEach(activity => {
            const rule = rules.find(r => r.action === activity.type);
            if (rule) {
                score += rule.points;
            }
        });

        // Ensure score doesn't drop below 0 or exceed 100 for display mapping
        score = Math.max(0, Math.min(100, score));

        await prisma.lead.update({
            where: { id: leadId },
            data: { leadScore: score }
        });
    } catch (error) {
        console.error("Failed to recalculate lead score", error);
    }
};
