# Campus Lost & Found Management System

A full-stack web application where students report belongings they lost, publish belongings they
found, search every report on campus, and recover items through a reviewed request instead of a
chat group. Administrators moderate listings, review requests and manage accounts.

Built as an individual project for **Web Technology and Internet Programming**, Sai University
(B.Tech Computer Science, 2026-2027).

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Axios, Lucide icons, custom CSS design system |
| Backend | Node.js, Express 4, REST API split into routes / controllers / models / middleware |
| Database | Supabase PostgreSQL, dedicated schema `app_v2`, accessed with the `pg` driver |
| Authentication | Own JWT (`jsonwebtoken`) + `bcryptjs`; roles `user` / `admin`; account status `active` / `suspended` |
| Image storage | Supabase Storage, bucket `item-images` (server side only, service key never in the browser) |
| Hosting | One Render web service: Express serves `/api/*` and the built React app from `client/dist` |

---

## Features

**Public**
- Landing page with live statistics (total / lost / found / recovered), recent lost and found items
- Browse with keyword search and filters: type, category, location, status, date from, date to, sort, pagination
- Item detail page with the reporter's name, photo, location, date and identifying features
- About, Contact, Privacy and Terms pages

**Signed in**
- Report a lost item or a found item (one form with a type selector), with an optional photo (JPG/PNG/WebP, 3 MB)
- Possible-match alert: after reporting, opposite-type open items with a similar title are shown
- Recovery request on a found item ("Is this yours?"), with a written explanation
- Dashboard: my reports, requests on my items, my requests, recently added on campus
- Approve or reject a request; approving marks the item `recovered` and rejects the competing requests
- Edit or delete my own report, including replacing or removing its photo
- Profile: update name and student ID, change password

**Administrator**
- Statistics: users, lost, found, recovered, pending requests, total reports, reports per category
- Item moderation: change status, delete a listing (its requests and photo go with it), paging
- All recovery requests with approve / reject
- User management: suspend or reactivate an account

---

## Routes (client)

| Route | Page | Access |
|---|---|---|
| `/` | Landing | public |
| `/browse` | Browse and search | public |
| `/login`, `/register` | Authentication | public |
| `/items/:id` | Item detail | public |
| `/report` | Report lost or found | signed in |
| `/items/:id/edit` | Edit own report | owner or admin |
| `/dashboard` | My reports and requests | signed in |
| `/profile` | Account and password | signed in |
| `/admin` | Admin dashboard | admin |
| `/about`, `/contact`, `/privacy`, `/terms` | Information pages | public |
| `*` | Not found | public |

---

## API

Base path `/api`. Every response is `{ success, ... }`.

### Auth — `routes/authRoutes.js`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public (40/hour per IP) | Create an account, returns user + token |
| POST | `/auth/login` | public (60 failed/15 min per IP) | Sign in, returns user + token |
| GET | `/auth/me` | token | Current user |
| POST | `/auth/logout` | token | Acknowledge logout (stateless JWT) |
| PUT | `/auth/profile` | token | Update name and student ID |
| PUT | `/auth/password` | token | Change password (400 if the current one is wrong) |

### Items — `routes/itemRoutes.js`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/items` | public | List with `q`, `type`, `category`, `location`, `status`, `dateFrom`, `dateTo`, `sort`, `page`, `limit` (max 50) |
| GET | `/items/stats` | public | Counts for the landing page |
| GET | `/items/my-reports` | token | Reports created by the caller |
| GET | `/items/:id` | public | One item (UUID validated) |
| POST | `/items` | token + multipart | Create a report, optional `image`, returns `possibleMatches` |
| PUT | `/items/:id` | owner or admin | Update; `image` replaces the photo, `removeImage=true` clears it, `status` is **admin only** |
| DELETE | `/items/:id` | owner or admin | Delete the report, its requests and its photo |

