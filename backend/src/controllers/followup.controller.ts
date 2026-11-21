import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getFollowUps = async (req: Request, res: Response): Promise<void> => {
    try {
        const followUps = await prisma.followUp.findMany({
            include: { lead: true },
            orderBy: { scheduledAt: 'asc' }
        });
        res.json(followUps);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createFollowUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const followUp = await prisma.followUp.create({
            data: req.body,
            include: { lead: true }
        });
        res.status(201).json(followUp);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateFollowUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        const followUp = await prisma.followUp.update({
            where: { id },
            data: req.body,
            include: { lead: true }
        });
        res.json(followUp);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteFollowUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req.params as any);
        await prisma.followUp.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
