import passport from "passport";

export const registerAuthRoutes = (app) => {
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "consent",
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
