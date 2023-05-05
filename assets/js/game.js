import {socket} from "./user_socket";
import * as PIXI from "pixi.js";
import {OutlineFilter} from "@pixi/filter-outline";
import {zip, rotate} from "./util";

const gameWidth = 600;
const gameHeight = 600;

const cardSvgWidth = 240;
const cardSvgHeight = 336;
const cardScale = 0.25;

const cardWidth = cardSvgWidth * cardScale;
const cardHeight = cardSvgHeight * cardScale;

const gameContainer = document.querySelector(".game-container");

if (gameContainer) {
  const gameId = parseInt(location.pathname.split("/").pop());
  const channel = socket.channel(`game:${gameId}`, {});

  let userId;
  let game;
  let playerIndex;
  let player;
  let playableCards = [];
  let players = [];
  let positions = [];

  const app = new PIXI.Application({
    width: gameWidth,
    height: gameHeight,
    backgroundColor: 0x2e8b57,
    antialias: true,
  });

  gameContainer.appendChild(app.view);

  let deckSprite;
  let tableCardSprites = []
  let handSprites = {bottom: [], left: [], top: [], right: []};
  let heldCardSprite;
  let playerInfoSprites = {bottom: null, left: null, top: null, right: null};

  const startGameButton = document.querySelector(".start-game-button");

  function onChannelJoin(payload) {
    console.log("Joined game", payload);
    game = payload.game;
    players = payload.players;
    positions = playerPositions(players.length);

    userId = payload.user_id;
    playerIndex = players.findIndex(p => p.user_id === userId);

    if (playerIndex !== -1) {
      player = players[playerIndex];
      playableCards = payload.playable_cards[player.id];
      players = rotate(players, playerIndex);
    }

    drawGame();

    if (game.status === "init" && player && player["host?"]) {
      startGameButton.addEventListener("click", _ => {
        channel.push("start_game", {});
      });

      startGameButton.style.visibility = "visible";
    }
  }

  channel.join()
    .receive("ok", onChannelJoin)
    .receive("error", resp => console.log("Unable to join", resp));

  channel.on("game_started", payload => {
    console.log("game started", payload)
    game = payload.game;
    players = payload.players;
    positions = playerPositions(players.length);

    if (player) {
      playableCards = payload.playable_cards[player.id];
      players = rotate(players, playerIndex);
    }

    deckSprite.visible = false;
    drawGame();
    startGameButton.style.visibility = "hidden";
  });

  channel.on("game_event", payload => {
    console.log("game event", payload);
    game = payload.game;
    players = payload.players;
    positions = playerPositions(players.length);

    if (player) {
      playableCards = payload.playable_cards[player.id];
      players = rotate(players, playerIndex);
    }

    drawGame();
  });

  function animateDeck(delta) {
    if (deckSprite.y < gameWidth / 2) {
      deckSprite.y += delta * 6;
    } else {
      deckSprite.y = gameHeight / 2;
      app.ticker.remove(animateDeck);
    }
  }

  function drawGame() {
    drawDeck();
    drawTableCards();

    for (const player of players) {
      if (player.hand.length) {
        drawHand("bottom", player.hand);

        if (player.held_card) {
          drawHeldCard("bottom", player.held_card);
        } else if (heldCardSprite) {
          heldCardSprite.visible = false;
        }
      }

      drawPlayerInfo(player, "bottom");
    }
  }

  function drawDeck() {
    const prevSprite = deckSprite;

    deckSprite = makeCardSprite("2B", gameWidth / 2, gameHeight / 2);
    deckSprite.cardPlace = "deck";

    if (game.status === "init") {
      deckSprite.y = cardWidth / -2;
      app.ticker.add(animateDeck)
    } else {
      deckSprite.x -= cardWidth / 2 + 2;
    }

    if (playableCards.includes("deck")) {
      makePlayable(deckSprite);
    }

    app.stage.addChild(deckSprite);

    if (prevSprite) {
      prevSprite.visible = false;
    }
  }

  const tableCardX = gameWidth / 2 + cardWidth / 2 + 2;
  const tableCardY = gameHeight / 2;

  function drawTableCard(cardName, isPlayable = false) {
    const prevSprites = [...tableCardSprites];

    const sprite = makeCardSprite(cardName, tableCardX, tableCardY);
    sprite.cardPlace = "table";

    if (isPlayable) {
      makePlayable(sprite);
    }

    tableCardSprites.push(sprite);
    app.stage.addChild(sprite);

    for (const prev of prevSprites) {
      prev.visible = false;
    }
  }

  function drawTableCards() {
    const prevSprites = [...tableCardSprites];

    const card1 = game.table_cards[0];
    const card2 = game.table_cards[1];

    if (card2) drawTableCard(card2);
    if (card1) drawTableCard(card1, playableCards.includes("table"));

    for (let prev of prevSprites) {
      prev.visible = false;
    }
  }

  function handCardCoord(position, index) {
    let x = (gameWidth / 2) - cardWidth + (cardWidth * (index % 3));
    let y;

    if (position === "bottom") {
      switch (index) {
        case 0:
        case 1:
        case 2:
          y = gameHeight - cardHeight * 1.5 - 8 - 25;
          break;

        default:
          y = gameHeight - cardHeight / 2 - 4 - 25;
          break;
      }

      switch (index) {
        case 0:
        case 3:
          x -= 4;
          break;

        case 2:
        case 5:
          x += 4;
          break;
      }
    }

    return { x, y };
  }

  function drawHand(position, cards) {
    const prevSprites = [...handSprites[position]];

    for (let i = 0; i < 6; i++) {
      const card = cards[i];
      const name = card["face_up?"] ? card.name : "2B";

      const sprite = makeCardSprite(name);
      const {x, y} = handCardCoord(position, i);
      sprite.x = x;
      sprite.y = y;

      sprite.cardPlace = "hand";
      sprite.handIndex = i;

      if (playableCards.includes(`hand_${i}`)) {
        makePlayable(sprite);
      }

      handSprites[position][i] = sprite;
      app.stage.addChild(sprite);
    }

    for (const prev of prevSprites) {
      prev.visible = false;
    }
  }

  function heldCardCoord(position) {
    let x, y;

    switch (position) {
      case "bottom":
        x = gameWidth / 2 + cardWidth * 2.5;
        y = gameHeight - cardHeight;
        break;
    }

    return {x, y};
  }

  function drawHeldCard(position, card) {
    const prevSprite = heldCardSprite;

    const {x, y} = heldCardCoord(position);
    const sprite = makeCardSprite(card, x, y);
    sprite.cardPlace = "held";
    
    heldCardSprite = sprite;
    app.stage.addChild(sprite);

    if (playableCards.includes("held")) {
      makePlayable(sprite);
    }

    if (prevSprite) {
      prevSprite.visible = false;
    }

    return sprite;
  }

  function playerInfoCoord(position) {
    switch (position) {
      case "bottom":
        return {x: gameWidth / 2, y: gameHeight - 15};
    }
  }

  const playerInfoStyle = {
    fill: 0xffffff,
    fontWeight: "bold",
    fontSize: 20,
  };

  const playerInfoText = player => `${player.username}: ${player.score}`;

  function drawPlayerInfo(player, position) {
    const prev = playerInfoSprites[position];

    const text = new PIXI.Text(playerInfoText(player), playerInfoStyle);
    text.anchor.set(0.5);
    const {x, y} = playerInfoCoord(position);
    text.x = x;
    text.y = y;

    playerInfoSprites[position] = text;
    app.stage.addChild(text);

    if (prev) {
      prev.visible = false;
    }
  }

  function onDeckClick() {
    const event = {action: "take_from_deck", game_id: gameId, player_id: player.id};
    channel.push("game_event", event);
  }

  function onTableClick() {
    const event = {action: "take_from_table", game_id: gameId, player_id: player.id};
    channel.push("game_event", event);
  }

  function onHeldClick() {
    const event = {action: "discard", game_id: gameId, player_id: player.id};
    channel.push("game_event", event);
    app.stage.removeChild(heldCardSprite);
  }

  function onHandClick(index) {
    let event;

    switch (game.status) {
      case "flip2":
      case "flip":
        event = {action: "flip", game_id: gameId, player_id: player.id, hand_index: index};
        channel.push("game_event", event);
        break;

      case "hold":
        event = {action: "swap", game_id: gameId, player_id: player.id, hand_index: index}
        channel.push("game_event", event);
        break;
    }
  }

  function onCardClick(_ev) {
    switch (this.cardPlace) {
      case "deck":
        onDeckClick();
        break;

      case "table":
        onTableClick();
        break;

      case "held":
        onHeldClick();
        break;

      default:
        onHandClick(this.handIndex);
    }
  }

  const cardPath = name => `/images/cards/${name}.svg`;

  function makeCardSprite(name, x = 0, y = 0, isPlayable = false) {
    const sprite = PIXI.Sprite.from(cardPath(name));
    sprite.scale.set(cardScale, cardScale);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.cardName = name;

    if (isPlayable) {
      makePlayable(sprite);
    }

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
}
