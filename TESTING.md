# Testing checklist

Run every item below against the running application and tick it off. The Postman collection in
`server/postman/` automates the API half (30 requests, 43 assertions).

## A. API tests (Postman)

Import `Campus_Lost_Found_v2.postman_collection.json`, start the API, run the collection in order.

| # | Request | Expected |
|---|---|---|
| 01 | Health check | 200, status ok |
| 02 | Register | 201, token returned |
| 03 | Register duplicate email | 400 |
| 04 | Register short password | 400 |
| 05 | Login student | 200, token stored |
| 06 | Login wrong password | 401 |
| 07 | Login admin | 200, role admin |
| 08 | Get profile | 200 |
| 09 | Profile without token | 401 |
| 10 | Item stats | 200 |
| 11 | List with filters | 200 |
| 12 | Location filter | 200 |
| 13 | Create item | 201, matches array |
| 14 | Create missing fields | 400 |
| 15 | Create future date | 400 |
| 16 | Get one item | 200 |
| 17 | Malformed id | 400 |
| 18 | Update item | 200, status saved |
| 19 | Invalid status | 400 |
| 20 | My reports | 200 |
| 21 | Submit request | 201 |
| 22 | Duplicate request | 400 |
| 23 | My requests | 200 |
| 24 | Approve request | 200, approved |
| 25 | Item after approval | 200, recovered |
| 26 | Admin dashboard | 200 |
| 27 | Admin route as user | 403 |
| 28 | Admin users | 200 |
| 29 | Admin requests | 200 |
| 30 | Delete item | 200 |

## B. Frontend checks

| # | Check | Expected |
|---|---|---|
| 1 | Landing page | Hero, live statistics from the database, recent lost and found cards, four-step section |
| 2 | Landing statistics | Numbers match `GET /api/items/stats` (not hardcoded) |
| 3 | Browse page | Nine cards, total count, pagination |
| 4 | Search "bottle" | Filtered results |
| 5 | Type filter lost / found | Only that type |
| 6 | Category filter | Only that category |
| 7 | Location filter "Library" | Only Library reports |
| 8 | Status filter | Only that status |
| 9 | Date from / to | Results inside the range |
| 10 | Sort oldest first | Order reverses |
| 11 | Clear filters | Full list returns |
| 12 | Empty state | Searching nonsense shows the empty state, not an error |
| 13 | Register | New account lands on the dashboard |
| 14 | Duplicate registration | Clear error message |
| 15 | Login | Redirects to dashboard (admin goes to /admin) |
| 16 | Wrong password | "Invalid email or password" |
| 17 | Logout | Navbar returns to Login and Register |
| 18 | Protected route | `/dashboard` while logged out redirects to login |
| 19 | Admin route as student | `/admin` redirects to dashboard |
| 20 | Report form validation | Short title, missing category, short description all blocked |
| 21 | Image preview | Choosing a JPG shows the preview |
| 22 | Image too large | 5 MB file rejected before upload |
| 23 | Report submit | Item page opens with the saved values |
| 24 | Duplicate alert | Reporting "Blue water bottle" as found shows a possible match |
| 25 | Recovery request | Another user's found item shows the request form |
| 26 | Own report | No request form, requests list shown instead |
| 27 | Approve request | Item becomes recovered, other requests rejected |
| 28 | Dashboard tabs | Three tabs load their data |
| 29 | Delete own report | Confirmation, then removed from the list |
| 30 | Profile | Name and student ID save; password change works |
| 31 | Admin overview | Six statistics cards and the category chart |
| 32 | Admin items | Status dropdown saves, delete works |
| 33 | Admin requests | All requests listed |
| 34 | Admin users | Suspend and reactivate a user |
| 35 | Suspended user login | 403 with a clear message |

## C. Responsive checks

| Width | Expected |
|---|---|
| 1440 px | Three-column item grid, six-column filter bar |
| 1024 px | Two-column grid, filters wrap to two rows |
| 768 px | Single-column cards, hamburger menu |
| 390 px (mobile) | No horizontal scroll, touch-friendly buttons, forms full width |

## D. Security checks

| # | Check | Expected |
|---|---|---|
| 1 | Request another user's item update | 403 |
| 2 | Request another user's item delete | 403 |
| 3 | Admin route without token | 401 |
| 4 | Admin route as student | 403 |
| 5 | Login 21 times in 15 minutes | 429 rate limit |
| 6 | Password field in any response | never present |
| 7 | `.env` in the repository | absent |
