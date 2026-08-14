import "dotenv/config";
import GoogleStrategy from "passport-google-oauth2";

export const configurePassport = (passport, db) => {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          const email = profile.email || profile.emails?.[0]?.value;
          const result = await db.query("SELECT * FROM users WHERE google_id=$1;", [profile.id]);
          if (result.rows.length === 0) {
            const newUser = await db.query(
              "INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *;",
              [profile.id, email, profile.displayName]
            );
            return cb(null, newUser.rows[0]);
          }

          return cb(null, result.rows[0]);
        } catch (err) {
          return cb(err);
        }
      }
    )
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
};
