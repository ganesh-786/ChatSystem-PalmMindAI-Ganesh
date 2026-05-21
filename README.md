# Real-Time Chat & User Management System

A secure, full-stack real-time chat application built with Node.js, Express, MongoDB, Socket.IO, and React. This system includes complete User CRUD operations, JWT authentication, role-based authorization, live messaging capabilities, and real-time dashboard analytics.

## Demo Video

[Watch Demo Video](https://drive.google.com/file/d/19BWHY6x8BeXvo9hZ69idwQbWwt7PK1B_/view?usp=sharing)

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, MongoDB (Mongoose), Socket.IO
- **Frontend:** React, TypeScript, TailwindCSS, Socket.IO-client

---

## Features

- **Authentication & Security:** Secure JWT-based login/signup with password hashing (bcrypt).
- **User CRUD:** Complete user management with protected routes requiring authorization tokens.
- **Real-Time Communication:** Persistent WebSocket connections via Socket.IO for message dispatching and "user joined" notifications.
- **Persistent Storage:** Chat histories are written directly to MongoDB.
- **Live Analytics Dashboard:** Real-time counters showing total registered users and cumulative chat messages across the platform.

---

## Getting Started

### Prerequisites

Ensure you have the following installed locally:

- Node.js (v18 or higher recommended)
- MongoDB Server (Local or MongoDB Atlas cluster)
- npm or yarn

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ganesh-786/ChatSystem-PalmMindAI-Ganesh.git](https://github.com/ganesh-786/ChatSystem-PalmMindAI-Ganesh.git)
cd ChatSystem-PamMindAI-Ganesh

# Install server dependencies
cd backend
npm install

# Install client dependencies
cd ../frontend
npm install
```
