import express from 'express';
import authMiddleware from '../../middleware/auth.middleware.js';
import prisma from '../../prisma/prisma.js';

const userRouter = express.Router();

userRouter.get("/users", authMiddleware, async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                id: { not: req.userId }
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        });
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
});

export default userRouter;