# Transcript Request and Tracking

SWE2106 E-tivity 5 · Group A · Mbarara University of Science and Technology

Students submit transcript requests and track them by reference. Registrar staff work through a review queue, record decisions and update each request. Both the browser and Postman connect to the same Express API and SQLite database.

[Submission files and group roster](Submission.md) · [Architecture and page design](design/Design.md) · [Interface mockups](design/Mockups.html)

## Group A members

- Byamugisha Alban
- Akisimire Timothy
- Odongo Emmanuel Bilal
- Mumbere Edwin
- Tibamanya Davis
- Asuma Kadde Kevin
- Ocero Brian
- Nsubuga Francis
- Arusio Simon Peter

## Local setup

Use Node.js 22.13 or later. In this directory run:

```bash
npm ci
npm run seed
npm start
```

Open http://127.0.0.1:3002. `npm run seed` adds fictional accounts without clearing existing requests. The database is created at `data/registrar.sqlite`. Keep that file between restarts to retain requests. Use `DB_FILE` to choose a different database file and `PORT` to change the port. Node 22 may emit an experimental SQLite warning.

Open `data/registrar.sqlite` in a SQLite viewer to see the tables. SQLite manages the `-wal` and `-shm` companion files while the database is open. The WAL stores changes before SQLite copies them into the main file. The SHM file helps SQLite coordinate access. The table definitions are in `db.js`.

| Role | Email | Demonstration password |
| --- | --- | --- |
| Student | student@example.test | TranscriptDemo!26 |
| Second student | student2@example.test | TranscriptDemo!26 |
| Registrar staff | registrar@example.test | TranscriptDemo!26 |

## Postman demonstration

1. Import `postman/Transcript_Tracker.postman_collection.json`.
2. Check the collection's `baseUrl` variable. The default is http://127.0.0.1:3002.
3. Run the collection in order. The login requests store bearer tokens and the creation request stores the request reference for subsequent calls.
4. For a short live demo, show requests 04–07, 10, 12–13 and 15–16. Run them in that order. Sign in as Alex Kato in the browser and refresh My requests to show the same request and its history.

The collection includes successful, unauthenticated, unauthorized, invalid, conflicting and cross-account requests. It creates a new fictional request on each run.

## API

Protected endpoints require the bearer token returned by sign-in. The collection stores it automatically. Requests with a body use `Content-Type: application/json`.

| Method and endpoint | Access | Result |
| --- | --- | --- |
| GET /api/health | Public | 200 and database status |
| POST /api/auth/login | Public | 200 and session token, or 400/401/429 |
| GET /api/auth/me | Signed in | 200 and account details |
| POST /api/auth/logout | Signed in | 204 and session revoked |
| GET /api/requests | Signed in | Student's requests or staff queue |
| POST /api/requests | Student | 201 and request reference, or 400 |
| GET /api/requests/:id | Owner or staff | 200 and status history, or 404 |
| PATCH /api/requests/:id/status | Staff | 200, 400, 404 or 409 |

Status flow: Submitted → Under review → Ready or Rejected. Rejection requires a reason. Every status change and history entry are saved in one transaction.

## Project layout

- `server.js` starts the listener.
- `app.js` configures Express and mounts routers.
- `routes/` contains login and transcript request routes.
- `db.js` defines the schema and transaction handling.
- `auth.js` handles password verification, bearer sessions and role checks.
- `public/index.html` is the working page that Express serves. It uses `public/client.js` to send requests to the API.
- `design/Mockups.html` shows the sign-in, student and registrar designs with fixed sample records.
- `postman/` contains the collection and sample requests.

## Demonstration environment

The demo runs on one computer with a persistent SQLite database and fictional accounts. It covers requests, review and status history. Transcript generation, payments and integration with the university student information system are outside the project scope.

The recorded Newman run passed 18 requests and 22 assertions. [Verification results](postman/verified-results.json)
