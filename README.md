# Skillwise LMS Backend

A robust Learning Management System API built with Express.js 5, TypeScript, and MongoDB, featuring Zitadel for authentication.

## Features

- **Course Management** - CRUD operations for courses with modules and resources
- **Learning Paths** - Curated collections of courses
- **Progress Tracking** - Track student progress across courses and paths
- **Assignments** - MCQ and subjective assignments with grading
- **Comments** - Course-level discussions
- **Role-Based Access** - Student and Coach roles with appropriate permissions
- **JWT Authentication** - Secure authentication via Zitadel OIDC

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Zitadel (OAuth2/OIDC)
- **Validation**: Zod
- **Architecture**: Layered (Routes → Controllers → Services → Repositories)

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for Zitadel)
- MongoDB instance (local or Atlas)

## Quick Start

### 1. Start Zitadel (Authentication Server)

```bash
cd scripts
docker compose up -d
```

Wait for Zitadel to be healthy (may take 1-2 minutes on first run):

```bash
docker compose logs -f zitadel
```

### 2. Configure Zitadel

Open [http://localhost:8080](http://localhost:8080) in your browser.

**Default credentials:**
- Username: `zitadel-admin@zitadel.localhost`
- Password: `Password1!`

#### Create a Project

1. Go to **Projects** → **Create New Project**
2. Name: `Skillwise LMS`
3. **Important**: Enable **"Assert Roles on Authentication"** in project settings
   - This returns user roles in the JWT token

#### Create Backend API Application

1. In your project, go to **Applications** → **New**
2. Name: `LMS Backend`
3. Type: **API**
4. Authentication Method: **JWT**
5. Save and note the **Client ID**

#### Create Frontend Web Application

1. **Applications** → **New**
2. Name: `LMS Frontend`
3. Type: **Web**
4. Authentication Method: **PKCE**
5. Redirect URIs:
   - `http://localhost:5173/callback`
6. Post Logout URIs:
   - `http://localhost:5173`
7. Save and note the **Client ID**

#### Create Roles

1. Go to **Projects** → **Skillwise LMS** → **Roles**
2. Create two roles:
   - Key: `student`, Display Name: `Student`
   - Key: `coach`, Display Name: `Coach`

### 3. Configure Environment

Copy the example environment file and edit it:

```bash
cp env.example .env
```

Or create a `.env` file manually:

```env
PORT=3008
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lms
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lms

# Zitadel
ZITADEL_ISSUER=http://localhost:8080
ZITADEL_CLIENT_ID=your_backend_client_id
```

### 4. Install & Run

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

The API will be available at [http://localhost:3008](http://localhost:3008).

## API Endpoints

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/me` | Get current user | Required |
| POST | `/api/users/set-role` | Set user role | Required |

### Courses
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/courses` | List all courses | Optional |
| GET | `/api/courses/:id` | Get course details | Optional |
| POST | `/api/courses` | Create course | Coach |
| PUT | `/api/courses/:id` | Update course | Coach (owner) |
| DELETE | `/api/courses/:id` | Delete course | Coach (owner) |

### Assignments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/assignments/course/:courseId` | List course assignments | Optional |
| GET | `/api/assignments/:id` | Get assignment | Optional |
| POST | `/api/assignments` | Create assignment | Coach |
| PUT | `/api/assignments/:id` | Update assignment | Coach (owner) |
| DELETE | `/api/assignments/:id` | Delete assignment | Coach (owner) |

### Progress
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/progress/my-courses` | Get enrolled courses | Student |
| GET | `/api/progress/:courseId` | Get course progress | Student |
| POST | `/api/progress/enroll/:courseId` | Enroll in course | Student |
| POST | `/api/progress/complete-resource` | Mark resource complete | Student |
| POST | `/api/progress/submit` | Submit assignment | Student |
| POST | `/api/progress/grade` | Grade submission | Coach |

### Paths
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/paths` | List all paths | Optional |
| GET | `/api/paths/my-paths` | Get started paths | Student |
| GET | `/api/paths/:id` | Get path details | Optional |
| GET | `/api/paths/:id/progress` | Get path progress | Student |
| POST | `/api/paths` | Create path | Coach |
| POST | `/api/paths/:id/start` | Start a path | Student |
| PUT | `/api/paths/:id` | Update path | Coach (owner) |
| DELETE | `/api/paths/:id` | Delete path | Coach (owner) |

### Comments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/comments/:courseId` | Get course comments | Required |
| POST | `/api/comments` | Create comment | Required |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/lms` |
| `ZITADEL_ISSUER` | Zitadel issuer URL | - |
| `ZITADEL_CLIENT_ID` | Zitadel client ID | - |

## Docker Commands

```bash
# Start Zitadel
cd scripts && docker compose up -d

# View logs
docker compose logs -f

# Stop Zitadel
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v
```

## Related

- [LMS Frontend](../lms-frontend) - Next.js frontend application
- [Architecture Guide](./ARCHITECTURE.md) - Detailed architecture documentation
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute

## License

ISC

