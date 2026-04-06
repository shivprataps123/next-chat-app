import express from 'express';
import http from "http";
import dotenv from 'dotenv';
import cors from "cors"
import errorHandler from './middleware/error.middleware.js';
import authRouter from './modules/auth/auth.routes.js';
import conversationRouter from './modules/conversation/conversation.routes.js';
import messageRouter from './modules/message/message.route.js';
import userRouter from './modules/user/user.routes.js';
import { initSocket } from './config/socket.js';

dotenv.config();

const app = express();
const server = http.createServer(app)

initSocket(server)
app.use(cors())

app.use(express.json());

app.use("/api/auth", authRouter)
app.use("/api", conversationRouter)
app.use("/api", messageRouter)
app.use("/api", userRouter)

app.use(errorHandler);

export default app;