import { Server } from "socket.io";
import AppError from "../utils/AppError.js";
import { markMessageAsSeen } from "../modules/message/message.service.js";

let io;
const onlineUsers = new Map();

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {

        socket.on("user_connected", (userId) => {
            onlineUsers.set(userId, socket.id);
            io.emit("online_users", Array.from(onlineUsers.keys()));
        });

        socket.on("disconnect", () => {
            for (let [userId, sockId] of onlineUsers) {
                if (sockId === socket.id) {
                    onlineUsers.delete(userId);
                    break;
                }
            }
            io.emit("online_users", Array.from(onlineUsers.keys()));
        });

        socket.on("send_message", (data) => {
            const { conversationId, receiverId, senderId, message } = data;

            if (message) {
                io.to(conversationId).emit("receive_message", message);
            }

            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receive_message", message);

                io.to(receiverSocketId).emit("new_notification", {
                    message: message?.content,
                });
            }
        });

        socket.on("message_delivered", ({ messageId }) => {
            io.emit("message_status_update", {
                messageId,
                status: "delivered",
            });
        });

        socket.on("message_seen", async ({ messageId }) => {
            try {
                await markMessageAsSeen(messageId);
                io.emit("message_status_update", {
                    messageId,
                    status: "seen",
                });
            } catch (error) {
            }
        });

        socket.on("join_conversation", (conversationId) => {
            socket.join(conversationId);
        });

        socket.on("typing", ({ conversationId, userName }) => {
            socket.to(conversationId).emit("user_typing", { userName });
        });

        socket.on("stop_typing", (conversationId) => {
            socket.to(conversationId).emit("user_stop_typing");
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new AppError("Socket not initialized", 500);
    return io;
};