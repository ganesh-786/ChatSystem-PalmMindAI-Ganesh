import { useEffect, useRef, useState } from "react";
import api, { updateMessage, deleteMessage } from "../services/api.js";
import { createSocket, disconnectSocket } from "../services/socket.js";

const DEFAULT_ROOM = "general";

export default function ChatApp({ user, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(DEFAULT_ROOM);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [roomName, setRoomName] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [error, setError] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentRoomRef = useRef(activeRoom);

  useEffect(() => {
    currentRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const client = createSocket(token);
    setSocket(client);

    client.on("connect", () => {
      setConnected(true);
      setStatus("Connected to chat");
    });

    client.on("disconnect", () => {
      setConnected(false);
      setStatus("Disconnected");
    });

    client.on("connect_error", (socketError) => {
      setError(socketError.message || "Socket connection failed.");
      setStatus("Socket error");
    });

    client.on("room:history", ({ roomId, messages: history = [] }) => {
      if (roomId === currentRoomRef.current) {
        setMessages(history);
      }
    });

    client.on("message:updated", (updatedMessage) => {
      if (updatedMessage.room !== currentRoomRef.current) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)),
      );
    });

    client.on("message:deleted", (payload) => {
      const { messageId, room, deletedAt } = payload;
      if (room !== currentRoomRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deleted: true, deletedAt } : m,
        ),
      );
    });

    client.on("message:new", (message) => {
      if (message.room === currentRoomRef.current) {
        setMessages((prev) => [...prev, message]);
      }
    });

    client.on("user:online", (payload) => {
      // Normalize payload to include `_id` for React keys and compatibility with API data
      const normalized = { ...payload, _id: payload.userId || payload._id };
      setOnlineUsers((prev) => [
        normalized,
        ...prev.filter((item) => item._id !== normalized._id),
      ]);
    });

    client.on("user:offline", (payload) => {
      const id = payload.userId || payload._id;
      setOnlineUsers((prev) => prev.filter((item) => item._id !== id));
    });

    client.on("typing:started", (payload) => {
      setTypingUsers((prev) => [
        ...prev.filter((item) => item.userId !== payload.userId),
        payload,
      ]);
    });

    client.on("typing:stopped", (payload) => {
      setTypingUsers((prev) =>
        prev.filter((item) => item.userId !== payload.userId),
      );
    });

    return () => {
      disconnectSocket(client);
    };
  }, []);

  useEffect(() => {
    if (socket) {
      joinRoom(activeRoom);
    }
  }, [socket, activeRoom]);

  useEffect(() => {
    async function loadData() {
      try {
        const [roomResponse, onlineResponse] = await Promise.all([
          api.get("/chat/rooms"),
          api.get("/chat/users/online"),
        ]);

        const roomList = roomResponse.data.data || [];
        const resolvedRooms =
          roomList.length > 0
            ? roomList.map((room) => room.id)
            : [DEFAULT_ROOM];
        setRooms(resolvedRooms);
        setOnlineUsers(onlineResponse.data.data || []);
      } catch (err) {
        setError("Unable to load chat rooms.");
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = async (roomId) => {
    if (!socket || !roomId) return;
    setActiveRoom(roomId);
    setStatus(`Joined room ${roomId}`);
    setError(null);

    try {
      socket.emit("room:join", roomId);
      const response = await api.get(`/chat/rooms/${roomId}/messages`);
      setMessages(response.data.data || []);
    } catch (err) {
      setError("Unable to load messages for the selected room.");
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!messageText.trim() || !socket || !activeRoom) return;

    try {
      socket.emit("message:send", {
        roomId: activeRoom,
        content: messageText.trim(),
      });
      setMessageText("");
    } catch (err) {
      setError("Unable to send message.");
    }
  };

  const handleTyping = (event) => {
    setMessageText(event.target.value);
    if (!socket || !activeRoom) return;

    socket.emit("typing:start", activeRoom);
    window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socket.emit("typing:stop", activeRoom);
    }, 1200);
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    const name = roomName.trim();
    if (!name) return;

    try {
      const response = await api.post("/chat/rooms", { name });
      const newRoom = response.data.room;
      setRooms((prev) => [...new Set([...prev, newRoom.id])]);
      setRoomName("");
      setActiveRoom(newRoom.id);
    } catch (err) {
      setError("Unable to create room.");
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Logout failed", err);
    }
    onLogout();
  };

  const startEdit = (message) => {
    setEditingMessageId(message._id);
    setEditingText(message.content || "");
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editingMessageId) return;
    const newContent = editingText.trim();
    if (!newContent) return;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m._id === editingMessageId
          ? {
              ...m,
              content: newContent,
              edited: true,
              editedAt: new Date().toISOString(),
            }
          : m,
      ),
    );

    try {
      await updateMessage(editingMessageId, newContent);
    } catch (err) {
      setError("Failed to update message.");
      // In case of failure, reload messages for the room
      try {
        const response = await api.get(`/chat/rooms/${activeRoom}/messages`);
        setMessages(response.data.data || []);
      } catch (reloadErr) {
        console.warn("Failed to reload messages", reloadErr);
      }
    } finally {
      cancelEdit();
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;

    // Optimistic mark deleted
    const previous = messages;
    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId
          ? { ...m, deleted: true, deletedAt: new Date().toISOString() }
          : m,
      ),
    );

    try {
      await deleteMessage(messageId);
    } catch (err) {
      setError("Failed to delete message.");
      // rollback
      setMessages(previous);
    }
  };

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <div className="sidebar-brand">
          <div>
            <p className="brand-label">PalmMindAI</p>
            <h2>{user.name}</h2>
          </div>
          <button className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>

        <div className="room-panel">
          <h3>Rooms</h3>
          <div className="room-list">
            {rooms.map((roomId) => (
              <button
                key={roomId}
                type="button"
                className={
                  roomId === activeRoom ? "room-item active" : "room-item"
                }
                onClick={() => joinRoom(roomId)}
              >
                {roomId}
              </button>
            ))}
          </div>

          <form className="room-form" onSubmit={handleCreateRoom}>
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="New room name"
            />
            <button type="submit">Create</button>
          </form>
        </div>

        <div className="online-panel">
          <h3>Online</h3>
          <div className="online-list">
            {onlineUsers.length === 0 ? (
              <p className="empty-state">No users online yet.</p>
            ) : (
              onlineUsers.map((online) => (
                <div key={online._id} className="online-item">
                  <span className="status-dot" />
                  <span>{online.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div>
            <h3>{activeRoom}</h3>
            <p>{status}</p>
          </div>
          <div
            className={
              connected
                ? "connection-indicator online"
                : "connection-indicator offline"
            }
          >
            {connected ? "Connected" : "Offline"}
          </div>
        </header>

        <section className="message-board">
          {messages.length === 0 ? (
            <div className="empty-state">
              No messages yet. Say hello to the room.
            </div>
          ) : (
            messages.map((message) => {
              const userId = user?._id?.toString() || user?.id?.toString();
              const authorId =
                message.author?._id?.toString() ||
                message.author?.id?.toString();
              const isSender = authorId && userId ? authorId === userId : false;

              return (
                <div
                  key={message._id || `${message.room}-${message.timestamp}`}
                  className={`flex w-full ${isSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] flex flex-col ${
                      isSender ? "items-end" : "items-start"
                    }`}
                  >
                    {!isSender && (
                      <span className="text-xs font-semibold text-gray-500 mb-1 ml-1">
                        {message.author?.name || "Anonymous"}
                      </span>
                    )}

                    {message.deleted ? (
                      <>
                        <div className="px-4 py-2.5 shadow-sm text-sm italic text-gray-500 break-words bg-gray-50 rounded-2xl">
                          Message deleted
                        </div>

                        <span className="mt-1 text-[10px] text-gray-400 px-1">
                          {message.deletedAt
                            ? new Date(message.deletedAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : new Date(message.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                        </span>
                      </>
                    ) : editingMessageId === message._id && isSender ? (
                      <form onSubmit={submitEdit} className="w-full">
                        <input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-3 py-2 rounded border"
                        />
                        <div className="flex gap-2 mt-2">
                          <button type="submit" className="btn-primary">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div
                          className={`px-4 py-2.5 shadow-sm text-sm break-words ${
                            isSender
                              ? "bg-indigo-600 text-white rounded-2xl rounded-tr-none"
                              : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="mt-1 text-[10px] text-gray-400 px-1">
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          {isSender && (
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                type="button"
                                onClick={() => startEdit(message)}
                                className="text-xs text-indigo-500 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(message._id)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </section>

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.map((user) => user.name).join(", ")}{" "}
            {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}

        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            value={messageText}
            onChange={handleTyping}
            placeholder="Write a message..."
          />
          <button type="submit">Send</button>
        </form>

        {error && <div className="form-error">{error}</div>}
      </main>
    </div>
  );
}
