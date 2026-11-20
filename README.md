# Campus Lost & Found Management System

Full-stack platform where students report lost belongings, publish found belongings, search
listings and submit recovery requests. Administrators manage reports, requests and users.

- **Frontend:** React 18 + Vite + React Router + Axios + Lucide icons + custom CSS design system
- **Backend:** Node.js + Express, REST API, JWT auth, bcrypt, controllers/middleware split
- **Database:** MongoDB Atlas with Mongoose
- **Images:** Cloudinary
- **Deployment:** backend on Render Web Service, frontend on Render Static Site

---

## 1. Prerequisites

| Tool | Where |
|---|---|
| Node.js 20+ | nodejs.org |
| MongoDB Atlas cluster | mongodb.com/cloud/atlas (free M0) |
| Cloudinary account | cloudinary.com (free) |
| Git, Postman | git-scm.com, postman.com |

## 2. Backend setup

```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Fill `server/.env`:

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/campus_lost_found?retryWrites=true&w=majority
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ADMIN_EMAIL=admin@saiuniversity.edu.in
ADMIN_PASSWORD=admin123
```

Seed the sample data (12 items + admin + demo student):

```bash
npm run seed
npm run dev
```

API runs at `http://localhost:5000`, health check at `/api/health`.

## 3. Frontend setup

```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev
```

Open `http://localhost:5173`.

Demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@saiuniversity.edu.in | admin123 |
| Student | demo@saiuniversity.edu.in | demo123 |

## 4. Project structure

```
server/
  server.js                 entry point: middleware, routes, error handler
  config/database.js        Mongoose connection
  config/cloudinary.js      Cloudinary client
  models/User.js            name, email, studentId, passwordHash, role, accountStatus
  models/Item.js            title, description, category, type, location, eventDate, imageUrl, status
  models/RecoveryRequest.js itemId, requesterId, message, status, reviewedBy
  middleware/authMiddleware.js   protect (JWT)
  middleware/adminMiddleware.js  adminOnly (role)
  middleware/upload.js      multer memory + Cloudinary upload
  middleware/errorMiddleware.js  notFound + errorHandler
  controllers/authController.js  register, login, me, logout, changePassword
  controllers/itemController.js  list with filters, get, create, update, delete, my reports, stats
  controllers/requestController.js  create, my requests, by item, by id, update status
  controllers/adminController.js    dashboard, users, items, requests, user status, item status, delete
  routes/*.js               authRoutes, itemRoutes, requestRoutes, adminRoutes
  utils/seed.js             sample data
  postman/Campus_Lost_Found_API.postman_collection.json

client/
  index.html
  vite.config.js
  src/main.jsx              React root + router
  src/App.jsx               routes
  src/index.css             design system (navy + amber accent)
  src/api/client.js         axios instance with token interceptor
  src/context/AuthContext.jsx   session, login, register, logout
  src/components/Navbar.jsx, Footer.jsx, ItemCard.jsx, ProtectedRoute.jsx,
                 Loader.jsx, EmptyState.jsx, StatsRow.jsx
  src/pages/Landing.jsx, Browse.jsx, Login.jsx, Register.jsx, ReportItem.jsx,
            ItemDetails.jsx, Dashboard.jsx, Profile.jsx, Admin.jsx, NotFound.jsx
```

## 5. API reference

Base URL: `http://localhost:5000/api`. Private routes need `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Access | Body |
|---|---|---|---|
| POST | `/auth/register` | public | name, email, password, studentId? |
| POST | `/auth/login` | public | email, password |
| GET | `/auth/me` | private | - |
| POST | `/auth/logout` | private | - |
| PUT | `/auth/password` | private | currentPassword, newPassword |

### Items
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/items` | public | q, type, category, location, status, dateFrom, dateTo, sort, page, limit |
| GET | `/items/stats` | public | real counts for the landing page |
| GET | `/items/my-reports` | private | my listings |
| GET | `/items/:id` | public | one item |
| POST | `/items` | private | multipart: title, description, category, type, location, eventDate, identifyingFeatures, image |
| PUT | `/items/:id` | owner/admin | update |
| DELETE | `/items/:id` | owner/admin | delete |

### Recovery requests
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/requests` | private | itemId, message |
| GET | `/requests/my-requests` | private | requests I made |
| GET | `/requests/received` | private | requests on my items |
| GET | `/requests/:id` | owner/admin/requester | one request |
| GET | `/requests/item/:itemId` | owner/admin | requests for an item |
| PUT | `/requests/:id/status` | owner/admin | status: approved / rejected |

### Admin
| Method | Endpoint | Access |
|---|---|---|
| GET | `/admin/dashboard` | admin |
| GET | `/admin/users` | admin |
| GET | `/admin/items` | admin |
| GET | `/admin/requests` | admin |
| PUT | `/admin/users/:id/status` | admin |
| PUT | `/admin/items/:id/status` | admin |
| DELETE | `/admin/items/:id` | admin |

## 6. Status values (only these are used)

- Item: `open`, `under-review`, `matched`, `recovered`, `closed`
- Recovery request: `pending`, `approved`, `rejected`
- Account: `active`, `suspended`

## 7. Database design

**users**: name, email (unique), studentId, passwordHash, role (`user`/`admin`), accountStatus
(`active`/`suspended`), timestamps. Index: email unique.

**items**: title, description, category (enum), type (`lost`/`found`), location, eventDate,
identifyingFeatures, imageUrl, imagePublicId, status (enum), reportedBy (ref User), timestamps.
Indexes: text index on title + description, and single indexes on type, status, category, eventDate.

**recoveryrequests**: itemId (ref Item), requesterId (ref User), message, status
(`pending`/`approved`/`rejected`), reviewedBy (ref User), timestamps.
Unique compound index on (itemId, requesterId) so one person cannot request the same item twice.

## 8. Security

- bcrypt password hashing (cost 10), password never returned by the API
- JWT with expiry, verified by `protect`
- Role check by `adminOnly`, applied to the whole admin router
- Ownership checks before every update or delete
- `express-mongo-sanitize` strips `$`/`.` operators (NoSQL injection)
- `express-rate-limit` on /api/auth (20 requests / 15 min)
- CORS restricted to `CLIENT_URL`
- `helmet` security headers
- Multer validates MIME type and 3 MB size; images go to Cloudinary, only the URL is stored
- Central error handler returns 4xx messages to the client and hides 5xx internals
- `.env` is git-ignored; `.env.example` has placeholders only

## 9. Testing

- Postman collection: `server/postman/Campus_Lost_Found_API.postman_collection.json`
  (24 requests with assertions: success, invalid input, 401, 403, ownership, request workflow, admin)
- Manual checklist in `TESTING.md`

## 10. Deployment

**Backend (Render Web Service)**
1. Push the repo to GitHub.
2. Render → New → Web Service → repo → Root Directory `server`,
   Build `npm install`, Start `npm start`, Instance Free.
3. Environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
   `CLIENT_URL` (your static site URL), `NODE_ENV=production`.
4. Atlas → Network Access → allow `0.0.0.0/0`.
5. Run `npm run seed` once from your machine against the Atlas database.

**Frontend (Render Static Site)**
1. Render → New → Static Site → same repo → Root Directory `client`,
   Build `npm install && npm run build`, Publish directory `dist`.
2. Environment variable `VITE_API_URL=https://your-backend.onrender.com/api`.
3. Add the static site URL to the backend's `CLIENT_URL` and redeploy the backend.

## 11. Academic honesty

This is an individual assignment. Declare AI assistance in the report's AI-use disclosure section,
and be able to explain every file in the viva.
