# Smart List

## Overview

Smart List is a personal task management web app that lets authenticated users create, edit, complete, and delete to-do items with optional due dates. Items can be viewed as a sortable table, where all task management actions happen, or in a read-only calendar layout for a quick overview of what's due when. The interface supports a persistent light/dark theme toggle, responsive layouts, and user-facing recovery messages when an operation fails. Deleting an item opens a short undo window before the record is permanently removed from the database.

### Languages and Technologies

- **JavaScript (Node.js)** — server runtime, Express framework, Passport.js for Google OAuth
- **SQL (PostgreSQL)** — persistent storage for users and items
- **EJS** — server-rendered HTML templates
- **CSS** — styling, including a monochrome light/dark theme system

## Local Setup

### Prerequisites

- Node.js and npm
- PostgreSQL
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

PG_USER=your-postgres-user
PG_HOST=localhost
PG_DATABASE=smart_list
PG_PASSWORD=your-postgres-password
PG_PORT=5432

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

The application reads these values through `dotenv`. `SESSION_SECRET` signs login sessions, the `PG_*` values configure the PostgreSQL connection, and the Google values configure Passport's OAuth strategy.

### 3. Create the PostgreSQL Database

Create the database named in `PG_DATABASE`, for example:

```bash
createdb smart_list
```

Alternatively, create it from a PostgreSQL client:

```sql
CREATE DATABASE smart_list;
```

The application connects to this database during startup and creates the `users` and `items` tables if they do not already exist. No separate schema migration command is required for local development.

### 4. Configure Google OAuth

In Google Cloud Console:

1. Create or select a project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Client ID for a web application.
4. Add this authorized redirect URI:

	`http://localhost:3000/auth/google/callback`

5. Copy the generated client ID and client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

The callback URI must match the value configured in Google Cloud and the value used by `src/config/passport.js`. The login entry point is `/auth/google`, reached through the sign-in page at `/login`.

### 5. Start the Application

Start the server with:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The server initializes the database connection before listening on port `3000`.

### Design Evolution

The original version of the app was a single-file Express server — all routing, database queries, session logic, and view-model shaping lived in one file. It worked, but any change risked touching unrelated logic, and it was difficult to reason about where a given behavior actually lived.

The refactored version breaks that monolith into a layered architecture:

- A thin **index.js** bootstrap that only starts the server and initializes the database
- A **composition layer** (`src/app.js`) that wires middleware, Passport, and routes
- Dedicated **route files** that handle HTTP endpoints and delegate to services/utilities
- A **service layer** (`itemService.js`) for item queries and delete-timer behavior
- **Utility modules** for view-model shaping and session state management
- **EJS partials** split so the sort re-render can return only the table fragment, enabling async updates without a full page refresh

The net result is that each file has a clear, single responsibility — routes stay thin, business logic is testable in isolation, and adding new behavior no longer means hunting through hundreds of lines in one place.

---

## Application Design and Architecture

### 1. Architectural Style
The app uses a layered Express architecture with separation by responsibility:

- Entry/bootstrap layer: starts the server and DB initialization
- Composition layer: wires middleware, passport, and routes
- Route layer: defines HTTP endpoints and request orchestration
- Service layer: handles item-related business operations and DB interaction patterns
- Utility layer: contains pure-ish helpers for view model shaping and session state helpers
- View layer: EJS templates render server-provided view models

This keeps route handlers thin, pushes reusable logic out of controllers, and prevents the old single-file coupling.

### 2. Project Structure and Ownership
High-level structure and ownership:

- index.js
	- App bootstrap only (start server, initialize DB)
- src/app.js
	- App assembly: Express middleware, Passport setup, route registration
- src/config/
	- constants.js: shared constants and UI defaults
	- database.js: Postgres client and schema bootstrap
	- passport.js: Google strategy, serialize/deserialize logic
- src/middleware/
	- ensureAuthenticated.js: route guard
	- sessionLocals.js: response locals (auth state, current path, flash, toast, delete notice)
- src/routes/
	- authRoutes.js: OAuth endpoints
	- pageRoutes.js: home/login/app page rendering routes
	- itemRoutes.js: add/edit/complete/delete/sort/view/month/year/logout flows, including AJAX sort responses
- src/services/
	- itemService.js: item fetch filtering and delayed delete/undo timer behavior
