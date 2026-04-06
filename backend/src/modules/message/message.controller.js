import AppError from "../../utils/AppError.js";
import { getMessages, sendMessage } from "./message.service.js";

export const getMessagesController = async (req, res, next) => {
    try {
        const { conversationId } = req.query;

        const messages = await getMessages(conversationId, req.userId);

        res.status(200).json({
            success: true,
            message: "Messages retrieved successfully",
            data: messages,
        })
    } catch (error) {
        next(error);
    }
};

export const sendMessageController = async (req, res, next) => {
    try {
        const { conversationId, content } = req.body;

        // ✅ VALIDATION
        if (!conversationId) {
            throw new AppError("Conversation ID required", 400);
        }

        if (!content || content.trim() === "") {
            throw new AppError("Message cannot be empty", 400);
        }

        const message = await sendMessage(
            req.userId,
            conversationId,
            content
        );

        res.status(201).json({ success: true, message: "Message sent successfully", data: message });
    } catch (error) {
        next(error);
    }
};