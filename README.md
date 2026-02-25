# 🏦 Loan Management System

A full-stack web application for managing loan applications, approvals, and tracking — built with React, Node.js, Express, and MongoDB. Features a three-role system (User, Loan Officer, Admin), real-time chat, EMI calculator, and a complete loan lifecycle workflow.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), JavaScript |
| Styling | CSS (custom, index.css) |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT (JSON Web Tokens) |

---

## ✨ Features

### 👤 User
- Register and log in securely
- Apply for loans with full application form
- Track real-time loan status (Pending → Under Review → Approved / Rejected)
- View detailed loan history and repayment schedule
- Built-in **EMI Calculator** — compute monthly installments before applying
- **Live Chat** — message support directly from the platform

### 🏢 Loan Officer
- Dedicated **Officer Panel** to review assigned loan applications
- Approve or reject applications with remarks
- View applicant details and uploaded documents

### 🔐 Admin
- Full **Admin Dashboard** with overview of all loans and users
- Manage loan officers — assign/remove roles
- Monitor system-wide loan activity and status

---

## 📁 Project Structure

```
LoanManagementSystem/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js        # Axios instance with base URL + auth headers
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Top navigation bar
│   │   │   └── Sidebar.jsx     # Role-aware sidebar navigation
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global auth state (user, token, role)
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing page
│   │   │   ├── Register.jsx        # User registration
│   │   │   ├── Login.jsx           # User login
│   │   │   ├── AdminLogin.jsx      # Admin login (separate route)
│   │   │   ├── Dashboard.jsx       # User dashboard — loan list & status
│   │   │   ├── LoanApply.jsx       # Loan application form
│   │   │   ├── LoanDetail.jsx      # Detailed loan view + repayment schedule
│   │   │   ├── EMICalculator.jsx   # Standalone EMI calculator tool
│   │   │   ├── ChatPage.jsx        # Live chat / support interface
│   │   │   ├── OfficerPanel.jsx    # Loan officer review panel
│   │   │   └── AdminDashboard.jsx  # Admin management dashboard
│   │   ├── App.jsx             # Routes and layout
│   │   └── main.jsx            # Entry point
│   └── vite.config.js
│
└── server/                     # Node.js + Express backend
    ├── middleware/
    │   └── authMiddleware.js   # JWT verification + role-based guards
    ├── models/
    │   ├── User.js             # User schema (name, email, password, role)
    │   ├── Loan.js             # Loan schema (applicant, amount, status, docs)
    │   └── Message.js          # Chat message schema
    ├── routes/
    │   ├── auth.js             # Register, login, token endpoints
    │   ├── loan.js             # Loan CRUD + status update + officer actions
    │   └── messages.js         # Chat message endpoints
    └── index.js                # Express app entry point
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js >= 16
- MongoDB (local or Atlas)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd LoanManagementSystem
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in `/server`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Start the server:
```bash
node index.js
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

> **Note:** The Vite proxy is configured in `vite.config.js` to forward `/api` requests to `http://localhost:5000`.

---

## 🔐 Authentication & Roles

The system uses **JWT-based authentication** with three roles:

| Role | Access |
|------|--------|
| `user` | Apply for loans, track status, chat, EMI calculator |
| `officer` | Review and action loan applications |
| `admin` | Full system access — users, officers, all loans |

All protected routes verify the JWT token via `authMiddleware.js`. Role-specific routes additionally check the user's role before granting access.

---

## 📡 API Routes

### Auth — `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | User login — returns JWT |
| POST | `/admin/login` | Admin login |

### Loans — `/api/loans`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/apply` | Submit a new loan application |
| GET | `/my` | Get current user's loans |
| GET | `/:id` | Get loan details by ID |
| PUT | `/:id/status` | Officer: update loan status |
| GET | `/all` | Admin: get all loans |

### Messages — `/api/messages`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Fetch chat messages |
| POST | `/` | Send a message |

---

## 🗄️ Data Models

### User
```
name, email, password (hashed), role (user / officer / admin), createdAt
```

### Loan
```
applicant (ref: User), loanType, amount, tenure, purpose,
status (pending / under_review / approved / rejected),
officerRemarks, assignedOfficer (ref: User),
documents, repaymentSchedule, createdAt
```

### Message
```
sender (ref: User), content, timestamp
```

---

## 🧮 EMI Calculator

The built-in EMI calculator uses the standard formula:

```
EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
```

Where:
- `P` = Principal loan amount
- `r` = Monthly interest rate (annual rate / 12 / 100)
- `n` = Loan tenure in months

---

## 🐛 Environment Variables

### Backend (Server)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port for the Express server | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` (Use Atlas for production) |
| `JWT_SECRET` | Secret key for signing JWT tokens | `supersecretkey123` |
| `EMAIL_USER` | Email address for sending OTPs | `demonop25@gmail.com` |
| `EMAIL_PASS` | App password for the email address | `hjkagaywawppeael` |
| `CLIENT_URL` | URL of the deployed frontend | `https://my-loan-frontend.vercel.app` |
| `STAFF_REGISTRATION_CODE` | Passcode for Branch Manager registration | `BHARAT2024` |

### Frontend (Client)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | URL of the deployed backend API | `https://my-loan-backend.onrender.com/api` |

---

## 🚀 Deployment Guide

### Deploying the Backend (e.g., to Render)
1. Push your code to GitHub.
2. Create a new **Web Service** on Render.
3. Connect your repository.
4. Set the **Build Command** to `npm install` and the **Start Command** to `node index.js`.
5. Add all the **Backend Environment Variables** listed above.
6. **Note on MongoDB:** You cannot use `localhost` in production. Create a free cluster on MongoDB Atlas and use that connection string.
7. Deploy! Wait for it to build and get your `onrender.com` URL.

### Deploying the Frontend (e.g., to Vercel)
1. Create a new project on Vercel and import your repository.
2. The framework preset should auto-detect **Vite**.
3. Under **Environment Variables**, add `VITE_API_URL` and set its value to your newly deployed backend URL (make sure it ends in `/api`).
4. Click **Deploy**.
5. Once deployed, get your Vercel URL and **go back to your backend settings** to update the `CLIENT_URL` environment variable so CORS allows the connection.

---

## 📝 License

MIT