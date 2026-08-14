import { db } from "../config/database.js";
import { ensureAuthenticated } from "../middleware/ensureAuthenticated.js";
import {
  clearPendingDeleteNotice,
  getUiState,
  setFlash,
  setPendingDeleteNotice,
} from "../utils/sessionState.js";
import {
  buildListViewModel,
  isValidTitle,
  normalizeSortDirection,
  normalizeSortField,
  normalizeView,
  updateDisplayedMonth,
} from "../utils/listView.js";
import {
  cancelPendingDelete,
  getVisibleUserItems,
  schedulePendingDelete,
} from "../services/itemService.js";

export const registerItemRoutes = (app) => {
  app.post("/add", ensureAuthenticated, async (req, res) => {
    try {
      const uiState = getUiState(req);
      if (isValidTitle(req.body.newItem, uiState)) {
        await db.query("INSERT INTO items (user_id, item, due_date) VALUES ($1, $2, $3);", [
          req.user.id,
          req.body.newItem,
          req.body.newItemDate,
        ]);
        setFlash(req, "success", "✓ Item added");
      }
      res.redirect("/app");
    } catch (err) {
      console.error("Unable to add item:", err);
      setFlash(req, "error", "We couldn't add that item. Check the title and date, then try again.");
      res.redirect("/app");
    }
  });

  app.post("/edit", ensureAuthenticated, async (req, res) => {
    try {
      const uiState = getUiState(req);
      if (!isValidTitle(req.body.updatedItemTitle, uiState)) {
        return res.redirect("/app");
      }

      if (req.body.updatedItemDate) {
        await db.query("UPDATE items SET item=$1, due_date=$2 WHERE id=$3 and user_id=$4;", [
          req.body.updatedItemTitle,
          req.body.updatedItemDate,
          req.body.updatedItemId,
          req.user.id,
        ]);
      } else {
        await db.query("UPDATE items SET item=$1 WHERE id=$2 and user_id=$3;", [
          req.body.updatedItemTitle,
          req.body.updatedItemId,
          req.user.id,
        ]);
      }

      setFlash(req, "success", "✓ Item updated");
      res.redirect("/app");
    } catch (err) {
      console.error("Unable to edit item:", err);
      setFlash(req, "error", "We couldn't update that item. Check the title and date, then try again.");
      res.redirect("/app");
    }
  });

  app.post("/toggle-complete", ensureAuthenticated, async (req, res) => {
    try {
      const itemId = Number(req.body.toggleItemId);
      const completed = req.body.completed === "true";

      if (!Number.isNaN(itemId)) {
        await db.query("UPDATE items SET completed=$1 WHERE id=$2 AND user_id=$3;", [
          completed,
          itemId,
          req.user.id,
        ]);
      }

      req.session.save(() => {
        res.redirect("/app");
      });
    } catch (err) {
      console.error("Unable to toggle item completion:", err);
      setFlash(req, "error", "We couldn't update the item's status. Please try again.");
      res.redirect("/app");
    }
  });

  app.post("/delete", ensureAuthenticated, async (req, res) => {
    try {
      const itemId = Number(req.body.deleteItemId);
      const itemResult = await db.query("SELECT item FROM items WHERE id=$1 AND user_id=$2;", [
        itemId,
        req.user.id,
      ]);

      if (itemResult.rows[0]) {
        schedulePendingDelete(req, itemId, req.user.id);
        setPendingDeleteNotice(req, itemId, itemResult.rows[0].item);
      }

      req.session.save(() => {
        res.redirect("/app");
      });
    } catch (err) {
      console.error("Unable to delete item:", err);
      setFlash(req, "error", "We couldn't delete that item. Please try again.");
      res.redirect("/app");
    }
  });

  app.get("/undo-delete", ensureAuthenticated, (req, res) => {
    const itemId = Number(req.query.itemId);

    if (!Number.isNaN(itemId)) {
      cancelPendingDelete(req, itemId);
      clearPendingDeleteNotice(req, itemId);
    }

    req.session.save(() => {
      res.redirect("/app");
    });
  });

  app.post("/sort", ensureAuthenticated, async (req, res) => {
    try {
      const uiState = getUiState(req);
      uiState.sort = normalizeSortField(req.body.sort, uiState.sort);
      uiState.sortDirection = normalizeSortDirection(
        (req.body.sortDirection || "").toUpperCase(),
        uiState.sortDirection
      );

      const isAjaxRequest = req.get("X-Requested-With") === "fetch";
      if (isAjaxRequest) {
        const items = await getVisibleUserItems(req, req.user.id, uiState.sort, uiState.sortDirection);
        const viewModel = buildListViewModel(items, uiState);

        return res.render("partials/list-table.ejs", viewModel, (renderErr, html) => {
          if (renderErr) {
            console.error("Unable to render sorted list:", renderErr);
            return res.status(500).json({ error: "Unable to render sorted list." });
          }

          return res.json({ html });
        });
      }

      res.redirect("/app");
    } catch (err) {
      console.error("Unable to sort items:", err);
      if (req.get("X-Requested-With") === "fetch") {
        return res.status(500).json({ error: "Sorting failed." });
      }
      setFlash(req, "error", "We couldn't sort your items. Please try again.");
      res.redirect("/app");
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

  app.post("/logout", ensureAuthenticated, (req, res, next) => {
    req.logout((logoutErr) => {
      if (logoutErr) {
        return next(logoutErr);
      }

      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          return next(sessionErr);
        }

        res.clearCookie("connect.sid", { path: "/" });
        return res.redirect("/?loggedOut=1");
      });
    });
  });
};
