# Smart List

## Overview

Smart List is a personal task management web app that lets authenticated users create, edit, complete, and delete to-do items with optional due dates. Each account can hold up to 100 items, and item titles are limited to 70 characters. Items can be viewed as a sortable table, where all task management actions happen, or in a read-only calendar layout for a quick overview of what's due when. The interface supports a persistent light/dark theme toggle, responsive layouts, and user-facing recovery messages when an operation fails. Deleting an item opens a short undo window before the record is permanently removed from the database.

### Languages and Technologies

- **JavaScript (Node.js)** — server runtime, Express framework, Passport.js for Google OAuth
- **SQL (PostgreSQL)** — persistent storage for users and items
- **EJS** — server-rendered HTML templates
- **CSS** — styling, including a monochrome light/dark theme system

## Local Setup

### Prerequisites

- Node.js and npm
- A Supabase project or PostgreSQL database
- A Google Cloud project with OAuth 2.0 credentials

### 1. Install Dependencies

From the project directory, install the Node.js dependencies:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root. Do not commit this file or share its secrets.

```env
SESSION_SECRET=replace-with-a-long-random-string
APP_URL=http://localhost:3000

PG_USER=postgres
PG_HOST=aws-0-us-east-1.pooler.supabase.com
PG_DATABASE=postgres
PG_PASSWORD=your-supabase-password
PG_PORT=6543

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

The application reads these values through `dotenv`. `SESSION_SECRET` signs login sessions, the `PG_*` values configure the PostgreSQL connection, and the Google values configure Passport's OAuth strategy.

For Supabase, use the session pooler host and port from the project dashboard. The session pooler is the correct option for a long-lived Node.js `pg.Client`, while the transaction pooler is intended for short-lived connection patterns.

The connection also needs SSL enabled in the app, so the database client is configured with `ssl: { rejectUnauthorized: false }`.

### 3. Create the Database Tables

If you are using Supabase, create the tables in the Supabase SQL editor. If you are using a local PostgreSQL database, create the database first and then apply the schema below.

```sql
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	google_id TEXT UNIQUE NOT NULL,
	email TEXT,
	name TEXT
);

CREATE TABLE items (
	id SERIAL PRIMARY KEY,
	user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	item VARCHAR(70) NOT NULL,
	due_date DATE,
	completed BOOLEAN NOT NULL DEFAULT FALSE
);
```

Startup connects to the configured database but does not create or alter tables. Apply future schema changes manually in PostgreSQL or Supabase.

### 4. Configure Google OAuth

In Google Cloud Console:

1. Create or select a project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Client ID for a web application.
4. Add this authorized redirect URI:

	`${APP_URL}/auth/google/callback`

5. Copy the generated client ID and client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

The callback URI must match the value configured in Google Cloud and the value used by `src/config/passport.js`. Set `APP_URL` to the deployed app URL in the hosting provider. The login entry point is `/auth/google`, reached through the sign-in page at `/login`.

### 5. Start the Application

Start the server with:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The server initializes the database connection before listening on port `3000`.

## Architecture

Smart List is a **modular monolith** using a **layered Express architecture** with server-side rendering. It has MVC-like separation: route modules act as controllers, EJS templates are views, and PostgreSQL stores the application data. The app uses session-based authentication and UI state rather than a separate frontend API or client-side state framework.

The layers are:

- `index.js` starts the server and database connection; `src/app.js` configures middleware, Passport, and routes.
- Route modules handle HTTP requests; `itemService.js` owns reusable item queries and delayed delete/undo behavior.
- Utilities shape view models and manage session-backed UI state, such as sorting, calendar position, and one-time feedback.
- PostgreSQL stores users and items. EJS templates render the list and calendar views from server-provided data.

For authenticated actions, Express restores the session, Passport resolves the user, the route validates and performs the requested operation, then redirects to `/app` or renders a response. One-time feedback is stored in the session and displayed after the redirect. The sortable list can also request only the table partial and replace it in the browser without a full-page reload.

Google OAuth identifies users by `google_id`; item reads and writes are scoped to the authenticated user's ID. Existing users can sign in normally, while new registrations are blocked once the configured user cap is reached.
