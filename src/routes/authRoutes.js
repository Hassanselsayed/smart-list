import passport from "passport";

export const registerAuthRoutes = (app) => {
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      successRedirect: "/app",
      failureRedirect: "/login",
    })
  );
};
