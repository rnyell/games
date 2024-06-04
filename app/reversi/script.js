"use strict";

import {
  log,
  dir,
  createDOMElement,
  getDOMElementById,
  queryDOMElement,
  addEventListener,
} from "../lib/dom.js";

const main = queryDOMElement("main");
const audio = queryDOMElement("audio");
const menuBtn = queryDOMElement(".menu-btn");
const player1Avater = getDOMElementById("player1-avatar");
const player2Avater = getDOMElementById("player2-avatar");

const menuContainer = queryDOMElement("aside");
const setting = queryDOMElement(".setting");
const settingItems = queryDOMElement(".setting-items");
const coordsCheckbox = getDOMElementById("coords");
const possibleMovesCheckbox = getDOMElementById("possible-moves");
const soundEffectCheckbox = getDOMElementById("sounds");
const rules = queryDOMElement(".rules");
const explanation = queryDOMElement(".explanation");

const themes = queryDOMElement(".themes");
const themesContainer = queryDOMElement(".themes-container");
const themeCheckbox = getDOMElementById("theme-mode");
const themeInputs = document.querySelectorAll('.colors [type="radio"]');

const whiteDiscs = queryDOMElement(".white-discs");
const blackDiscs = queryDOMElement(".black-discs");
const board = queryDOMElement(".board");
const boardWrap = queryDOMElement(".board-wrap");
const topCoords = queryDOMElement(".top-coords");
const leftCoords = queryDOMElement(".left-coords");

const resetBtn = queryDOMElement(".reset-btn");

const modal = queryDOMElement(".modal");
const backdrop = queryDOMElement(".backdrop");
const winner = queryDOMElement(".winner");
const rematchBtn = queryDOMElement(".rematch-btn");
const okBtn = queryDOMElement(".ok-btn");
const turn = queryDOMElement(".turn");

const SIZE = 8;
const positions = [];
let squareElements = new Map();
let isWhiteTurn = false;
// clockwise dir; [dx, dy, dn]
const directions = [
  [-1, 0, -8],
  [-1, 1, -7],
  [0, 1, 1],
  [1, 1, 9],
  [1, 0, 8],
  [1, -1, 7],
  [0, -1, -1],
  [-1, -1, -9],
];

// TODO
// const doesUserPreferDarkMode = matchMedia("(prefers-color-scheme: dark)").matches

let userPreferences = {};

const defaultPreferences = {
  isPossibleMovesEnabled: true,
  isSoundEffectEnabled: true,
  userSelectedTheme: "light",
  userSelectedColors: "default-colors",
  // userSelectedTheme: doesUserPreferDarkMode ? "dark" : "light",
  // userSelectedColors: doesUserPreferDarkMode ? "dark-teal" : "default-colors"
};

const userStorage = JSON.parse(localStorage.getItem("userPreferences"));

if (userStorage === null) {
  userPreferences = { ...defaultPreferences };
} else {
  userPreferences = userStorage;
}

function initBoard() {
  let uid = 0;

  for (let i = 0; i < 8; i++) {
    positions[i] = Array(8).fill(null);
  }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = createDOMElement("div");
      square.className = "square";
      square.id = uid;
      board.append(square);
      const prop = { row, col, color: null };
      squareElements.set(square, prop);
      uid++;

      if ((row === 3 && col === 3) || (row === 4 && col === 4)) {
        updatePositions(row, col, "wht");
        setDiscColor(square, "wht");
        const disc = createDOMElement("div");
        disc.className = "disc wht";
        square.append(disc);
      } else if ((row === 3 && col === 4) || (row === 4 && col === 3)) {
        updatePositions(row, col, "blk");
        setDiscColor(square, "blk");
        const disc = createDOMElement("div");
        disc.className = "disc blk";
        square.append(disc);
      }
    }
  }

  if (userPreferences.isPossibleMovesEnabled) {
    showPossibleMoves("blk");
  }
}

function switchTurn() {
  isWhiteTurn = !isWhiteTurn;
  if (isWhiteTurn) {
    turn.innerText = "White's Turn";
  } else {
    turn.innerText = "Black's Turn";
  }
}

//* may be it's better to mix addDisc & setDisc & updatePositions in one function

function updatePositions(row, col, color) {
  positions[row][col] = color;
}

function addDisc(square) {
  //! has a delay, ~120ms
  if (userPreferences.isSoundEffectEnabled) {
    audio.play();
  }

  removeHelperDot(square);
  const disc = createDOMElement("div");
  disc.className = `disc ${isWhiteTurn ? "wht" : "blk"}`;
  square.append(disc);
}

