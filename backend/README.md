# Transcendence Backend

## Overview
Transcendence Backend is a Node.js application built with TypeScript and Express. It connects to a database and is containerized using Docker. This project serves as the backend for the Transcendence application, providing APIs for the frontend to interact with.

## Project Structure
```
transcendence-backend
├── src
│   ├── app.ts                # Initializes the Express application
│   ├── server.ts             # Entry point for starting the server
│   ├── config
│   │   └── database.ts       # Database connection configuration
│   ├── controllers
│   │   └── index.ts          # Business logic for routes
│   ├── routes
│   │   └── index.ts          # API route definitions
│   ├── models
│   │   └── index.ts          # Data models for the application
│   ├── middleware
│   │   └── index.ts          # Middleware functions
│   └── types
│       └── index.ts          # TypeScript interfaces and types
├── docker
│   ├── Dockerfile             # Instructions for building the Docker image
│   └── docker-compose.yml     # Docker Compose configuration
├── migrations
│   └── .gitkeep              # Keeps migrations directory in version control
├── package.json               # npm configuration file
├── tsconfig.json             # TypeScript configuration file
├── .env.example               # Example environment variables
├── Makefile                   # Commands for building and running the application
└── README.md                  # Project documentation
```

## Getting Started

### Prerequisites
- Docker and Docker Compose installed on your machine.
- Node.js and npm installed (for local development).

### Setup
1. Clone the repository:
   ```
   git clone <repository-url>
   cd transcendence-backend
   ```

2. Copy the example environment file:
   ```
   cp .env.example .env
   ```

3. Fill in the `.env` file with your database connection details and other environment variables.

### Running the Application
To build and run the application using Docker, use the following command:
```
make all
```

This will build the Docker image and start the container.

### Stopping the Application
To stop the application, you can simply exit the container or use:
```
docker-compose down
```

### Running Migrations
If you have database migrations, you can run them using your preferred migration tool or script.

## Usage
Once the application is running, you can access the API at `http://localhost:3000`. Refer to the API documentation for available endpoints and usage.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.