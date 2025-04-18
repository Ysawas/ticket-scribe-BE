# Ticket Scribe - Backend API

## Description

Ticket Scribe's backend API is a robust and scalable solution built with Node.js, Express, and MongoDB to power a comprehensive ticket support system. It provides a RESTful interface for managing users, departments, topics, and tickets, with a focus on security, data integrity, and efficient handling of large datasets.

## Features

-   **Authentication:** Secure user authentication and authorization using JWT (JSON Web Tokens).
-   **User Management:**
    -   Creation, retrieval, updating, and deletion of users.
    -   User roles: `admin`, `manager`, `supervisor`, `agent`, `customer`.
    -   User status management: `active`, `inactive`, `pending`.
-   **Department Management:**
    -   Creation, retrieval, updating, and deletion of departments.
    -   Support for hierarchical department structures.
-   **Topic Management:**
    -   Categorization and subcategorization of tickets.
-   **Ticket Management:**
    -   Creation, retrieval, updating, and deletion of tickets.
    -   Ticket statuses: `open`, `in progress`, `resolved`, `closed`.
    -   Ticket priorities: `low`, `medium`, `high`, `urgent`.
    -   Ticket assignment to users and departments.
    -   Ticket comments and history tracking.
    -   File attachments with validation.
-   **Validation:** Request validation using `express-validator` to ensure data integrity.
-   **Error Handling:** Centralized and consistent error handling for improved API responses.
-   **Pagination:** Efficient handling of large datasets through pagination on list endpoints.
-   **Rate Limiting:** Protection against abuse with rate limiting using `express-rate-limit`.
-   **Database:** MongoDB for flexible and scalable data storage.
-   **Database Reset:** A utility script for programmatic database resets.

## Technologies

-   Node.js
-   Express
-   MongoDB
-   Mongoose
-   JSON Web Token (JWT)
-   bcryptjs
-   cors
-   helmet
-   express-validator
-   multer
-   dotenv
-   express-rate-limit

## Getting Started

### Prerequisites

-   Node.js (>= 14.x)
-   MongoDB (a running instance, either local or cloud-based)
-   npm or yarn

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository_url>
    cd ticket-scribe-BE
    ```

2.  Install dependencies:

    ```bash
    npm install  # or yarn install
    ```

3.  Create a `.env` file in the project root and add your MongoDB connection string, JWT secret, and other configuration:

    ```
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret  #  A strong, random secret
    PORT=5000         # (Optional) Port the server will listen on (default is 5000)
    NODE_ENV=development # or production
    ```

    **Important:** Do not commit the `.env` file to your version control system.

### Running the Application

```bash
npm run dev  # For development with nodemon (auto-restart)
# or
npm start  # For production


The server will run on http://localhost:5000 (or the port specified in .env).

API Endpoints
For detailed API endpoint documentation, please refer to the routes directory. Key resources include:

/api/auth: Authentication (login, current user)
/api/users: User management
/api/departments: Department management
/api/topics: Topic management
/api/tickets: Ticket management
Note: It is highly recommended to use a tool like Postman or Insomnia to interact with the API.

Database Reset
To reset the database programmatically (WARNING: This will delete all data):

Bash

node reset-db.js
Project Structure
ticket-scribe-BE/
├── config/             # Database connection configuration
│   └── db.js
├── controllers/        # Request handling logic
│   ├── authController.js
│   ├── departmentController.js
│   ├── ticketController.js
│   ├── topicController.js
│   └── userController.js
├── middleware/       # Middleware functions
│   ├── auth.js       # Authentication middleware
│   ├── upload.js     # File upload middleware
│   └── isAdmin.js    # Admin Approval middleware
├── models/             # Mongoose schemas (data models)
│   ├── Department.js
│   ├── Ticket.js
│   ├── Topic.js
│   └── User.js
├── routes/             # API routes
│   ├── auth.js
│   ├── departments.js
│   ├── tickets.js
│   ├── topics.js
│   └── users.js
├── utils/              # Utility functions
│   └── errorHandler.js  # Centralized error handling
├── uploads/            # (Optional) Directory for file uploads (if enabled)
├── server.js           # Main server application
├── package.json        # Project dependencies and metadata
├── package-lock.json   # Detailed dependency tree (auto-generated)
├── README.md           # Project documentation (this file)
└── .env                # Environment variables (not committed to version control)
Authentication
The API uses JWT for authentication.

Login: Send a POST request to /api/auth/login with email and password in the request body. You will receive a JWT in the response.

JSON

{
  "email": "user@example.com",
  "password": "password123"
}
JSON

{
  "token": "your.jwt.token"
}
Authorization: Include the JWT in the x-auth-token header of subsequent requests that require authentication.

x-auth-token: your.jwt.token
Error Handling
The API provides consistent error responses in the following format:

JSON

{
  "error": "Error Type",
  "details": "Detailed error message"
}
Common error types include:

Validation Error: Data validation failed.
Duplicate Key Error: Attempt to create a record with a duplicate key.
Invalid ID: Invalid resource ID.
Invalid Token: Invalid or missing JWT.
Token Expired: JWT has expired.
Server Error: A general server-side error.
Rate Limit Exceeded: Too many requests.
Pagination
List endpoints support pagination using query parameters:

limit: The maximum number of items per page (e.g., /api/users?limit=20).
page: The page number to retrieve (e.g., /api/users?page=2).
The response will include:

users (or departments, topics, tickets): The array of data for the current page.
total: The total number of items.
currentPage: The current page number.
totalPages: The total number of pages.
Rate Limiting
The API is protected by rate limiting to prevent abuse. The default limit is 100 requests per IP address within a 15-minute window. You may receive a 429 "Too Many Requests" error if you exceed this limit.

File Uploads
Some ticket creation endpoints support file uploads.

Use multipart/form-data for requests with file uploads.
The file input field name should be attachments.
The backend validates file types and sizes.
Security Considerations
Authentication: Use strong JWT secrets and implement proper token validation.
Authorization: Implement role-based access control to restrict access to sensitive endpoints.
Input Validation: Sanitize and validate all user input to prevent injection attacks.
Error Handling: Avoid exposing sensitive information in error messages.
Dependencies: Keep dependencies updated to patch security vulnerabilities.
HTTPS: Always use HTTPS to encrypt communication.
Testing
Use a tool like Postman or Insomnia to test the API endpoints.

Send requests with and without valid JWTs to test authentication.
Test different user roles for authorization (if applicable).
Send valid and invalid data to test validation.
Test error scenarios to ensure proper error handling.
Send requests exceeding the rate limit to verify rate limiting.
Test file uploads with different file types and sizes (if applicable).
Contributing
(Add your contribution guidelines here if you want others to contribute)

License
ISC (or your chosen license)