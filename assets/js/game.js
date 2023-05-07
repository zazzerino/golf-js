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

const TABLE_CARD_X = GAME_WIDTH / 2 + CARD_WIDTH / 2 + 2;
const TABLE_CARD_Y = GAME_HEIGHT / 2;

const gamePageRegex = /\/games\/(\d+)/;
const pathnameMatch = location.pathname.match(gamePageRegex);

if (pathnameMatch) {
  const gameContainer = document.querySelector(".game-container");
  
  const startGameButton = document.querySelector(".start-game-button");
  const joinGameButton = document.querySelector(".join-game-button");

  const gameId = parseInt(pathnameMatch[1]);
  const channel = socket.channel(`game:${gameId}`, {});

  const state = {
    userId: null,
    game: null,
    players: [],
    player: null,
    playableCards: [],
  };
  window.state = state;

  const sprites = {
    deck: null,
    tableCards: [],
    heldCard: null,
    hands: {bottom: [], left: [], top: [], right: []},
    playerInfos: {bottom: null, left: null, top: null, right: null},
  };

  const app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x2e8b57,
    antialias: true,
  });

  gameContainer.appendChild(app.view);

  channel.join()
    .receive("ok", payload => onChannelJoin(payload, state, app, sprites, startGameButton))
    .receive("error", payload => console.error("Unable to join", payload));

  channel.on("game_started", payload => onGameStarted(payload, state, app, sprites));
  channel.on("game_event", payload => onGameEvent(payload, state, app, sprites));
  channel.on("join_request", payload => onJoinRequest(payload, state, app, sprites));
}

///////////////////////////////////////////////////////////////////////////////

function onChannelJoin(payload, state, app, sprites, startGameButton) {
  console.log("joined channel", payload);

  state.userId = payload.user_id;
  state.game = payload.game;
  state.players = payload.players;

  const playerIndex = state.players.findIndex(p => p.user_id === state.userId);

  if (playerIndex !== -1) {
    state.player = state.players[playerIndex];
    state.playableCards = payload.playable_cards[state.player.id];
    rotateInPlace(state.players, state.playerIndex);
  }

  setPlayerPositions(state.players);
  drawGame(state, app, sprites);

  if (state.game.status === "init") {
    makeStartButtonActive(startGameButton);
  }
}

function onGameStarted(payload, state, app, sprites) {
  console.log("game started", payload);

  state.game = payload.game;
  state.players = payload.players;

  if (state.player) {
    state.playableCards = payload.playable_cards[state.player.id];
    rotateInPlace(state.players, state.playerIndex);
  }

  setPlayerPositions(state.players);
  // sprites.deck.visible = false;

  drawGame(state, app, sprites);

  startGameButton.style.display = "none";
  joinGameButton.style.display = "none";
}

function onGameEvent(payload, state, app, sprites) {
  console.log("game event", payload);

  state.game = payload.game;
  state.players = payload.players;

  if (state.player) {
    state.playableCards = payload.playable_cards[state.player.id];
    rotateInPlace(state.players);
  }

  setPlayerPositions(state.players);
  drawGame(state, app, sprites);
}

function onJoinRequest(payload, state, app, sprites) {
  console.log("join request", payload);
}

function drawGame(state, app, sprites) {
  drawDeck(state, app, sprites);
  // drawTableCards();

  // for (const player of players) {
  //   if (player.hand.length) {
  //     drawHand(player.position, player.hand);

  //     if (player.held_card) {
  //       drawHeldCard(player.position, player.held_card);
  //     } else if (heldCardSprite) {
  //       heldCardSprite.visible = false;
  //     }
  //   }

  //   drawPlayerInfo(player);
  // }
}

function drawDeck(state, app, sprites) {
  const prevSprite = sprites.deck;

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
    makePlayable(sprite);
  }

  app.stage.addChild(sprite);

  if (prevSprite) {
    prevSprite.visible = false;
  }
}

function makeStartButtonActive(button, channel) {
  button.style.visibility = "visible";

  button.addEventListener("click", _ => {
    channel.push("start_game", {});
    button.style.display = "none";
  })
}

// function setupStartGameButton() {
//   startGameButton.style.visibility = "visible";

//   startGameButton.addEventListener("click", _ => {
//     channel.push("start_game", {});
//     startGameButton.style.display = "none";
//   });
// }

// function setupGameButtons() {
//   const userIsHost = state.player && state.player["host?"];

//   if (userIsHost) {
//     setupStartGameButton();
//   } else {
//     startGameButton.style.display = "none";

