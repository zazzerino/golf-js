import { socket } from "./user_socket";
import * as PIXI from "pixi.js";
import { OutlineFilter } from "@pixi/filter-outline";
  
const GAME_WIDTH = 600;
const GAME_HEIGHT = 600;

const CARD_SVG_WIDTH = 240;
const CARD_SVG_HEIGHT = 336;
const CARD_SCALE = 0.25;

const CARD_WIDTH = CARD_SVG_WIDTH * CARD_SCALE;
const CARD_HEIGHT = CARD_SVG_HEIGHT * CARD_SCALE;

const startGameButton = document.querySelector(".start-game-button");
const joinGameButton = document.querySelector(".join-game-button");

const gamePageRegex = /\/games\/(\d+)/;
const pathnameMatch = location.pathname.match(gamePageRegex);

if (pathnameMatch) {
  const gameContainer = document.querySelector(".game-container");
  
  const gameId = parseInt(pathnameMatch[1]);
  const channel = socket.channel(`game:${gameId}`, {});

  const app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x2e8b57,
    antialias: true,
  });

  const sprites = {
    deck: null,
    tableCards: [],
    heldCard: null,
    hands: {bottom: [], left: [], top: [], right: []},
    playerInfos: {bottom: null, left: null, top: null, right: null},
  };

  const state = {
    userId: null,
    game: null,
    player: null,
    players: [],
    playableCards: [],
    stage: app.stage,
    sprites: sprites,
    channel: channel,
  };
  window.state = state;

  gameContainer.appendChild(app.view);

  channel.join()
    .receive("ok", payload => onChannelJoin(state, payload))
    .receive("error", payload => console.log("unable to join channel", payload));

  channel.on("game_started", payload => onGameStarted(state, payload));
  channel.on("game_event", payload => onGameEvent(state, payload));
}

// channel callbacks

function onChannelJoin(state, payload) {
  console.log("joined channel", payload);

  state.userId = payload.user_id;
  state.game = payload.game;
  state.players = payload.players;

  const playerIndex = state.players.findIndex(p => p.user_id === state.userId);

  if (playerIndex !== -1) {
    state.player = state.players[playerIndex];
    state.player.index = playerIndex;
    state.playableCards = payload.playable_cards[state.player.id];
    rotateInPlace(state.players, state.player.index);
  }

  setPlayerPositions(state.players);
  drawGame(state);
  setupGameButtons(state);
}

function onGameStarted(state, payload) {
  console.log("game started", payload);

  state.game = payload.game;
  state.players = payload.players;

  if (state.player) {
    state.playableCards = payload.playable_cards[state.player.id];
    rotateInPlace(state.players, state.player.index);
  }

  setPlayerPositions(state.players);
  drawGame(state);

  startGameButton.style.display = "none";
  joinGameButton.style.display = "none";
}

function onGameEvent(state, payload) {
  console.log("game event", payload);

  state.game = payload.game;
  state.players = payload.players;

  if (state.player) {
    state.playableCards = payload.playable_cards[state.player.id];
    rotateInPlace(state.players, state.player.index);
  }

  setPlayerPositions(state.players);
  drawGame(state);
}

// draw functions

function drawGame(state) {
  drawDeck(state);
  drawTableCards(state);

  for (const player of state.players) {
    drawHand(state, player.position, player.hand);

    if (player.held_card) {
      drawHeldCard(state, player.position, player.held_card);
    } else if (state.sprites.heldCard) {
      state.sprites.heldCard.visible = false;
    }

    drawPlayerInfo(state, player);
  }
}

function drawDeck(state) {
  const prevSprite = state.sprites.deck;

  const sprite = makeCardSprite("2B", GAME_WIDTH / 2, GAME_HEIGHT / 2);
  sprite.cardPlace = "deck";

  if (state.game.status === "init") {
    sprite.y = -CARD_HEIGHT / 2;

    const ticker = new PIXI.Ticker();
    ticker.add(delta => animateDeck(delta, sprite, ticker));
    ticker.start();
  } else {
    sprite.x -= CARD_WIDTH / 2 + 2;
  }

  if (state.playableCards.includes("deck")) {
    makePlayable(state, sprite);
  }

  state.sprites.deck = sprite;
  state.stage.addChild(sprite);

  if (prevSprite) {
    prevSprite.visible = false;
  }
}

function drawTableCard(state, name) {
  const sprite = makeCardSprite(name, TABLE_CARD_X, TABLE_CARD_Y);
  sprite.cardPlace = "table";

  state.sprites.tableCards.push(sprite);
  state.stage.addChild(sprite);

  return sprite;
}

