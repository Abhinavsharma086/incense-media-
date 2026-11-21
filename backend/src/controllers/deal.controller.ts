import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getDeals = async (req: Request, res: Response): Promise<void> => {
    try {
        const deals = await prisma.deal.findMany({
            include: {
                lead: true,
                assignedTo: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(deals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createDeal = async (req: Request, res: Response): Promise<void> => {
    try {
        const deal = await prisma.deal.create({
            data: req.body,
            include: { lead: true }
        });
        res.status(201).json(deal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateDeal = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        const deal = await prisma.deal.update({
            where: { id },
            data: req.body,
            include: { lead: true }
        });
        res.json(deal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateDealStage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        const { stage } = req.body;
        const deal = await prisma.deal.update({
            where: { id },
            data: { stage },
            include: { lead: true }
        });

        // Log activity
        await prisma.dealActivity.create({
            data: {
                dealId: id,
                type: 'stage_change',
                description: `Moved deal to ${stage}`,
                userId: (req as any).user?.id
            }
        });

        res.json(deal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteDeal = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        await prisma.deal.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
