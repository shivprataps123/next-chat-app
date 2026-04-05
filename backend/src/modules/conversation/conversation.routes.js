import express from 'express';
import { createConversation, getConversations } from './conversation.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const conversationRouter = express.Router();

conversationRouter.get("/conversations", authMiddleware, getConversations)
conversationRouter.post("/conversations", authMiddleware, createConversation)
export default conversationRouter;