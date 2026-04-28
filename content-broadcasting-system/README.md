# Content Broadcasting System

A production-ready Node.js/Express/MySQL backend for distributing educational content from teachers to students, with approval workflows, scheduling/rotation, Redis caching, and subject-wise analytics.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Runtime     | Node.js 18+                         |
| Framework   | Express 4.x                         |
| Database    | MySQL 8+ (via mysql2)               |
| Cache       | Redis 7+ (ioredis) — optional       |
| Auth        | JWT + bcryptjs                      |
| Uploads     | Multer (local disk)                 |
| Validation  | express-validator                   |
| Logging     | Winston + Morgan                    |
| Security    | Helmet, CORS, express-rate-limit    |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your DB credentials
```

### 3. Seed database (creates tables + demo users)
```bash
npm run seed
```

### 4. Start server
```bash
npm run dev    # development (nodemon)
npm start      # production
```

---

## Demo Accounts (after seed)

| Role      | Email                    | Password     |
|-----------|--------------------------|--------------|
| Principal | principal@school.com     | principal123 |
| Teacher 1 | teacher1@school.com      | teacher123   |
| Teacher 2 | teacher2@school.com      | teacher123   |
| Teacher 3 | teacher3@school.com      | teacher123   |

---

## API Reference

### Auth

| Method | Endpoint            | Auth | Description        |
|--------|---------------------|------|--------------------|
| POST   | /api/auth/register  | ✗    | Register user      |
| POST   | /api/auth/login     | ✗    | Login, get token   |
| GET    | /api/auth/me        | ✓    | Get profile        |

**Login example:**
```json
POST /api/auth/login
{
  "email": "teacher1@school.com",
  "password": "teacher123"
}
```

---

### Content (Teacher)

| Method | Endpoint                  | Role    | Description            |
|--------|---------------------------|---------|------------------------|
| POST   | /api/content/upload       | Teacher | Upload content + file  |
| GET    | /api/content              | Both    | List (paginated)       |
| GET    | /api/content/:id          | Both    | Single item            |
| DELETE | /api/content/:id          | Both    | Delete (own or any)    |

**Upload example (multipart/form-data):**
```
POST /api/content/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

title: "Quadratic Equations"
subject: "maths"
description: "Chapter 4 worksheet"
start_time: "2025-01-01T08:00:00Z"
end_time: "2025-12-31T18:00:00Z"
rotation_duration: 5
file: [image file]
```

**Filter & Paginate:**
```
GET /api/content?status=approved&subject=maths&page=1&limit=10
GET /api/content?teacher_id=<uuid>&status=pending
```

---

### Approval (Principal)

| Method | Endpoint                    | Role      | Description           |
|--------|-----------------------------|-----------|-----------------------|
| GET    | /api/content/pending        | Principal | List pending content  |
| PATCH  | /api/content/:id/approve    | Principal | Approve content       |
| PATCH  | /api/content/:id/reject     | Principal | Reject with reason    |

**Reject example:**
```json
PATCH /api/content/:id/reject
{ "rejection_reason": "Image quality too low" }
```

---

### Public Broadcasting (No Auth — Students)

| Method | Endpoint                              | Description                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | /content/live/:teacherId              | Currently active content (all subjects)  |
| GET    | /content/live/:teacherId?subject=maths| Active content for one subject           |
| GET    | /content/live/:teacherId/subjects     | List active subjects for teacher         |

**Example response:**
```json
GET /content/live/abc-123-uuid

{
  "success": true,
  "message": "Content available",
  "data": [
    {
      "id": "...",
      "title": "Quadratic Equations",
      "subject": "maths",
      "file_url": "/src/uploads/2025-01/uuid.png",
      "duration": 5
    }
  ]
}
```

**No content response:**
```json
{
  "success": true,
  "message": "No content available",
  "data": null
}
```

---

### Analytics (Protected)

| Method | Endpoint                          | Role               | Description                    |
|--------|-----------------------------------|--------------------|--------------------------------|
| GET    | /api/analytics/summary            | Principal          | Overall platform summary       |
| GET    | /api/analytics/subjects?days=7    | Principal          | Most active subjects           |
| GET    | /api/analytics/content-usage      | Principal          | Per-content view counts        |
| GET    | /api/analytics/trend?subject=maths| Principal          | Daily view trend               |
| GET    | /api/analytics/teacher            | Teacher (own)      | Teacher's subject analytics    |
| GET    | /api/analytics/teacher/:id        | Principal          | Any teacher's analytics        |

---

## Scheduling Logic

The rotation algorithm is **stateless** — no DB writes on each student request:

```
For each subject group of a teacher's live content:
  totalCycleSec = SUM(item.duration * 60)
  position = Math.floor(Date.now() / 1000) % totalCycleSec
  
  Walk items in rotation_order until position is consumed
  → that item is active
```

**Example with 3 Maths items (5 min each = 15 min cycle):**
```
Epoch % 900 = 0–299   → Content A shown
Epoch % 900 = 300–599 → Content B shown  
Epoch % 900 = 600–899 → Content C shown
→ loops continuously
```

Content only participates if:
- `status = 'approved'`
- `start_time` and `end_time` are set
- Current time is within that window

---

## Edge Cases

| Case                              | Response                              |
|-----------------------------------|---------------------------------------|
| No approved content               | `{ data: null, message: "No content available" }` |
| Approved but outside time window  | `{ data: null, message: "No content available" }` |
| Invalid/unknown subject           | `{ data: null }` (not an error)       |
| Invalid teacher ID                | `{ data: null, message: "No content available" }` |
| Redis down                        | Falls back to DB queries silently     |

---

## Redis Cache Keys

| Pattern                            | TTL  | Invalidated on        |
|------------------------------------|------|-----------------------|
| `live:<teacherId>:<subject>`       | 15s  | approve/reject/delete |
| `route:/api/content*`              | 30s  | any content mutation  |
| `analytics:active-subjects:<days>` | 120s | view tracked          |
| `analytics:content-usage:<days>`  | 120s | view tracked          |
| `analytics:summary`               | 60s  | view tracked          |

Redis is optional. If unavailable, all operations fall through to MySQL.

---

## Project Structure

```
src/
├── app.js                    # Express bootstrap
├── config/
│   ├── database.js           # MySQL pool
│   └── redis.js              # Redis client + safe helpers
├── controllers/              # HTTP handlers
├── services/                 # Business logic
├── models/                   # SQL queries
├── middlewares/              # Auth, upload, cache, validation
├── routes/                   # Route definitions
└── utils/                    # Logger, response helpers, migrations
architecture-notes.txt        # Design decisions
```

---

## Environment Variables

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=content_broadcasting

JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=300

UPLOAD_PATH=src/uploads
MAX_FILE_SIZE=10485760        # 10MB in bytes

RATE_LIMIT_WINDOW_MS=900000   # 15 min
RATE_LIMIT_MAX=100
```
