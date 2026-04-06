# Job Application Tracker – Design Document

## 1. Overview

The Job Application Tracker is a full-stack web application that allows users to track job applications, manage company events, and provides an admin dashboard for analytics and management. The backend is built with Spring Boot (Java), and the frontend uses React with Tailwind CSS.

---

## 2. Architecture

### 2.1. Backend

- **Framework:** Spring Boot (Java 17)
- **Database:** H2 (in-memory for tests, file-based for dev/prod)
- **Authentication:** JWT-based, with refresh tokens
- **Persistence:** JPA/Hibernate
- **API:** RESTful endpoints

### 2.2. Frontend

- **Framework:** React (with hooks and context)
- **Styling:** Tailwind CSS, DaisyUI
- **Routing:** React Router
- **Charts:** Recharts

---

## 3. Core Features

### 3.1. User Features

- Register and login (JWT authentication)
- Add, edit, delete, and view job applications
- View company events
- Filter and search job applications

### 3.2. Admin Features

- Admin dashboard with statistics (total jobs, users, companies, offers)
- Manage all job applications (CRUD)
- Manage company events (CRUD)
- View analytics (charts, status breakdowns)

---

## 4. Backend Design

### 4.1. Entities

- **User:** Stores username, password (hashed), and role (USER/ADMIN)
- **Job:** Stores job details, status, notes, and links to a user
- **CompanyEvent:** Stores event details, description, and date
- **RefreshToken:** Stores refresh tokens for users

### 4.2. Security

- **JWT Authentication:** All protected endpoints require a valid JWT in the `Authorization` header.
- **Roles:** Role-based access (ADMIN/USER) enforced in controllers/services.
- **Password Hashing:** Passwords are hashed using BCrypt.

### 4.3. API Endpoints

- `/auth/register` & `/auth/login`: User registration and login
- `/api/applications`: User job application management
- `/api/events`: Public company events
- `/api/admin/applications`: Admin job management
- `/api/admin/events`: Admin event management

### 4.4. Repositories

- JPA repositories for all entities, with custom queries for analytics and filtering.

---

## 5. Frontend Design

### 5.1. State Management

- **AuthContext:** Manages authentication state and role.
- **Component State:** Local state for forms, lists, and UI feedback.

### 5.2. Pages & Components

- **Login/Register:** User authentication forms
- **Dashboard:** User job tracking, stats, and filters
- **AdminDashboard:** Admin analytics, job/event management
- **JobForm/JobList:** Job application CRUD UI
- **Event List:** Company events display

### 5.3. API Integration

- **Axios:** Centralized API client with JWT token injection
- **Error Handling:** UI feedback for API errors and loading states

### 5.4. UI/UX

- **Responsive Design:** Tailwind CSS for mobile-friendly layouts
- **Charts:** Visual analytics for job statuses and trends

---

## 6. Security Considerations

- JWT tokens are stored in sessionStorage (frontend)
- Passwords are never exposed in API responses
- Admin endpoints are protected by role checks

---

## 7. Extensibility

- Easily add new job statuses or event types
- Support for additional analytics or export features
- Modular React components for UI scalability

---

## 8. Deployment

- **Backend:** Spring Boot JAR, H2 or external DB
- **Frontend:** Static build (Vite) served via any static host

---

## 9. Known Limitations

- No email verification or password reset
- No user profile management
- H2 database is not suitable for production without migration to a persistent DB

---

## 10. Future Improvements

- Add notifications for upcoming events
- Support for file uploads (e.g., resumes)
- Multi-admin support and audit logs