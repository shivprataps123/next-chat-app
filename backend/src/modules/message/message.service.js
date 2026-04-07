import { getIO } from "../../config/socket.js";
import prisma from "../../prisma/prisma.js";
import AppError from "../../utils/AppError.js";

export const getMessages = async (conversationId, userId) => {
    // Check access
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            users: {
                some: { id: userId },
            },
        },
    });

    if (!conversation) {
        throw new AppError("Unauthorized", 401);
    }

    return await prisma.message.findMany({
        where: { conversationId },
        include: {
            sender: {
                select: { id: true, name: true },
            },
        },
        orderBy: { createdAt: "asc" },
    });
};

export const sendMessage = async (userId, conversationId, content) => {
    // Check access
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            users: {
                some: { id: userId },
            },
        },
    });

    if (!conversation) {
        throw new Error("Unauthorized");
    }

    const message = await prisma.message.create({
        data: {
            content,
            senderId: userId,
            conversationId,
        },
        include: {
            sender: {
                select: { id: true, name: true },
            },
        },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
    });

    //Emit socket event
    const io = getIO();


    // Broadcast to all connected clients, frontend will filter
    io.emit("receive_message", message);

    return message;
};

export const markMessageAsSeen = async (messageId) => {
    return await prisma.message.update({
        where: { id: messageId },
        data: { status: "seen" },
    });
};