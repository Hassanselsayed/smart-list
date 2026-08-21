import { ensureAuthenticated } from "../middleware/ensureAuthenticated.js";
import { getUiState } from "../utils/sessionState.js";
import { buildListViewModel } from "../utils/listView.js";
import { getVisibleUserItems } from "../services/itemService.js";

const renderListPage = async (req, res) => {
  try {
    const uiState = getUiState(req);
    const items = await getVisibleUserItems(req, req.user.id, uiState.sort, uiState.sortDirection);
    res.render("list.ejs", buildListViewModel(items, uiState));
  } catch (err) {
    console.error("Unable to load app page:", err);
    res.status(500).render("error.ejs", {
      title: "Unable to load your list",
      message: "We couldn't load your items right now. Please try again.",
      retryUrl: "/app",
    });
  }
};

export const registerPageRoutes = (app) => {
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

  app.get("/app", ensureAuthenticated, renderListPage);
};
