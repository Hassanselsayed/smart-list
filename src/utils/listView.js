import calcTable from "../../calendar-config.js";
import {
  ALLOWED_SORT_DIRECTIONS,
  ALLOWED_SORT_FIELDS,
  ALLOWED_VIEWS,
  ITEM_TITLE_MAX_LENGTH,
  MONTHS,
  TITLE_PREVIEW_LENGTH,
} from "../config/constants.js";

export const normalizeSortField = (sortField, currentSort) => {
  if (sortField === "title") {
    return "item";
  }

  if (ALLOWED_SORT_FIELDS.has(sortField)) {
    return sortField;
  }

  return currentSort;
};

export const normalizeSortDirection = (direction, currentDirection) => {
  if (ALLOWED_SORT_DIRECTIONS.has(direction)) {
    return direction;
  }
  return currentDirection;
};

export const normalizeView = (nextView, currentView) => {
  if (ALLOWED_VIEWS.has(nextView)) {
    return nextView;
  }
  return currentView;
};

export const isValidTitle = (title) => {
  if (title === "") {
    return "Cannot add an empty item.";
  }
  
  if (title.length > ITEM_TITLE_MAX_LENGTH) {
    return `Item length cannot exceed ${ITEM_TITLE_MAX_LENGTH} characters.`;
  }

  return null;
};

export const truncateTitle = (title) => {
  if (!title) {
    return "";
  }

  if (title.length <= TITLE_PREVIEW_LENGTH) {
    return title;
  }

  return `${title.slice(0, TITLE_PREVIEW_LENGTH)}...`;
};

const formatDateAsIso = (date) => {
  if (!date) {
    return "";
  }

  if (typeof date === "string") {
    return date.slice(0, 10);
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const buildListViewModel = (items, uiState) => ({
  listTitle: "To Do List",
  listItems: items.map((item) => ({
    ...item,
    dueDateIso: formatDateAsIso(item.due_date),
    titlePreview: truncateTitle(item.item),
  })),
  sort: uiState.sort,
  sortDirection: uiState.sortDirection,
  view: uiState.view,
  calendar: calcTable(uiState.year),
  months: MONTHS,
  displayedMonth: uiState.displayedMonth,
  currentMonth: new Date().getMonth(),
  currentDay: new Date().getDate(),
  year: uiState.year,
  maxLength: ITEM_TITLE_MAX_LENGTH
});

export const updateDisplayedMonth = (uiState, month, direction) => {
  if (month === 12 && direction === "next") {
    uiState.displayedMonth = 0;
    uiState.year += 1;
    return;
  }

  if (month === -1 && direction === "prev") {
    uiState.displayedMonth = 11;
    uiState.year -= 1;
    return;
  }

  uiState.displayedMonth = month;
};

export const getTitleMaxLength = () => ITEM_TITLE_MAX_LENGTH;
