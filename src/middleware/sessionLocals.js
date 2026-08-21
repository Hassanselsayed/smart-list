export const sessionLocals = (req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.flash = req.session.flash;
  if (req.session.flash) {
    delete req.session.flash;
  }
  res.locals.pendingDeleteNotice = req.session.pendingDeleteNotice;
  res.locals.toastMessage = req.query.loggedOut === "1" ? "You have been logged out." : null;
  res.locals.currentPath = req.path;
  next();
};
