import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import calcTable from "./calendar-config.js";

const app = express();
const port = 3000;
env.config();

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ITEM_TITLE_MAX_LENGTH = 30;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const ALLOWED_SORT_FIELDS = new Set(["id", "item", "due_date"]);
const ALLOWED_SORT_DIRECTIONS = new Set(["ASC", "DESC"]);
const ALLOWED_VIEWS = new Set(["list", "calendar"]);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated?.() || false;
  next();
});

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

const today = new Date();
const DEFAULT_UI_STATE = {
  emptyTitleError: false,
  titleLengthError: false,
  sort: "id",
  sortDirection: "ASC",
  view: "list",
  year: today.getFullYear(),
  displayedMonth: today.getMonth(),
};
const currentMonth = today.getMonth();
const currentDay = today.getDate();

const getUiState = (req) => {
  if (!req.session.uiState) {
    req.session.uiState = { ...DEFAULT_UI_STATE };
  }
  return req.session.uiState;
};

const getUserItems = async (userId, sort, sortDirection) => {
  const dbResult = await db.query(
    `SELECT * FROM items WHERE user_id = $1 ORDER BY ${sort} ${sortDirection};`,
    [userId]
  );
  return dbResult.rows;
};

const normalizeSortField = (sortField, currentSort) => {
  if (ALLOWED_SORT_FIELDS.has(sortField)) {
    return sortField;
  }
  return currentSort;
};

const normalizeSortDirection = (direction, currentDirection) => {
  if (ALLOWED_SORT_DIRECTIONS.has(direction)) {
    return direction;
  }
  return currentDirection;
};

const normalizeView = (nextView, currentView) => {
  if (ALLOWED_VIEWS.has(nextView)) {
    return nextView;
  }
  return currentView;
};

const isValidTitle = (title, uiState) => {
  if (title === "") {
    uiState.emptyTitleError = true;
    uiState.titleLengthError = false;
    return false;
  }

  if (title.length > ITEM_TITLE_MAX_LENGTH) {
    uiState.titleLengthError = true;
    uiState.emptyTitleError = false;
    return false;
  }

  uiState.emptyTitleError = false;
  uiState.titleLengthError = false;
  return true;
};

const buildListViewModel = (items, uiState) => ({
  listTitle: "To Do List",
  listItems: items,
  emptyTitleError: uiState.emptyTitleError,
  titleLengthError: uiState.titleLengthError,
  sort: uiState.sort,
  sortDirection: uiState.sortDirection,
  view: uiState.view,
  calendar: calcTable(uiState.year),
  months: MONTHS,
  displayedMonth: uiState.displayedMonth,
  currentMonth,
  currentDay,
  year: uiState.year,
});

const updateDisplayedMonth = (uiState, month, direction) => {
  if (month === 12 && direction === "next") {
    uiState.displayedMonth = 0;
    uiState.year += 1;
    return;
  }

  if (month === -1 && direction === "prev") {
    uiState.displayedMonth = 11;
    uiState.year -= 1;
    return;
  }

  uiState.displayedMonth = month;
};

const renderListPage = async (req, res) => {
  try {
    const uiState = getUiState(req);
    const items = await getUserItems(req.user.id, uiState.sort, uiState.sortDirection);
    res.render("list.ejs", buildListViewModel(items, uiState));
    uiState.emptyTitleError = false;
    uiState.titleLengthError = false;
  } catch (err) {
    console.log(err);
  }
};

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect("/login");
};


app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/app");
  }
  return res.render("home.ejs");
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/app");
  }
  return res.render("login.ejs");
});

app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"]
  })
);

app.get("/auth/google/callback", passport.authenticate("google", {
  successRedirect: "/app",
  failureRedirect: "/login"
  })
);

app.get("/app", ensureAuthenticated, renderListPage);

// Add item
app.post("/add", ensureAuthenticated, async (req, res) => {
  try {  
    const uiState = getUiState(req);
    if (isValidTitle(req.body.newItem, uiState)) {
      await db.query(
        "INSERT INTO items (user_id, item, due_date) VALUES ($1, $2, $3);",
        [req.user.id, req.body.newItem, req.body.newItemDate]
      );
    }
    res.redirect("/app");
  } catch (err) {
    console.log(err);
  }
});

app.post("/edit", ensureAuthenticated, async (req, res) => {
  try {
    const uiState = getUiState(req);
    if (!isValidTitle(req.body.updatedItemTitle, uiState)) {
      return res.redirect("/app");
    }

    if (req.body.updatedItemDate) {
      await db.query(
        "UPDATE items SET item=$1, due_date=$2 WHERE id=$3 and user_id=$4;",
        [req.body.updatedItemTitle, req.body.updatedItemDate, req.body.updatedItemId, req.user.id]
      );
    } else {
      await db.query(
        "UPDATE items SET item=$1 WHERE id=$2 and user_id=$3;",
        [req.body.updatedItemTitle, req.body.updatedItemId, req.user.id]
      );
    }
  
    res.redirect("/app");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", ensureAuthenticated, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM items WHERE id=$1 and user_id=$2;",
      [req.body.deleteItemId, req.user.id]
    );
    
  
    res.redirect("/app");
  } catch (err) {
    console.log(err);
  }
});

app.post("/sort", ensureAuthenticated, async (req, res) => {
  try {
    const uiState = getUiState(req);
    uiState.sort = normalizeSortField(req.body.sort, uiState.sort);
    uiState.sortDirection = normalizeSortDirection(
      (req.body.sortDirection || "").toUpperCase(),
      uiState.sortDirection
    );
  
    res.redirect("/app");
  } catch (err) {
    console.log(err);
  }
});

app.post("/view", ensureAuthenticated, async (req, res) => {
  const uiState = getUiState(req);
  uiState.view = normalizeView(req.body.view, uiState.view);
  
  res.redirect("/app");
});

app.post("/year", ensureAuthenticated, async (req, res) => {
  const uiState = getUiState(req);
  const requestedYear = Number(req.body.year ?? req.query.year);
  if (!Number.isNaN(requestedYear)) {
    uiState.year = requestedYear;
  }
  res.redirect("/app");
});

app.post("/month", ensureAuthenticated, async (req, res) => {
  const uiState = getUiState(req);
  const nextMonth = Number(req.body.month);
  if (!Number.isNaN(nextMonth)) {
    updateDisplayedMonth(uiState, nextMonth, req.body.direction);
  }
  
  res.redirect("/app");
});

app.post('/logout', ensureAuthenticated, (req, res, next) => {
  req.logout((logoutErr) => {
    if (logoutErr) {
      return next(logoutErr);
    }

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        return next(sessionErr);
      }

      res.clearCookie('connect.sid', { path: '/' });
      return res.redirect('/');
    });
  });
});


passport.use(
  "google",
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  }, async (accessToken, refreshToken, profile, cb) => {
    try {
      const email = profile.email || profile.emails?.[0]?.value;
      const result = await db.query("SELECT * FROM users WHERE google_id=$1;", [profile.id]);
      if (result.rows.length === 0) {
        const newUser = await db.query(
          "INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *;",
          [profile.id, email, profile.displayName]
        );
        return cb(null, newUser.rows[0]);
      } else {
        // existing user
        return cb(null, result.rows[0]);
      }
    } catch (err) {
      cb(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (userId, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1;", [userId]);
    if (result.rows.length === 0) {
      return cb(null, false);
    }
    return cb(null, result.rows[0]);
  } catch (err) {
    return cb(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port} --> http://localhost:${port}`);
});