function drawTableCards(state) {
  const prevSprites = [...state.sprites.tableCards];

  const name1 = state.game.table_cards[1];
  const name0 = state.game.table_cards[0];

  if (name1) {
    drawTableCard(state, name1);
  }

  if (name0) {
    const sprite = drawTableCard(state, name0);

    if (state.playableCards.includes("table")) {
      makePlayable(state, sprite);
    }
  }

  for (const sprite of prevSprites) {
    sprite.visible = false;
  }
}

function drawHand(state, position, hand) {
  const prevContainer = state.sprites.hands[position];

  const container = new PIXI.Container();
  container.pivot.x = container.width / 2;
  container.pivot.y = container.height / 2;

  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    const name = card["face_up?"] ? card.name : "2B";

    const sprite = makeCardSprite(name);
    sprite.cardPlace = "hand";
    sprite.handIndex = i;

    const {x, y} = handCardCoord(i);
    sprite.x = x;
    sprite.y = y;

    if (state.playableCards.includes(`hand_${i}`)) {
      makePlayable(state, sprite);
    }

    container.addChild(sprite);
  }

  const {x, y, angle} = handCoord(position);
  container.x = x;
  container.y = y;
  container.angle = angle;

  state.sprites.hands[position] = container;
  state.stage.addChild(container);

  if (prevContainer.children) {
    for (const sprite of prevContainer.children) {
      sprite.visible = false;
    }
  }
}

function drawHeldCard(state, position, card) {
  const prevSprite = state.sprites.heldCard;

  const {x, y, angle} = heldCardCoord(position);
  const sprite = makeCardSprite(card, x, y);
  sprite.angle = angle;
  sprite.cardPlace = "held";

  state.sprites.heldCard = sprite;
  state.stage.addChild(sprite);

  if (state.playableCards.includes("held")) {
    makePlayable(state, sprite);
  }

  if (prevSprite) {
    prevSprite.visible = false;
  }
}

const playerInfoText = player => `${player.username}: ${player.score}`;

const playerInfoStyle = {
  fill: 0xffffff,
  fontWeight: "bold",
  fontSize: 20,
};

function drawPlayerInfo(state, player) {
  const prevSprite = state.sprites.playerInfos[player.position];

  const text = new PIXI.Text(playerInfoText(player), playerInfoStyle);
  text.anchor.set(0.5);

  const {x, y, angle} = playerInfoCoord(player.position);
  text.x = x;
  text.y = y;
  text.angle = angle;

  state.sprites.playerInfos[player.position] = text;
  state.stage.addChild(text);

  if (prevSprite) {
    prevSprite.visible = false;
  }
}

// card sprite functions

const cardPath = name => `/images/cards/${name}.svg`;

function makeCardSprite(name, x = 0, y = 0) {
  const sprite = PIXI.Sprite.from(cardPath(name));

  sprite.scale.set(CARD_SCALE, CARD_SCALE);
  sprite.anchor.set(0.5);
  sprite.x = x;
  sprite.y = y;
  sprite.cardName = name;

  return sprite;
}

function makePlayable(state, sprite) {
  sprite.eventMode = "static";
  sprite.cursor = "pointer";
  sprite.filters = [new OutlineFilter(3, 0xff00ff)];
  sprite.on("pointerdown", e => onCardClick(state, e.currentTarget));
}

// sprite events

function onCardClick(state, sprite) {
  switch (sprite.cardPlace) {
    case "deck":
      onDeckClick(state);
      break;

    case "table":
      onTableClick(state);
      break;

    case "held":
      onHeldClick(state);
      break;

    case "hand":
      onHandClick(state, sprite.handIndex);
      break;

    default:
      throw new Error(`cardPlace not found in ${sprite}`);
  }
}

function onDeckClick(state) {
  const event = {action: "take_from_deck", game_id: state.game.id, player_id: state.player.id};
  state.channel.push("game_event", event);
}

function onTableClick(state) {
  const event = {action: "take_from_table", game_id: state.game.id, player_id: state.player.id};
  state.channel.push("game_event", event);
}

function onHandClick(state, index) {
  let event;

  switch (state.game.status) {
    case "flip2":
    case "flip":
      event = { action: "flip", game_id: state.game.id, player_id: state.player.id, hand_index: index };
      state.channel.push("game_event", event);
      break;

    case "hold":
      event = { action: "swap", game_id: state.game.id, player_id: state.player.id, hand_index: index }
      state.channel.push("game_event", event);
      break;
  }
}

function onHeldClick(state) {
  const event = { action: "discard", game_id: state.game.id, player_id: state.player.id };
  state.channel.push("game_event", event);
  state.stage.removeChild(state.sprites.heldCard);
}

// sprite coords