### Recovery requests — `routes/requestRoutes.js` (all require a token)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/requests` | signed in | Submit a request on someone else's open item |
| GET | `/requests/my-requests` | signed in | Requests I made |
| GET | `/requests/received` | signed in | Requests on my reports |
| GET | `/requests/item/:itemId` | owner or admin | Requests for one item |
| GET | `/requests/:id` | requester, owner or admin | One request |
| PUT | `/requests/:id/status` | owner or admin | Approve or reject, in one transaction |

### Admin — `routes/adminRoutes.js` (`protect` + `adminOnly` on every route)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Statistics, reports per category, recent activity |
| GET | `/admin/users` | All users (public fields only) |
| GET | `/admin/items` | All reports, `page` / `limit` |
| GET | `/admin/requests` | All recovery requests |
| PUT | `/admin/users/:id/status` | Suspend or reactivate (cannot target yourself) |
| PUT | `/admin/items/:id/status` | Change an item's status |
| DELETE | `/admin/items/:id` | Remove a listing |

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service and database status; cached for 60 s, `?deep=1` forces a check |

---

## Database

Supabase PostgreSQL, schema **`app_v2`** (created by `server/supabase/schema.sql`).

| Table | Key columns | Rules |
|---|---|---|
| `app_v2.users` | `id` uuid, `name`, `email`, `student_id`, `password_hash`, `role`, `account_status`, `created_at` | `email` unique; name 2-80 chars; `role in ('user','admin')`; `account_status in ('active','suspended')` |
| `app_v2.items` | `id`, `title`, `description`, `category`, `type`, `location`, `event_date`, `identifying_features`, `image_url`, `image_public_id`, `status`, `reported_by`, `created_at`, `updated_at` | `type in ('lost','found')`; `status in ('open','under-review','matched','recovered','closed')`; `reported_by` references `users(id)` on delete cascade |
| `app_v2.recovery_requests` | `id`, `item_id`, `requester_id`, `message`, `status`, `reviewed_by`, `created_at` | `unique (item_id, requester_id)`; `status in ('pending','approved','rejected')`; both foreign keys cascade |

Indexes: `items.type`, `items.status`, `items.category`, `items.event_date desc`, `items.reported_by`,
`recovery_requests.item_id`, `recovery_requests.requester_id`, and a GIN index on
`to_tsvector(title || description)`.

Row Level Security is **enabled on all three tables with no policies**, so the anon key can read
nothing. The server connects with the database role from `DATABASE_URL` and authorises in code
(`protect`, `adminOnly`, ownership checks). Every value is a `$n` placeholder.

---

## Local setup

Requirements: Node 18+, a Supabase project, and (for photos) a public storage bucket.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
# fill .env (see the table below)
npm run migrate           # creates schema app_v2 + 3 tables + indexes
npm run seed              # 1 admin, 1 student, 12 reports
npm run dev               # http://localhost:5000
```

`npm run migrate` is required before `npm run seed`; the seed wipes `app_v2` first, so never run it
against data you want to keep.

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

Two terminals are needed: the API on 5000 and Vite on 5173.

### Environment variables (`server/.env`)

| Variable | Used by | Notes |
|---|---|---|
| `PORT` | `server.js` | 5000 locally, provided by Render in production |
| `DATABASE_URL` | `config/database.js` | Supabase **Session pooler** string (port 5432) |
| `PGSSL` | `config/database.js` | `require` for Supabase; `disable` for a local Postgres |
| `SUPABASE_URL` | `config/storage.js` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `config/storage.js` | Server only. Never ship it to the browser |
| `SUPABASE_BUCKET` | `config/storage.js` | `item-images`, must be a public bucket |
| `JWT_SECRET` | auth | Long random string |
| `JWT_EXPIRES_IN` | auth | e.g. `7d` |
| `CLIENT_URL` | `server.js` | Allowed CORS origin(s), comma separated |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `utils/seed.js` | The admin account created by the seed |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | `utils/seed.js` | The sample student account |

`client/.env` holds one variable: `VITE_API_URL`, which must be `/api` when the frontend is served
by the same Express service.

---

## Deployment (single Render web service)

1. **New → Web Service**, repository `Campus-Lost-And-Found`, branch `main`.
2. **Root Directory:** `server`
3. **Build Command:** `npm install --include=dev && cd ../client && npm install --include=dev && npm run build`
   (`--include=dev` is required because `vite` is a devDependency and `NODE_ENV=production` would skip it.)
4. **Start Command:** `npm start`
5. **Environment:** `DATABASE_URL`, `PGSSL=require`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
   `SUPABASE_BUCKET`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VITE_API_URL=/api`,
   `NODE_ENV=production`
