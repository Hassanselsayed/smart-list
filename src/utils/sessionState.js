import { DEFAULT_UI_STATE } from "../config/constants.js";

export const getUiState = (req) => {
  if (!req.session.uiState) {
    req.session.uiState = { ...DEFAULT_UI_STATE };
  }
  return req.session.uiState;
};

export const setFlash = (req, type, message) => {
  req.session.flash = { type, message };
};

export const setPendingDeleteNotice = (req, itemId, title) => {
  req.session.pendingDeleteNotice = { itemId, title };
};

export const clearPendingDeleteNotice = (req, itemId) => {
  if (req.session.pendingDeleteNotice?.itemId === itemId) {
    delete req.session.pendingDeleteNotice;
  }
};
