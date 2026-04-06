"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import { io, Socket } from "socket.io-client";

interface User {
    id: string;
    name: string;
    email: string;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    conversationId?: string;
    sender: {
        id: string;
        name: string;
    };
    status?: string;
}

interface Conversation {
    id: string;
    updatedAt: string;
    users: User[];
    lastMessage?: string;
    isGroup?: boolean;
    name?: string;
}

const API_URL = "http://localhost:3001/api";
const SOCKET_URL = "http://localhost:3001";

export default function ChatPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState("");
    const [isGroup, setIsGroup] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const router = useRouter();

    useEffect(() => {
        const user = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!user || !token) {
            router.push("/auth");
            return;
        }

        const userData = JSON.parse(user);
        setCurrentUser(userData);
        initSocket(userData.id);
        fetchConversations();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [router]);

    useEffect(() => {
        if (selectedConversation && socketRef.current) {
            socketRef.current.emit("join_conversation", selectedConversation.id);
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const initSocket = (userId: string) => {
        const socket = io(SOCKET_URL, {
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("user_connected", userId);
        });

        socket.on("online_users", (users: string[]) => {
            setOnlineUsers(users);
        });

        socket.on("receive_message", (message: Message) => {
            if (selectedConversation?.id === message.conversationId) {
                setMessages((prev) => {
                    if (prev.find(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
                
                socket.emit("message_seen", { messageId: message.id });
            }
            
            setConversations(prev => {
                const updated = prev.map(conv => {
                    if (conv.id === message.conversationId) {
                        return { ...conv, updatedAt: message.createdAt };
                    }
                    return conv;
                });
                return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            });
        });

        socket.on("message_status_update", ({ messageId, status }: { messageId: string; status: string }) => {
            setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, status } : msg
            ));
        });

        socket.on("user_typing", ({ userName }: { userName: string }) => {
            setTypingUser(userName);
        });

        socket.on("user_stop_typing", () => {
            setTypingUser(null);
        });

        socket.on("new_notification", ({ message }: { message: string }) => {
            if (Notification.permission === "granted") {
                new Notification("New message", { body: message });
            }
        });

        socketRef.current = socket;
    };

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API_URL}/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data.success && response.data.data.length > 0) {
                setConversations(response.data.data);
                setSelectedConversation(response.data.data[0]);
            } else {
                setConversations([]);
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(
                `${API_URL}/messages?conversationId=${conversationId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                setMessages(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            setMessages([]);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data.success) {
                setAllUsers(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const openNewChatModal = async () => {
        setSelectedUsers([]);
        setGroupName("");
        setIsGroup(false);
        await fetchAllUsers();
        setShowNewChatModal(true);
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const createConversation = async () => {
        if (selectedUsers.length === 0) return;

        try {
            const token = localStorage.getItem("token");
            
            const payload = isGroup 
                ? { userIds: selectedUsers, isGroup: true, name: groupName }
                : { userIds: selectedUsers, isGroup: false };

            const response = await axios.post(
                `${API_URL}/conversations`,
                payload,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                setShowNewChatModal(false);
                await fetchConversations();
                const newConv = response.data.data;
                setSelectedConversation(newConv);
                
                if (socketRef.current) {
                    socketRef.current.emit("join_conversation", newConv.id);
                }
            }
        } catch (error) {
            console.error("Error creating conversation:", error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;

        setSending(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_URL}/messages`,
                {
                    conversationId: selectedConversation.id,
                    content: newMessage,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                const message = response.data.data;
                setMessages((prev) => [...prev, message]);
                setNewMessage("");
                
                if (socketRef.current) {
                    socketRef.current.emit("send_message", {
                        conversationId: selectedConversation.id,
                        content: message.content,
                        senderId: currentUser?.id,
                        receiverId: getOtherUser(selectedConversation)?.id,
                    });
                    socketRef.current.emit("stop_typing", selectedConversation.id);
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
            setIsTyping(false);
        }
    };

    const handleTyping = () => {
        if (!selectedConversation || !socketRef.current) return;

        if (!isTyping) {
            setIsTyping(true);
            socketRef.current.emit("typing", {
                conversationId: selectedConversation.id,
                userName: currentUser?.name,
            });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socketRef.current?.emit("stop_typing", selectedConversation.id);
        }, 2000);
    };

    const getOtherUser = (conversation: Conversation) => {
        return conversation.users.find(
            (u) => u.id !== currentUser?.id
        ) || conversation.users[0];
    };

    const getConversationName = (conversation: Conversation) => {
        if (conversation.isGroup && conversation.name) {
            return conversation.name;
        }
        return getOtherUser(conversation)?.name || "Unknown";
    };

    const isUserOnline = (userId: string) => onlineUsers.includes(userId);

    const filteredConversations = conversations.filter((conv) => {
        const name = getConversationName(conv);
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const diffDays = Math.floor(
            (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="chat-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="chat-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo-section">
                        <Image src="/logo.svg" alt="Talksy" width={40} height={40} />
                        <span className="logo-text">Talksy</span>
                    </div>
                    <button
                        className="logout-btn"
                        onClick={() => {
                            localStorage.clear();
                            router.push("/auth");
                        }}
                        title="Logout"
                    >
                        ⏻
                    </button>
                </div>

                <button className="new-chat-btn" onClick={openNewChatModal}>
                    <span>+</span> New Chat
                </button>

                <div className="search-section">
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                <div className="conversations-list">
                    {filteredConversations.length === 0 ? (
                        <div className="empty-state">
                            <p>No conversations yet</p>
                            <p className="empty-hint">Start a new chat to begin</p>
                        </div>
                    ) : (
                        filteredConversations.map((conversation) => {
                            const name = getConversationName(conversation);
                            const isSelected = selectedConversation?.id === conversation.id;
                            return (
                                <div
                                    key={conversation.id}
                                    className={`conversation-item ${isSelected ? "selected" : ""}`}
                                    onClick={() => setSelectedConversation(conversation)}
                                >
                                    <div className="avatar">
                                        {conversation.isGroup ? "G" : name?.charAt(0).toUpperCase()}
                                        {!conversation.isGroup && isUserOnline(getOtherUser(conversation)?.id || "") && (
                                            <span className="online-dot"></span>
                                        )}
                                    </div>
                                    <div className="conversation-info">
                                        <div className="conversation-name">{name}</div>
                                        <div className="conversation-preview">
                                            {conversation.isGroup && <span className="group-badge">Group</span>}
                                            {conversation.lastMessage || "No messages yet"}
                                        </div>
                                    </div>
                                    <div className="conversation-time">
                                        {formatDate(conversation.updatedAt)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            <main className="chat-main">
                {selectedConversation ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-user">
                                <div className="avatar">
                                    {selectedConversation.isGroup 
                                        ? "G" 
                                        : getOtherUser(selectedConversation)?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="header-user-info">
                                    <h2>{getConversationName(selectedConversation)}</h2>
                                    <span className="status">
                                        {selectedConversation.isGroup 
                                            ? `${selectedConversation.users.length} members`
                                            : isUserOnline(getOtherUser(selectedConversation)?.id || "") 
                                                ? "Online" 
                                                : "Offline"}
                                    </span>
                                </div>
                            </div>
                            <div className="chat-header-actions">
                                <button className="header-btn">📞</button>
                                <button className="header-btn">🎥</button>
                                <button className="header-btn">⋮</button>
                            </div>
                        </div>

                        <div className="messages-container">
                            {messages.length === 0 ? (
                                <div className="no-messages">
                                    <div className="no-messages-icon">💬</div>
                                    <p>No messages yet</p>
                                    <p className="no-messages-hint">Send a message to start the conversation</p>
                                </div>
                            ) : (
                                messages.map((message, index) => {
                                    const isOwn = message.senderId === currentUser?.id;
                                    const showDate =
                                        index === 0 ||
                                        new Date(message.createdAt).toDateString() !==
                                            new Date(messages[index - 1].createdAt).toDateString();
                                    return (
                                        <div key={message.id}>
                                            {showDate && (
                                                <div className="date-divider">
                                                    <span>{formatDate(message.createdAt)}</span>
                                                </div>
                                            )}
                                            <div className={`message ${isOwn ? "own" : "other"}`}>
                                                {selectedConversation.isGroup && !isOwn && (
                                                    <div className="message-sender">{message.sender.name}</div>
                                                )}
                                                <div className="message-content">{message.content}</div>
                                                <div className="message-meta">
                                                    <div className="message-time">{formatTime(message.createdAt)}</div>
                                                    {isOwn && message.status && (
                                                        <span className="message-status">
                                                            {message.status === "seen" ? "✓✓" : message.status === "delivered" ? "✓✓" : "✓"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {typingUser && (
                                <div className="typing-indicator">
                                    <span>{typingUser} is typing...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="message-input-area" onSubmit={sendMessage}>
                            <button type="button" className="attach-btn">📎</button>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    handleTyping();
                                }}
                                className="message-input"
                            />
                            <button
                                type="submit"
                                className="send-btn"
                                disabled={!newMessage.trim() || sending}
                            >
                                {sending ? "..." : "➤"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <Image src="/logo.svg" alt="Talksy" width={80} height={80} />
                        <h2>Welcome to Talksy</h2>
                        <p>Select a conversation or start a new chat</p>
                    </div>
                )}
            </main>

            {showNewChatModal && (
                <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>New {isGroup ? "Group" : "Chat"}</h2>
                            <button className="close-btn" onClick={() => setShowNewChatModal(false)}>×</button>
                        </div>

                        <div className="chat-type-toggle">
                            <button 
                                className={`toggle-btn ${!isGroup ? "active" : ""}`}
                                onClick={() => setIsGroup(false)}
                            >
                                Single User
                            </button>
                            <button 
                                className={`toggle-btn ${isGroup ? "active" : ""}`}
                                onClick={() => setIsGroup(true)}
                            >
                                Group
                            </button>
                        </div>

                        {isGroup && (
                            <div className="form-group">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter group name..."
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="users-list">
                            <h3>Select {isGroup ? "participants" : "user"}</h3>
                            {allUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className={`user-item ${selectedUsers.includes(user.id) ? "selected" : ""}`}
                                    onClick={() => toggleUserSelection(user.id)}
                                >
                                    <div className="avatar small">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="user-info">
                                        <div className="user-name">{user.name}</div>
                                        <div className="user-email">{user.email}</div>
                                    </div>
                                    <div className="checkbox">
                                        {selectedUsers.includes(user.id) ? "✓" : ""}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            className="create-btn"
                            onClick={createConversation}
                            disabled={selectedUsers.length === 0 || (isGroup && !groupName.trim())}
                        >
                            Create {isGroup ? "Group" : "Chat"}
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .chat-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #f5f5f5;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e5e7eb;
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .chat-layout {
                    display: flex;
                    height: 100vh;
                    background: #f5f5f5;
                }

                .sidebar {
                    width: 320px;
                    background: white;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid #e5e7eb;
                }

                .sidebar-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .logo-text {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #6366f1;
                }

                .logout-btn {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: background 0.2s;
                }

                .logout-btn:hover {
                    background: #f3f4f6;
                }

                .new-chat-btn {
                    margin: 1rem;
                    padding: 0.75rem 1rem;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.95rem;
                }

                .new-chat-btn:hover {
                    opacity: 0.9;
                }

                .new-chat-btn span {
                    font-size: 1.25rem;
                }

                .search-section {
                    padding: 0 1rem 1rem;
                }

                .search-input-wrapper {
                    display: flex;
                    align-items: center;
                    background: #f3f4f6;
                    border-radius: 12px;
                    padding: 0 1rem;
                }

                .search-icon {
                    font-size: 1rem;
                }

                .search-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    padding: 0.75rem;
                    outline: none;
                    font-size: 0.9rem;
                }

                .conversations-list {
                    flex: 1;
                    overflow-y: auto;
                }

                .conversation-item {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    cursor: pointer;
                    transition: background 0.2s;
                    gap: 0.75rem;
                }

                .conversation-item:hover {
                    background: #f9fafb;
                }

                .conversation-item.selected {
                    background: #eef2ff;
                }

                .avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 1.1rem;
                    flex-shrink: 0;
                    position: relative;
                }

                .avatar.small {
                    width: 36px;
                    height: 36px;
                    font-size: 0.9rem;
                }

                .online-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 12px;
                    height: 12px;
                    background: #10b981;
                    border-radius: 50%;
                    border: 2px solid white;
                }

                .conversation-info {
                    flex: 1;
                    min-width: 0;
                }

                .conversation-name {
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 0.25rem;
                }

                .conversation-preview {
                    font-size: 0.85rem;
                    color: #6b7280;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .group-badge {
                    background: #6366f1;
                    color: white;
                    font-size: 0.65rem;
                    padding: 0.15rem 0.4rem;
                    border-radius: 8px;
                }

                .conversation-time {
                    font-size: 0.75rem;
                    color: #9ca3af;
                }

                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: #6b7280;
                }

                .empty-hint {
                    font-size: 0.85rem;
                    color: #9ca3af;
                }

                .chat-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: #fafafa;
                }

                .chat-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.5rem;
                    background: white;
                    border-bottom: 1px solid #e5e7eb;
                }

                .chat-header-user {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .header-user-info h2 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0;
                }

                .status {
                    font-size: 0.8rem;
                    color: #10b981;
                }

                .chat-header-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .header-btn {
                    background: none;
                    border: none;
                    font-size: 1.1rem;
                    padding: 0.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .header-btn:hover {
                    background: #f3f4f6;
                }

                .messages-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                }

                .no-messages {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #6b7280;
                }

                .no-messages-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }

                .no-messages-hint {
                    font-size: 0.85rem;
                    color: #9ca3af;
                }

                .date-divider {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 1rem 0;
                }

                .date-divider span {
                    background: #e5e7eb;
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                .message {
                    max-width: 70%;
                    margin-bottom: 0.5rem;
                    animation: slideIn 0.2s ease-out;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .message.other {
                    align-self: flex-start;
                }

                .message.own {
                    align-self: flex-end;
                }

                .message-content {
                    padding: 0.75rem 1rem;
                    border-radius: 18px;
                    line-height: 1.4;
                }

                .message-sender {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-bottom: 0.25rem;
                }

                .message.other .message-content {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-bottom-left-radius: 4px;
                }

                .message.own .message-content {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border-bottom-right-radius: 4px;
                }

                .message-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    margin-top: 0.25rem;
                }

                .message-time {
                    font-size: 0.7rem;
                    color: #9ca3af;
                }

                .message.own .message-meta {
                    justify-content: flex-end;
                }

                .message-status {
                    font-size: 0.7rem;
                    color: #9ca3af;
                }

                .typing-indicator {
                    padding: 0.5rem 1rem;
                    font-size: 0.85rem;
                    color: #6b7280;
                    font-style: italic;
                }

                .message-input-area {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: white;
                    border-top: 1px solid #e5e7eb;
                }

                .attach-btn, .send-btn {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    padding: 0.5rem;
                    cursor: pointer;
                    border-radius: 50%;
                    transition: background 0.2s;
                }

                .attach-btn:hover, .send-btn:hover {
                    background: #f3f4f6;
                }

                .send-btn {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .message-input {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 24px;
                    outline: none;
                    font-size: 0.95rem;
                }

                .message-input:focus {
                    border-color: #6366f1;
                }

                .no-chat-selected {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #6b7280;
                }

                .no-chat-selected h2 {
                    margin: 1rem 0 0.5rem;
                    color: #1f2937;
                }

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }

                .modal {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 450px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                }

                .chat-type-toggle {
                    display: flex;
                    padding: 1rem 1.5rem;
                    gap: 1rem;
                }

                .toggle-btn {
                    flex: 1;
                    padding: 0.75rem;
                    border: 2px solid #e5e7eb;
                    background: white;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .toggle-btn.active {
                    border-color: #6366f1;
                    background: #eef2ff;
                    color: #6366f1;
                }

                .form-group {
                    padding: 0 1.5rem 1rem;
                }

                .form-group label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }

                .form-group input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    outline: none;
                }

                .form-group input:focus {
                    border-color: #6366f1;
                }

                .users-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 1.5rem;
                }

                .users-list h3 {
                    font-size: 0.9rem;
                    color: #6b7280;
                    margin: 0 0 0.75rem;
                }

                .user-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: background 0.2s;
                    margin-bottom: 0.5rem;
                }

                .user-item:hover {
                    background: #f3f4f6;
                }

                .user-item.selected {
                    background: #eef2ff;
                }

                .user-info {
                    flex: 1;
                }

                .user-name {
                    font-weight: 600;
                    font-size: 0.95rem;
                }

                .user-email {
                    font-size: 0.8rem;
                    color: #6b7280;
                }

                .checkbox {
                    width: 24px;
                    height: 24px;
                    border: 2px solid #e5e7eb;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    color: #6366f1;
                }

                .user-item.selected .checkbox {
                    background: #6366f1;
                    border-color: #6366f1;
                    color: white;
                }

                .create-btn {
                    margin: 1rem 1.5rem 1.5rem;
                    padding: 1rem;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .create-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .sidebar {
                        width: 80px;
                    }

                    .logo-text, .search-section, .conversation-info, .conversation-time, .new-chat-btn span {
                        display: none;
                    }

                    .new-chat-btn {
                        justify-content: center;
                    }

                    .conversation-item {
                        justify-content: center;
                        padding: 1rem 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
}