6. **Health Check Path:** `/api/health`

The first deploy must also create the schema. Run it once from your machine against the same
`DATABASE_URL` before (or right after) the first deploy:

```bash
cd server && npm run migrate
```

Without that step every endpoint returns 500 (`relation "app_v2.users" does not exist`) while
`/api/health` still reports 200.

The same service then serves the app at `/` and the API at `/api/*`. Because both share an origin,
no CORS configuration is needed for production traffic.

---

## Testing

`server/postman/Campus_Lost_Found_v2.postman_collection.json` — **30 requests, 40 assertions**,
covering happy paths and the 400 / 401 / 403 / 404 cases. Run it in order: requests 05 and 07 store
the student and admin tokens, 13 stores `itemId`, 21 stores `requestId`.

`TESTING.md` holds the manual checklist: 30 API checks, 35 frontend checks, 4 responsive widths and
7 security checks.

There is no automated test runner in this repository; the Postman collection plus the manual
checklist are the test suite.

---

## Security notes

- Passwords are bcrypt hashes (cost 10) and are never returned by any endpoint.
- JWT in `Authorization: Bearer`; a 401 clears the session, a suspended account is blocked at login
  and on every request.
- All admin routes are guarded server side (`protect` + `adminOnly`); hiding a button is never the
  control.
- Ownership is checked on every item and request write, and approval runs in a single transaction
  with `select ... for update`.
- Uploads: MIME + extension allow-list, 3 MB cap, memory storage, Supabase Storage on the server.
- Rate limits: 40 registrations/hour, 60 failed logins/15 min, 600 API requests/5 min per IP.
- CSP allows images only from `self`, `data:`, `blob:` and `https:` (needed for Supabase-hosted
  photos); `object-src 'none'`, `frame-ancestors 'self'`.

---

## Project structure

```
client/
  src/api/client.js            axios instance, token header, 401 handling
  src/context/AuthContext.jsx  session state
  src/components/              Navbar, Footer, ItemCard, ProtectedRoute, Loader,
                               EmptyState, StatsRow, PasswordInput, Toast
  src/pages/                   Landing, Browse, Login, Register, ReportItem, ItemDetails,
                               EditItem, Dashboard, Profile, Admin, Info, NotFound
server/
  server.js                    helmet CSP, CORS, routers, health, SPA fallback, errors
  config/database.js           pg pool + SELECT-only retry
  config/storage.js            Supabase Storage upload / delete
  controllers/                 auth, item, request, admin
  middleware/                  auth, admin, upload, error
  models/                      User, Item, RecoveryRequest (SQL + toApi mappers)
  routes/                      authRoutes, itemRoutes, requestRoutes, adminRoutes
  supabase/schema.sql          schema, tables, constraints, indexes, RLS
  utils/                       migrate.js, seed.js, validate.js
  postman/                     API collection
TESTING.md                     manual test checklist
```

---

## Known limitations

- No email notifications and no forgot-password flow: no mail provider is configured, and both were
  declared out of scope for the assignment.
- One photo per item; photos are replaced or removed, not collected.
- `GET /api/admin/requests` returns every request; the admin table pages in the browser.
- Search uses `ILIKE`; at tens of thousands of rows this should move to the GIN index.
- The seeded admin password must be changed after the first deployment.