function setDiscColor(square, color) {
  squareElements.get(square).color = color;
}

function updateDiscsColor(id, color) {
  const square = getDOMElementById(`${id}`);
  const disc = square.firstElementChild;
  setDiscColor(square, color);

  if (color === "blk") {
    disc?.classList.remove("wht");
  } else if (color === "wht") {
    disc?.classList.remove("blk");
  }

  disc.classList.add(color);
  disc.animate(
    {
      rotate: "y 180deg",
      scale: "0.90 1.1",
      scale: "0.8 1.2",
      scale: "0.90 1.1",
      scale: "0.95 1.05",
    },
    {
      duration: 220,
    }
  );
}

function getDiscColor(square) {
  return squareElements.get(square).color;
}

function getDiscPosition(square) {
  const row = squareElements.get(square).row;
  const col = squareElements.get(square).col;
  const id = +square.id;
  return [row, col, id];
}

function clickHandler({ target: square }) {
  const [row, col] = getDiscPosition(square);

  if (square.matches(".square")) {
    const color = isWhiteTurn ? "wht" : "blk";
    const nextColor = isWhiteTurn ? "blk" : "wht";

    if (isValidMove(square, color)) {
      addDisc(square);
      setDiscColor(square, color);
      updatePositions(row, col, color);
      flipDiscs(square, color);
      getTotalDiscNumber();

      if (isValidMoveAvailable(nextColor)) {
        switchTurn();
        if (userPreferences.isPossibleMovesEnabled) {
          showPossibleMoves(nextColor);
        }
      } else if (isGameOver()) {
        log("game over");
        displayModal();
      } else {
        log(
          `%c turn not swithced, \t color: ${color}, nextColor: ${nextColor}`,
          "color: crimson"
        );
      }
    }
  }
}

function isPosInBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isIdInBound(id) {
  return 0 <= id && id <= 63;
}

function isEmptySquare(row, col) {
  return positions[row][col] === null;
}

function isValidMove(square, color) {
  const [row, col] = getDiscPosition(square);

  if (!isEmptySquare(row, col)) {
    return false;
  }

  for (let [x, y] of directions) {
    if (x === 0 && y === 0) {
      continue;
    }

    let currRow = row + x;
    let currCol = col + y;
    if (canFlipDiscs(currRow, currCol, x, y, color)) {
      return true;
    }
  }

  return false;
}

function canFlipDiscs(currRow, currCol, x, y, color) {
  const oppositeColor = color === "wht" ? "blk" : "wht";

  if (!isPosInBounds(currRow, currCol)) {
    return false;
  } else if (isEmptySquare(currRow, currCol)) {
    return false;
  } // else if (positions[currRow][currCol] === color) {
  // "same colors" doesn't need to be checked
  // }

  // checks if there is one opposite color at least in one direction
  // if it is found then returns true
  if (positions[currRow][currCol] === oppositeColor) {
    while (isPosInBounds(currRow, currCol)) {
      if (positions[currRow][currCol] === color) {
        return true;
      }
      currRow += x;
      currCol += y;
    }
  }

  return false;
}

function flipDiscs(square, color) {
  const [row, col, id] = getDiscPosition(square);

  for (let [x, y, i] of directions) {
    if (x === 0 && y === 0) {
      continue;
    }

    let currRow = row + x;
    let currCol = col + y;
    let currId = id + i;
    let traced = tracer(currRow, currCol, currId, x, y, i, color);

    if (traced) {
      let [tracedRow, tracedCol, tracedId] = traced;

      while (true) {
        tracedRow -= x;
        tracedCol -= y;
        tracedId -= i;

        if (positions[tracedRow][tracedCol] === color) {
          break;
        }

        updateDiscsColor(tracedId, color);
        updatePositions(tracedRow, tracedCol, color);
      }
    }
  }
}

function tracer(currRow, currCol, currId, x, y, i, color) {
  const oppositeColor = color === "wht" ? "blk" : "wht";

  if (
    !isPosInBounds(currRow, currCol) ||
    !isIdInBound(currId) ||
    isEmptySquare(currRow, currCol) ||
    positions[currRow][currCol] === color
  ) {
    return false;
  }

  if (positions[currRow][currCol] === oppositeColor) {
    while (
      isPosInBounds(currRow, currCol) &&
      isIdInBound(currId) &&
      !(positions[currRow][currCol] === null)
    ) {
      if (positions[currRow][currCol] === color) {
        return [currRow, currCol, currId];
      }

      currRow += x;
      currCol += y;
      currId += i;
    }
  }
}

