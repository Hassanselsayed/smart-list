import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { SESSION_MAX_AGE_MS } from "./config/constants.js";
import { db } from "./config/database.js";
import { configurePassport } from "./config/passport.js";
import { sessionLocals } from "./middleware/sessionLocals.js";
import { registerAuthRoutes } from "./routes/authRoutes.js";
import { registerItemRoutes } from "./routes/itemRoutes.js";
import { registerPageRoutes } from "./routes/pageRoutes.js";

export const createApp = () => {
  const app = express();
  app.set("trust proxy", 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: SESSION_MAX_AGE_MS,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static("public"));

  configurePassport(passport, db);
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(sessionLocals);

  registerAuthRoutes(app);
  registerPageRoutes(app);
  registerItemRoutes(app);

  return app;
};
