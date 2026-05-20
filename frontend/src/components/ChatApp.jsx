import { useEffect, useRef, useState } from "react";
import api from "../services/api.js";
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

    client.on("message:new", (message) => {
      if (message.room === currentRoomRef.current) {
        setMessages((prev) => [...prev, message]);
      }
    });

    client.on("user:online", (payload) => {
      setOnlineUsers((prev) => [
        payload,
        ...prev.filter((item) => item.userId !== payload.userId),
      ]);
    });

    client.on("user:offline", (payload) => {
      setOnlineUsers((prev) =>
        prev.filter((item) => item.userId !== payload.userId),
      );
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
            messages.map((message) => (
              <article
                key={message._id || `${message.room}-${message.timestamp}`}
                className="message-card"
              >
                <div className="message-header">
                  <span className="message-author">
                    {message.author?.name || "Anonymous"}
                  </span>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p>{message.content}</p>
              </article>
            ))
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