//! unperformant operation
function isValidMoveAvailable(color) {
  // const color = isWhiteTurn ? "wht" : "blk"
  //* it can be a Set instead of Array
  const emptySquares = [];
  let id = 0;
  positions.forEach((row) => {
    row.forEach((color) => {
      if (color === null) {
        emptySquares.push(getDOMElementById(`${id}`));
      }
      id++;
    });
  });

  for (let i = 0; i < emptySquares.length; i++) {
    if (isValidMove(emptySquares[i], color)) {
      return true;
    }
  }

  return false;
}

function showPossibleMoves(color) {
  const emptySquares = [];
  let id = 0;
  positions.forEach((row) => {
    row.forEach((color) => {
      if (color === null) {
        const emptySquare = getDOMElementById(`${id}`);
        emptySquares.push(emptySquare);
        removeHelperDot(emptySquare);
      }
      id++;
    });
  });

  for (let i = 0; i < emptySquares.length; i++) {
    if (isValidMove(emptySquares[i], color)) {
      addHelperDot(emptySquares[i]);
    }
  }
}

function addHelperDot(square) {
  const dot = createDOMElement("div");
  dot.className = "dot";
  square.append(dot);
}

function removeHelperDot(square) {
  const dot = square.firstElementChild;
  dot?.remove();
}

function removeAllHelperDots() {
  const dots = document.querySelectorAll(".dot");
  dots.forEach((dot) => dot.remove());
}

function helperDotsHandler() {
  const color = isWhiteTurn ? "wht" : "blk";
  userPreferences.isPossibleMovesEnabled = possibleMovesCheckbox.checked;
  localStorage.setItem("userPreferences", JSON.stringify(userPreferences));

  if (userPreferences.isPossibleMovesEnabled) {
    showPossibleMoves(color);
  } else {
    removeAllHelperDots();
  }
}

function getTotalDiscNumber() {
  let blacks = 0;
  let whites = 0;
  positions.forEach((row) => {
    row.forEach((col) => {
      if (col === "wht") whites++;
      if (col === "blk") blacks++;
    });
  });

  blackDiscs.innerText = blacks;
  whiteDiscs.innerText = whites;
  return [blacks, whites];
}

function isGameOver() {
  const [blacks, whites] = getTotalDiscNumber();

  if (
    blacks + whites === 64 ||
    (!isValidMoveAvailable("blk") && !isValidMoveAvailable("wht"))
  ) {
    removeAllHelperDots();
    return true;
  }
}

function showMenu() {
  menuContainer.classList.add("show-menu");
  backdrop.classList.add("transparent");
}

function hideMenu() {
  menuContainer.classList.remove("show-menu");
  removeBackdrop();
}

function closeSubmenus() {
  const opened = document.querySelectorAll(".menu .display");
  opened.forEach((el) => {
    el.classList.remove("display", "animate-in");
  });
  backdrop.classList.remove("blured");
}

function displaySetting(event) {
  event.stopPropagation();
  closeSubmenus();
  settingItems.classList.add("display");
  setTimeout(() => {
    settingItems.classList.add("animate-in");
  }, 0);
}

function closeSetting() {
  settingItems.classList.remove("display", "animate-in");
}

function handleCoords() {
  if (!coordsCheckbox.checked) {
    topCoords.style.opacity = "0";
    leftCoords.style.opacity = "0";
  } else {
    topCoords.style.opacity = "0.75";
    leftCoords.style.opacity = "0.75";
  }
}

function displayThemes(event) {
  event.stopPropagation();
  closeSubmenus();
  themesContainer.classList.add("display");
  setTimeout(() => {
    themesContainer.classList.add("animate-in");
  }, 0);
}

function closeThemes() {
  themesContainer.classList.remove("display", "animate-in");
}

addEventListener(themeCheckbox, "change", (event) => {
  event.stopPropagation();
  if (event.target.checked) {
    main.dataset.theme = "dark";
    userPreferences.userSelectedTheme = "dark";
    localStorage.setItem("userPreferences", JSON.stringify(userPreferences));
  } else {
    main.dataset.theme = "light";
    userPreferences.userSelectedTheme = "light";
    localStorage.setItem("userPreferences", JSON.stringify(userPreferences));
  }
});