//     if (!state.player) {
//       joinGameButton.style.visibility = "visible";
//     }
//   }
// }

function animateDeck(delta, sprite, ticker) {
  if (sprite.y < GAME_WIDTH / 2) {
    sprite.y += delta * 6;
  } else {
    sprite.y = GAME_HEIGHT / 2;
    ticker.destroy();
  }
}

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

function makePlayable(sprite) {
  sprite.eventMode = "static";
  sprite.on("pointerdown", onCardClick);
  sprite.cursor = "pointer";
  sprite.filters = [new OutlineFilter(3, 0xff00ff)];
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

function rotateInPlace(array, n) {
  while (n > 0) {
    array.push(array.shift());
    --n;
  }
}

  // function drawTableCard(cardName, isPlayable = false) {
  //   const prevSprites = [...tableCardSprites];

  //   const sprite = makeCardSprite(cardName, TABLE_CARD_X, TABLE_CARD_Y);
  //   sprite.cardPlace = "table";

  //   if (isPlayable) {
  //     makePlayable(sprite);
  //   }

  //   tableCardSprites.push(sprite);
  //   app.stage.addChild(sprite);

  //   for (const prev of prevSprites) {
  //     prev.visible = false;
  //   }
  // }

  // function drawTableCards() {
  //   const prevSprites = [...tableCardSprites];

  //   const card1 = game.table_cards[0];
  //   const card2 = game.table_cards[1];

  //   if (card2) drawTableCard(card2);
  //   if (card1) drawTableCard(card1, playableCards.includes("table"));

  //   for (const prev of prevSprites) {
  //     prev.visible = false;
  //   }
  // }

  // function handCardCoord(index) {
  //   let x = 0;
  //   let y = 0;

  //   // set x
  //   switch (index) {
  //     case 0:
  //     case 3:
  //       x = -CARD_WIDTH - 5;
  //       break;

  //     case 2:
  //     case 5:
  //       x = CARD_WIDTH + 5;
  //       break;
  //   }

  //   // set y
  //   switch (index) {
  //     case 0:
  //     case 1:
  //     case 2:
  //       y = -CARD_HEIGHT / 2 - 2;
  //       break;

  //     case 3:
  //     case 4:
  //     case 5:
  //       y = CARD_HEIGHT / 2 + 2;
  //       break;
  //   }

  //   return { x, y };
  // }

  // function drawHand(position, cards) {
  //   const prevContainer = handContainers[position];

  //   const container = new PIXI.Container();
  //   container.pivot.x = container.width / 2;
  //   container.pivot.y = container.height / 2;

  //   for (let i = 0; i < cards.length; i++) {
  //     const card = cards[i];
  //     const name = card["face_up?"] ? card.name : "2B";

  //     const sprite = makeCardSprite(name);
  //     sprite.cardPlace = "hand";
  //     sprite.handIndex = i;

  //     const { x, y } = handCardCoord(i);
  //     sprite.x = x;
  //     sprite.y = y;

  //     if (playableCards.includes(`hand_${i}`)) {
  //       makePlayable(sprite);
  //     }

  //     container.addChild(sprite);
  //   }

  //   const { x, y, angle } = handCoord(position);
  //   container.x = x;
  //   container.y = y;
  //   container.angle = angle;

  //   handContainers[position] = container;
  //   app.stage.addChild(container);

  //   if (prevContainer.children) {
  //     for (const sprite of prevContainer.children) {
  //       sprite.visible = false;
  //     }
  //   }
  // }

  // function heldCardCoord(position) {
  //   let x, y, angle;

  //   switch (position) {
  //     case "bottom":
  //       x = GAME_WIDTH / 2 + CARD_WIDTH * 2.5;
  //       y = GAME_HEIGHT - CARD_HEIGHT * 1.4;
  //       angle = 0;
  //       break;

  //     case "top":
  //       x = GAME_WIDTH / 2 - CARD_WIDTH * 2.5;
  //       y = CARD_HEIGHT * 1.4;
  //       angle = 180;
  //       break;

  //     case "left":
  //       x = CARD_HEIGHT * 1.4;
  //       y = GAME_HEIGHT / 2 + CARD_WIDTH * 2.5;
  //       angle = 90;
  //       break;

  //     case "right":
  //       x = GAME_WIDTH - CARD_HEIGHT * 1.4;
  //       y = GAME_HEIGHT / 2 - CARD_WIDTH * 2.5;
  //       angle = 270;
  //       break;
  //   }

  //   return { x, y, angle };
  // }

  // function drawHeldCard(position, card) {
  //   const prevSprite = heldCardSprite;

  //   const { x, y, angle } = heldCardCoord(position);
  //   const sprite = makeCardSprite(card, x, y);
  //   sprite.cardPlace = "held";
  //   sprite.angle = angle;

  //   heldCardSprite = sprite;
  //   app.stage.addChild(sprite);

  //   if (playableCards.includes("held")) {
  //     makePlayable(sprite);
  //   }

  //   if (prevSprite) {
  //     prevSprite.visible = false;
  //   }

  //   return sprite;
  // }

  // function playerInfoCoord(position) {
  //   let x, y, angle;

  //   switch (position) {
  //     case "bottom":
  //       x = GAME_WIDTH / 2;
  //       y = GAME_HEIGHT - GAME_HEIGHT * 0.025;
  //       angle = 0;
  //       break;

  //     case "top":
  //       x = GAME_WIDTH / 2;
  //       y = GAME_HEIGHT * 0.025;
  //       angle = 0;
  //       break;

  //     case "left":
  //       x = GAME_WIDTH * 0.025;
  //       y = GAME_HEIGHT / 2;
  //       angle = 90;
  //       break;

  //     case "right":
  //       x = GAME_WIDTH - GAME_WIDTH * 0.025;
  //       y = GAME_HEIGHT / 2;
  //       angle = 270;
  //       break;
  //   }

  //   return { x, y, angle };
  // }

  // const playerInfoStyle = {
  //   fill: 0xffffff,
  //   fontWeight: "bold",
  //   fontSize: 20,
  // };

  // const playerInfoText = player => `${player.username}: ${player.score}`;

  // function drawPlayerInfo(player) {
  //   const position = player.position;
  //   const prev = playerInfoSprites[position];

  //   const text = new PIXI.Text(playerInfoText(player), playerInfoStyle);
  //   text.anchor.set(0.5);

  //   const { x, y, angle } = playerInfoCoord(position);
  //   text.x = x;
  //   text.y = y;
  //   text.angle = angle;

  //   playerInfoSprites[position] = text;
  //   app.stage.addChild(text);

  //   if (prev) {
  //     prev.visible = false;
  //   }
  // }

  // function onDeckClick() {
  //   const event = { action: "take_from_deck", game_id: gameId, player_id: player.id };
  //   channel.push("game_event", event);
  // }

  // function onTableClick() {
  //   const event = { action: "take_from_table", game_id: gameId, player_id: player.id };
  //   channel.push("game_event", event);
  // }

  // function onHeldClick() {
  //   const event = { action: "discard", game_id: gameId, player_id: player.id };
  //   channel.push("game_event", event);
  //   app.stage.removeChild(heldCardSprite);
  // }

  // function onHandClick(index) {
  //   let event;

  //   switch (game.status) {
  //     case "flip2":
  //     case "flip":
  //       event = { action: "flip", game_id: gameId, player_id: player.id, hand_index: index };
  //       channel.push("game_event", event);
  //       break;

  //     case "hold":
  //       event = { action: "swap", game_id: gameId, player_id: player.id, hand_index: index }
  //       channel.push("game_event", event);
  //       break;
  //   }
  // }

  // function onCardClick(_ev) {
  //   switch (this.cardPlace) {
  //     case "deck":
  //       onDeckClick();
  //       break;

  //     case "table":
  //       onTableClick();
  //       break;

  //     case "held":
  //       onHeldClick();
  //       break;

  //     default:
  //       onHandClick(this.handIndex);
  //   }
  // }

  // function handCoord(position) {
  //   let x, y, angle;

  //   switch (position) {
  //     case "bottom":
  //       x = GAME_WIDTH / 2;
  //       y = GAME_HEIGHT - CARD_HEIGHT * 1.4;
  //       angle = 0;
  //       break;

  //     case "top":
  //       x = GAME_WIDTH / 2;
  //       y = CARD_HEIGHT * 1.4;
  //       angle = 180;
  //       break;

  //     case "left":
  //       x = CARD_HEIGHT * 1.4;
  //       y = GAME_HEIGHT / 2;
  //       angle = 90;
  //       break;

  //     case "right":
  //       x = GAME_WIDTH - CARD_HEIGHT * 1.4;
  //       y = GAME_HEIGHT / 2;
  //       angle = 270;
  //       break;

  //     default:
  //       throw new Error(`position ${position} must be one of: bottom, left, top, right`);
  //   }

  //   return { x, y, angle };
  // }
