import { db } from "../config/database.js";
import { DELETE_UNDO_WINDOW_MS } from "../config/constants.js";
import { clearPendingDeleteNotice } from "../utils/sessionState.js";

const pendingDeleteTimers = new Map();

const normalizeSortFieldForQuery = (sortField) => {
  if (sortField === "title") {
    return "item";
  }

  return sortField;
};

const normalizeSortDirectionForQuery = (sortDirection) => {
  const direction = sortDirection?.toUpperCase();
  return direction === "DESC" ? "DESC" : "ASC";
};

export const buildItemOrderByClause = (sortField, sortDirection) => {
  const normalizedSortField = normalizeSortFieldForQuery(sortField);
  const normalizedSortDirection = normalizeSortDirectionForQuery(sortDirection);

  return `ORDER BY ${normalizedSortField} ${normalizedSortDirection}, completed ASC, id ASC`;
};

export const getUserItems = async (userId, sort, sortDirection) => {
  const dbResult = await db.query(
    `SELECT * FROM items WHERE user_id = $1 ${buildItemOrderByClause(sort, sortDirection)};`,
    [userId]
  );
  return dbResult.rows;
};

export const getVisibleUserItems = async (req, userId, sort, sortDirection) => {
  const items = await getUserItems(userId, sort, sortDirection);
  const pendingDeleteIds = new Set((req.session.pendingDeletes || []).map((entry) => entry.itemId));
  return items.filter((item) => !pendingDeleteIds.has(item.id));
};

export const schedulePendingDelete = (req, itemId, userId) => {
  const pendingDeletes = req.session.pendingDeletes || [];
  if (pendingDeletes.some((entry) => entry.itemId === itemId)) {
    return;
  }

  const timerKey = `${userId}:${itemId}`;
  const timeout = setTimeout(() => {
    db.query("DELETE FROM items WHERE id=$1 AND user_id=$2;", [itemId, userId]).catch((err) => {
      console.error("Unable to finish pending item deletion:", err);
      req.session.pendingDeletes = (req.session.pendingDeletes || []).filter(
        (entry) => entry.itemId !== itemId
      );
      clearPendingDeleteNotice(req, itemId);
      req.session.flash = {
        type: "error",
        message: "We couldn't delete that item. It has been restored to your list.",
      };
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Unable to save failed delete recovery:", saveErr);
        }
      });
    });

    pendingDeleteTimers.delete(timerKey);
    req.session.pendingDeletes = (req.session.pendingDeletes || []).filter((entry) => entry.itemId !== itemId);
    clearPendingDeleteNotice(req, itemId);
  }, DELETE_UNDO_WINDOW_MS);

  pendingDeleteTimers.set(timerKey, timeout);
  req.session.pendingDeletes = [...pendingDeletes, { itemId }];
};

export const cancelPendingDelete = (req, itemId) => {
  const timerKey = `${req.user.id}:${itemId}`;
  const timer = pendingDeleteTimers.get(timerKey);

  if (timer) {
    clearTimeout(timer);
    pendingDeleteTimers.delete(timerKey);
  }

  req.session.pendingDeletes = (req.session.pendingDeletes || []).filter((entry) => entry.itemId !== itemId);
  clearPendingDeleteNotice(req, itemId);
};