- src/utils/
	- listView.js: normalization, title preview shaping, list view-model construction
	- sessionState.js: UI session state and flash/pending-notice helpers
- views/
	- EJS templates and partials for list/calendar/home/login
	- list partials split so list sorting can return just table HTML (`partials/list-table.ejs`)
- public/
	- static assets (CSS, icons), including monochrome light/dark theme styling

### 3. Runtime Request Flow
Typical request flow for authenticated app actions:

1. Browser sends request to route endpoint
2. Middleware runs in order:
	 - session middleware
	 - Passport session restoration
	 - locals hydration middleware
3. Route handler validates/normalizes input
4. Route delegates to service/utility logic and DB operations
5. Route updates session-scoped UI state if needed
6. Response redirects or renders EJS with a composed view model

Note on sorting flow:

- List sorting can run in two modes:
	- Standard form submit: `POST /sort` then redirect to `/app`
	- Async mode: `fetch` posts to `POST /sort` with `X-Requested-With: fetch`, server returns JSON containing rendered list-table HTML, and the client swaps only the table section

### 4. Data Flow and State Model
The app has two main state domains:

- Persistent DB state (PostgreSQL)
	- users: identity/auth linkage (`google_id`, user profile fields)
	- items: task records (`user_id`, item text, due date, completion state)
- Session/UI state (per user session)
	- sort/view preferences
	- calendar month/year position
	- one-time flash feedback
	- pending delete notice and temporary delete window metadata
	- current request path in locals for contextual header controls

Design intent:

- Business data lives in Postgres
- UI interaction state lives in session
- View templates only consume already-shaped data (minimal template logic)

### 5. Authentication and Authorization Flow

1. User enters OAuth route
2. Google callback returns profile
3. Passport strategy resolves app user (find by `google_id`, insert if missing)
4. Passport serializes `user.id` into session
5. Protected routes use `ensureAuthenticated` guard
6. Item queries and writes are always constrained by `user_id`

Entry-point behavior:

- `/` is the landing page (no direct OAuth button)
- `/login` is the dedicated sign-in page (Continue with Google)
- Header shows Sign In only when unauthenticated and not already on `/login`
- Header shows Log Out when authenticated

### 6. Item Lifecycle Logic

- Add/Edit: validate non-empty title, persist, flash success
- Complete toggle: update `completed` boolean, keep item in place
- Delete: soft-remove from current UI via session pending-delete state, show undo notice, then hard-delete after timeout if not undone
- Delete failure: restore the item to the visible list and show an explanatory flash message on the next request
- Undo delete: cancel timer and restore item visibility before DB delete executes

### 7. View-Model Strategy
Before render, list items are transformed into a display model:

- full text is always shown in the list view (no truncation)
- `titlePreview` derived for truncated calendar display, with a hover/focus tooltip shown only when the title is actually truncated
- list/calendar view receives normalized state fields for consistent rendering
- On narrow screens, calendar items become interactive dots that reveal the full item in a tooltip; larger screens retain compact truncated text

This avoids calling shared JS helpers directly from EJS templates and reduces runtime template errors.

The list view now uses partial composition:

- `partials/list-view.ejs` contains sort controls and client-side async sort script
- `partials/list-table.ejs` contains table/error markup and is reusable for both full render and async sort responses

This keeps sort re-render logic server-driven while avoiding full page refreshes.

### 8. UX and Accessibility Updates
Recent UI updates include:

- Monochrome light/dark theme system with persisted preference and header mode toggle
- Contextual header actions (Sign In/Log Out) tied to auth state and route
- Improved form/control accessibility: descriptive labels, aria labels for icon-only actions, and hidden labels for form inputs
- Completed item styling that strikes only task titles while preserving readability of metadata/actions
- Calendar view is read-only: items show status and truncated titles only, with all completing/editing/deleting handled from the list view
- Layout boxes (view toggle, add-item form, sort controls, list table) now match the header's width at every screen size
- Landing page copy explains the list-first management workflow and calendar overview
- Route and rendering failures provide user-facing recovery guidance while technical details remain server-side
- Styles use `rem` for scalable dimensions, with `px` reserved for borders, shadows, and accessibility helpers

### 9. Refactor Outcome
The refactor moves from a monolithic controller to cohesive modules with single responsibilities, making the codebase easier to test, debug, and extend while preserving current runtime behavior.
