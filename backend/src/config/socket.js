import { Server } from "socket.io";
import AppError from "../utils/AppError.js";
import { markMessageAsSeen } from "../modules/message/message.service.js";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        console.log("🔥 User connected:", socket.id);

        const onlineUsers = new Map();

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
        });

        socket.on("send_message", (data) => {
            const { conversationId, receiverId } = data;

            // send to room
            io.to(conversationId).emit("receive_message", data);

            // 🔔 send notification separately
            const receiverSocket = onlineUsers.get(receiverId);

            if (receiverSocket) {
                io.to(receiverSocket).emit("new_notification", {
                    message: data.content,
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
                // ✅ update DB
                const updatedMessage = await markMessageAsSeen(messageId);

                // ✅ notify others
                io.emit("message_status_update", {
                    messageId,
                    status: "seen",
                });

            } catch (error) {
                console.error("Error updating message status:", error);
            }
        });

        // ✅ JOIN ROOM
        socket.on("join_conversation", (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${socket.id} joined room ${conversationId}`);
        });

        socket.on("typing", ({ conversationId, userName }) => {
            socket.to(conversationId).emit("user_typing", {
                userName,
            });
        });

        socket.on("stop_typing", (conversationId) => {
            socket.to(conversationId).emit("user_stop_typing");
        });

        socket.on("disconnect", () => {
            console.log("❌ User disconnected:", socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new AppError("Socket not initialized", 500);
    return io;
};