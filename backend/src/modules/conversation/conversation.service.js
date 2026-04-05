import prisma from "../../prisma/prisma.js"

export const getUserConversations = async (userId) => {
    const conversations = await prisma.conversation.findMany({
        where: {
            users: {
                some: {
                    id: userId,
                },
            },
        },
        include: {
            users: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            messages: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 1, // ✅ CORRECT POSITION
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    });
    return conversations
}

export const createUserConversation = async (userId, userIds, isGroup = false) => {
    const allUsers = [...new Set([userId, ...userIds])];

    return await prisma.conversation.create({
        data: {
            isGroup,
            users: {
                connect: allUsers.map((id) => ({ id })),
            }
        },
        include: {
            users: true
        }
    })
}