const TABLE_CARD_X = GAME_WIDTH / 2 + CARD_WIDTH / 2 + 2;
const TABLE_CARD_Y = GAME_HEIGHT / 2;

function handCardCoord(index) {
  let x = 0, y = 0;

  switch (index) {
    case 0:
    case 3:
      x = -CARD_WIDTH - 5;
      break;

    case 2:
    case 5:
      x = CARD_WIDTH + 5;
      break;
  }

  switch (index) {
    case 0:
    case 1:
    case 2:
      y = -CARD_HEIGHT / 2 - 2;
      break;

    case 3:
    case 4:
    case 5:
      y = CARD_HEIGHT / 2 + 2;
      break;
  }

  return {x, y};
}

function handCoord(position) {
  let x, y, angle;

  switch (position) {
    case "bottom":
      x = GAME_WIDTH / 2;
      y = GAME_HEIGHT - CARD_HEIGHT * 1.4;
      angle = 0;
      break;

    case "top":
      x = GAME_WIDTH / 2;
      y = CARD_HEIGHT * 1.4;
      angle = 180;
      break;

    case "left":
      x = CARD_HEIGHT * 1.4;
      y = GAME_HEIGHT / 2;
      angle = 90;
      break;

    case "right":
      x = GAME_WIDTH - CARD_HEIGHT * 1.4;
      y = GAME_HEIGHT / 2;
      angle = 270;
      break;

    default:
      throw new Error(`position ${position} must be one of: "bottom", "left", "top", "right"`);
  }

  return {x, y, angle};
}

function heldCardCoord(position) {
  let x, y, angle;

  switch (position) {
    case "bottom":
      x = GAME_WIDTH / 2 + CARD_WIDTH * 2.5;
      y = GAME_HEIGHT - CARD_HEIGHT * 1.4;
      angle = 0;
      break;

    case "top":
      x = GAME_WIDTH / 2 - CARD_WIDTH * 2.5;
      y = CARD_HEIGHT * 1.4;
      angle = 180;
      break;

    case "left":
      x = CARD_HEIGHT * 1.4;
      y = GAME_HEIGHT / 2 + CARD_WIDTH * 2.5;
      angle = 90;
      break;

    case "right":
      x = GAME_WIDTH - CARD_HEIGHT * 1.4;
      y = GAME_HEIGHT / 2 - CARD_WIDTH * 2.5;
      angle = 270;
      break;
  }

  return {x, y, angle};
}

function playerInfoCoord(position) {
  let x, y, angle;

  switch (position) {
    case "bottom":
      x = GAME_WIDTH / 2;
      y = GAME_HEIGHT - GAME_HEIGHT * 0.025;
      angle = 0;
      break;

    case "top":
      x = GAME_WIDTH / 2;
      y = GAME_HEIGHT * 0.025;
      angle = 0;
      break;

    case "left":
      x = GAME_WIDTH * 0.025;
      y = GAME_HEIGHT / 2;
      angle = 90;
      break;

    case "right":
      x = GAME_WIDTH - GAME_WIDTH * 0.025;
      y = GAME_HEIGHT / 2;
      angle = 270;
      break;
  }

  return {x, y, angle};
}

// animations

function animateDeck(delta, sprite, ticker) {
  if (sprite.y < GAME_WIDTH / 2) {
    sprite.y += delta * 6;
  } else {
    sprite.y = GAME_HEIGHT / 2;
    ticker.destroy();
  }
}

// dom functions

function setupGameButtons(state) {
  const channel = state.channel;

  const userIsHost = state.player && state.player["host?"];
  const isInitGame = state.game.status === "init";
  const canStartGame = userIsHost && isInitGame;
  const canJoinGame = !state.player && isInitGame;

  if (canStartGame) {
    startGameButton.style.display = "block";

    startGameButton.addEventListener("click", _ => {
      channel.push("start_game", {});
    });
  } else if (canJoinGame) {
    startGameButton.style.display = "none";
    joinGameButton.style.display = "block";

    joinGameButton.addEventListener("click", _ => {
      console.log("join game");
    });
  }
}

// utils

function rotateInPlace(array, n) {
  while (n > 0) {
    array.push(array.shift());
    --n;
  }
}

function playerPositions(numPlayers) {
  switch (numPlayers) {
    case 1:
      return ["bottom"];
    case 2:
      return ["bottom", "top"];
    case 3:
      return ["bottom", "left", "right"];
    case 4:
      return ["bottom", "left", "top", "right"];
    default:
      throw new Error(`"numPlayers" must be between 1 and 4. Given: ${numPlayers}`);
  }
}

function setPlayerPositions(players) {
  const positions = playerPositions(players.length);

  for (let i = 0; i < players.length; i++) {
    players[i].position = positions[i];
  }
}