themeInputs.forEach((radio) => {
  addEventListener(radio, "change", (e) => {
    const id = e.target.id;
    main.dataset.colors = id;
    userPreferences.userSelectedColors = id;
    localStorage.setItem("userPreferences", JSON.stringify(userPreferences));
  });
});

function displayRules() {
  closeSubmenus();
  explanation.classList.add("display");
  setTimeout(() => {
    explanation.classList.add("animate-in");
  }, 0);
  backdrop.classList.add("blured");
}

function closeRules() {
  explanation.classList.remove("animate-in");
  explanation.classList.add("animate-out");
  setTimeout(() => {
    explanation.classList.remove("display", "animate-out");
  }, 195);
}

function displayModal() {
  const img1 = getDOMElementById("m-player1-avatar");
  const img2 = getDOMElementById("m-player2-avatar");
  const [blacks, whites] = getTotalDiscNumber();

  modal.classList.add("display");
  setTimeout(() => {
    modal.classList.add("animate-in");
  }, 0);
  backdrop.classList.add("display");

  if (whites > blacks) {
    winner.innerText = "Player 2 Won!";
  } else {
    ("Player 1 Won!");
  }

  img1.src = player1Avater.src;
  img2.src = player2Avater.src;
}

function closeModal() {
  modal.classList.remove("animate-in");
  modal.classList.add("animate-out");
  setTimeout(() => {
    modal.classList.remove("display", "animate-out");
  }, 220);
  removeBackdrop();
}

function removeBackdrop() {
  backdrop.classList.remove("display");
  backdrop.classList.remove("transparent");
  backdrop.classList.remove("blured");
}

function resetGame() {
  squareElements = new Map();
  isWhiteTurn = false;
  blackDiscs.innerText = 2;
  whiteDiscs.innerText = 2;
  turn.innerText = "Black's Turn";

  for (let squareId = 0; squareId < 64; squareId++) {
    getDOMElementById(`${squareId}`).remove();
  }

  initBoard();
}

function rematch() {
  resetGame();
  closeModal();
  removeBackdrop();
}

addEventListener(window, "DOMContentLoaded", () => {
  // if (!userStorage && doesUserPreferDarkMode) {
  //   main.dataset.theme = "dark"
  //   main.dataset.colors = "dark-teal"
  //   themeCheckbox.checked = true
  // }

  if (userStorage) {
    if (userStorage.isPossibleMovesEnabled)
      possibleMovesCheckbox.setAttribute("checked", true);
    if (userStorage.isSoundEffectEnabled)
      soundEffectCheckbox.setAttribute("checked", true);
    if (userStorage.userSelectedTheme === "dark") themeCheckbox.checked = true;
    main.dataset.theme = userStorage.userSelectedTheme;
    main.dataset.colors = userStorage.userSelectedColors;
  } else {
    possibleMovesCheckbox.setAttribute("checked", true);
    soundEffectCheckbox.setAttribute("checked", true);
  }

  initBoard();
});

addEventListener(board, "click", clickHandler);
addEventListener(menuBtn, "click", showMenu);
addEventListener(setting, "click", displaySetting);
addEventListener(themes, "click", displayThemes);
addEventListener(rules, "click", displayRules);

addEventListener(resetBtn, "click", resetGame);
addEventListener(rematchBtn, "click", rematch);
addEventListener(okBtn, "click", closeModal);

addEventListener(coordsCheckbox, "change", handleCoords);
addEventListener(possibleMovesCheckbox, "change", helperDotsHandler);
addEventListener(soundEffectCheckbox, "change", () => {
  userPreferences.isSoundEffectEnabled = soundEffectCheckbox.checked;
  localStorage.setItem("userPreferences", JSON.stringify(userPreferences));
});

addEventListener(backdrop, "click", ({ target }) => {
  if (target.classList.contains("transparent")) {
    removeBackdrop();
    closeSetting();
    closeThemes();
    closeRules();

    setTimeout(() => {
      /* the `.rules` modal is positioned based on menu, so if menu hide without this delay, the modal would move to left cuz menu goes left. */
      hideMenu();
    }, 200);
  }
});

addEventListener(document, "keydown", ({ key }) => {
  if (key === "Escape") {
    removeBackdrop();
    closeModal();
    closeSetting();
    closeThemes();
    closeRules();

    setTimeout(() => {
      hideMenu();
    }, 200);
  }
});
