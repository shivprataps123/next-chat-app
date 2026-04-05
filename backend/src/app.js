import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"
import errorHandler from './middleware/error.middleware.js';
import authRouter from './modules/auth/auth.routes.js';
import conversationRouter from './modules/conversation/conversation.routes.js';

dotenv.config();

const app = express();

app.use(cors())

app.use(express.json());

app.use("/api/auth", authRouter)
app.use("/api", conversationRouter)

app.use(errorHandler);

export default app;