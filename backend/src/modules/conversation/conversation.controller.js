import { createUserConversation, getUserConversations } from "./conversation.service.js"

export const getConversations = async (req, res, next) => {
    try {
        const conversations = await getUserConversations(req.userId)
        res.status(200).json({
            success: true,
            message: "Conversations retrieved successfully",
            data: conversations
        })
    } catch (err) {
        next(err)
    }
}

export const createConversation = async (req, res, next) => {
    try {
        const { userIds, isGroup } = req.body

        const conversation = await createUserConversation(req.userId, userIds, isGroup)
        res.status(201).json({
            success: true,
            message: "Conversation created successfully",
            data: conversation
        })

    } catch (err) {
        next(err)
    }
}