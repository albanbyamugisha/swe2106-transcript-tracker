# Transcript Request and Tracking

SWE2106 E-tivity 5. Students submit and track transcript requests. Registrar staff review requests, record decisions, and update the status. The browser and Postman use the same Express API and SQLite database.

## Local setup

Use Node.js 22.13 or later. In this directory run:

```bash
npm ci
npm run seed
npm start
```

Open http://127.0.0.1:3002. `npm run seed` adds fictional accounts without clearing existing requests. The database is created at `data/registrar.sqlite`. Keep that file between restarts to retain requests. Use `DB_FILE` to choose a different database file and `PORT` to change the port. Node 22 may emit an experimental SQLite warning.

| Role | Email | Demonstration password |
| --- | --- | --- |
| Student | student@example.test | TranscriptDemo!26 |
| Second student | student2@example.test | TranscriptDemo!26 |
| Registrar staff | registrar@example.test | TranscriptDemo!26 |

## Postman demonstration

1. Import `postman/Transcript_Tracker.postman_collection.json`.
2. Check the collection's `baseUrl` variable. The default is http://127.0.0.1:3002.
3. Run the collection in order. The login requests store bearer tokens and the creation request stores the request reference for subsequent calls.
4. For a short live demo, show requests 04–07, 10, 12–13 and 15–16. Run them in that order. Sign in as Alex Kato in the browser and refresh the queue to show the same request and its history.

The collection includes successful, unauthenticated, unauthorized, invalid, conflicting and cross-account requests. It creates a new fictional request on each run.

## API

All protected endpoints require `Authorization: Bearer <token>`. Write requests use `Content-Type: application/json`.

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
- `public/` contains the browser interface.
- `postman/` contains the collection and sample requests.

## Demonstration boundary

This implementation runs with a live local database and fictional accounts. Before any university deployment, replace demonstration accounts, configure HTTPS and persistent hosting, and agree on university identity, access, data retention and backup requirements. The project does not generate transcripts or collect payments. Confirm with the lecturer if “live database” requires remote hosting. The repository must contain genuine contributor pull requests where the team requirement applies.
