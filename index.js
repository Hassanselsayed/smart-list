import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
// import bcrypt from "bcrypt";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";

const app = express();
const port = 3000;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// Global variables for the app
let userId = 0;
let items = [];
let emptyTitleError = false;
let titleLengthError = false;
let sort = 'id';
let sortDirection = 'ASC';
let view = 'list';
const today = new Date();
let year = today.getFullYear();
let displayedMonth = today.getMonth();
const currentMonth = today.getMonth();
const currentDay = today.getDate();
const itemLength = 30;
const months = ["January", "February", "March", "April", "May", "June", "July",
"August", "September", "October", "November", "December"];

const getData = async () => {
  const dbResult = await db.query(`SELECT * FROM items WHERE user_id = $1 ORDER BY ${sort} ${sortDirection};`, [userId])
  items = dbResult.rows
}


app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/list", async (req, res) => { 
  try {
    await getData();
    res.render("list.ejs", {
      listTitle: "To Do List",
      listItems: items,
      emptyTitleError,
      titleLengthError,
      sort,
      sortDirection,
      view,
      calendar: calcTable(year),
      months,
      displayedMonth,
      currentMonth,
      currentDay,
      year
    });
    emptyTitleError = false;
    titleLengthError = false;
  } catch (err) {
    console.log(err);
  }
});



// Get userId then add to db
app.post("/add", async (req, res) => {
  try {  
    if (req.body.newItem !== '' && req.body.newItem.length <= itemLength) {
      await db.query(
        "INSERT INTO items (user_id, item, due_date) VALUES ($1, $2, $3);",
        [userId, req.body.newItem, req.body.newItemDate]
        // [req.body.newItem, req.body.newItemDate]
      );
    } else if (req.body.newItem.length > itemLength) {
      titleLengthError = true;
    } else {
      emptyTitleError = true;
    }
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/edit", async (req, res) => {
  try {
    if (req.body.updatedItemTitle === '') {
      emptyTitleError = true;
    } else if (req.body.updatedItemTitle.length > itemLength) {
      titleLengthError = true;
    } else if (req.body.updatedItemDate) {
      await db.query(
        "UPDATE items SET item=$1, due_date=$2 WHERE id=$3;",
        [req.body.updatedItemTitle, req.body.updatedItemDate, req.body.updatedItemId]
      );
    } else {
      await db.query(
        "UPDATE items SET item=$1 WHERE id=$2;",
        [req.body.updatedItemTitle, req.body.updatedItemId]
      );
    }
  
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM items WHERE id=$1;",
      [req.body.deleteItemId]
    );
    
  
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/sort", async (req, res) => {
  try {
    sort = sort === req.body.sort ? sort : req.body.sort
    sortDirection = sortDirection === req.body.sortDirection ? sortDirection : req.body.sortDirection
  
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/view", async (req, res) => {
  view = req.body.view;  
  
  res.redirect("/");
});

app.post("/year", async (req, res) => {
  year = req.query.year;
  res.redirect("/");
});

app.post("/month", async (req, res) => {
  if (req.body.month === '12' && req.body.direction === 'next') {
    displayedMonth = 0;
    year++;
  } else if (req.body.month === '-1' && req.body.direction === 'prev') {
    displayedMonth = 11;
    year--;
  } else {
    displayedMonth = +req.body.month;
  }  
  
  res.redirect("/");
});

passport.use(
  "google",
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/list",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  }, async (accessToken, refreshToken, profile, cb) => {
    console.log(profile);
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port} --> http://localhost:${port}`);
});