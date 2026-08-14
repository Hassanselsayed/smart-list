const now = new Date();

export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const ITEM_TITLE_MAX_LENGTH = 30;
export const DELETE_UNDO_WINDOW_MS = 3000;
export const TITLE_PREVIEW_LENGTH = 30;
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const ALLOWED_SORT_FIELDS = new Set(["id", "item", "due_date"]);
export const ALLOWED_SORT_DIRECTIONS = new Set(["ASC", "DESC"]);
export const ALLOWED_VIEWS = new Set(["list", "calendar"]);
export const DEFAULT_UI_STATE = {
  emptyTitleError: false,
  titleLengthError: false,
  sort: "id",
  sortDirection: "ASC",
  view: "list",
  year: now.getFullYear(),
  displayedMonth: now.getMonth(),
};
