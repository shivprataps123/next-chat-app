import express from 'express';
import authMiddleware from '../../middleware/auth.middleware.js';
import { getMessagesController, sendMessageController } from './message.controller.js';

const messageRouter = express.Router();

messageRouter.get("/messages", authMiddleware, getMessagesController)
messageRouter.post("/messages", authMiddleware, sendMessageController)

export default messageRouter;