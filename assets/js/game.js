import {socket} from "./user_socket";
import * as PIXI from "pixi.js";
import {OutlineFilter} from "@pixi/filter-outline";
import {zip, rotate} from "./util";

const gameWidth = 600;
const gameHeight = 600;

const cardSvgWidth = 240;
const cardSvgHeight = 336;
const cardScale = 0.245;

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
  let handContainers = {bottom: [], left: [], top: [], right: []};
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

    const userIsPlaying = playerIndex !== -1;

    if (userIsPlaying) {
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
    console.log("game started", payload);
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
        drawHand("top", player.hand);
        drawHand("left", player.hand);
        drawHand("right", player.hand);

        if (player.held_card) {
          drawHeldCard("bottom", player.held_card);
          drawHeldCard("top", player.held_card);
          drawHeldCard("left", player.held_card);
          drawHeldCard("right", player.held_card);
        } else if (heldCardSprite) {
          heldCardSprite.visible = false;
        }
      }

      drawPlayerInfo(player, "bottom");
      drawPlayerInfo(player, "top");
      drawPlayerInfo(player, "left");
      drawPlayerInfo(player, "right");
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

    for (const prev of prevSprites) {
      console.log("prev", prev);
      prev.visible = false;
    }
  }

  function handCardCoord(index) {
    let x = 0;
    let y = 0;

    // set x
    switch (index) {
      case 0:
      case 3:
        x = -cardWidth - 5;
        break;

      case 2:
      case 5:
        x = cardWidth + 5;
        break;
    }
   
    // set y
    switch (index) {
      case 0:
      case 1:
      case 2:
        y = -cardHeight / 2 - 2;
        break;

      case 3:
      case 4:
      case 5:
        y = cardHeight / 2 + 2;
        break;
    }

    return {x, y};
  }

  function handCoord(position) {
    let x, y, angle;

    switch (position) {
      case "bottom":
        x = gameWidth / 2;
        y = gameHeight - cardHeight * 1.4;
        angle = 0;
        break;

      case "top":
        x = gameWidth / 2;
        y = cardHeight * 1.4;
        angle = 180;
        break;

      case "left":
        x = cardHeight * 1.4;
        y = gameHeight / 2;
        angle = 90;
        break;

      case "right":
        x = gameWidth - cardHeight * 1.4;
        y = gameHeight / 2;
        angle = 270;
        break;
    }

    return {x, y, angle};
  }

  function drawHand(position, cards) {
    const prevContainer = handContainers[position];

    const container = new PIXI.Container();
    container.pivot.x = container.width / 2;
    container.pivot.y = container.height / 2;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const name = card["face_up?"] ? card.name : "2B";

      const sprite = makeCardSprite(name);
      sprite.cardPlace = "hand";
      sprite.handIndex = i;

      const {x, y} = handCardCoord(i);
      sprite.x = x;
      sprite.y = y;

      if (playableCards.includes(`hand_${i}`)) {
        makePlayable(sprite);
      }

      container.addChild(sprite);
    }

    const {x, y, angle} = handCoord(position);
    container.x = x;
    container.y = y;
    container.angle = angle;

    handContainers[position] = container;
    app.stage.addChild(container);

    if (prevContainer.children) {
      for (const sprite of prevContainer.children) {
        sprite.visible = false;
      }
    }
  }

  function heldCardCoord(position) {
    let x, y, angle;

    switch (position) {
      case "bottom":
        x = gameWidth / 2 + cardWidth * 2.5;
        y = gameHeight - cardHeight * 1.4;
        angle = 0;
        break;

      case "top":
        x = gameWidth / 2 - cardWidth * 2.5;
        y = cardHeight * 1.4;
        angle = 180;
        break;

      case "left":
        x = cardHeight * 1.4;
        y = gameHeight / 2 + cardWidth * 2.5;
        angle = 90;
        break;

      case "right":
        x = gameWidth - cardHeight * 1.4;
        y = gameHeight / 2 - cardWidth * 2.5;
        angle = 270;
        break;
    }

    return {x, y, angle};
  }

  function drawHeldCard(position, card) {
    const prevSprite = heldCardSprite;

    const {x, y, angle} = heldCardCoord(position);
    const sprite = makeCardSprite(card, x, y);
    sprite.cardPlace = "held";
    sprite.angle = angle;
    
    heldCardSprite = sprite;
    app.stage.addChild(sprite);

    if (playableCards.includes("held")) {
      makePlayable(sprite);
    }

    if (prevSprite) {
      // prevSprite.visible = false;
    }

    return sprite;
  }

  function playerInfoCoord(position) {
    let x, y, angle;

    switch (position) {
      case "bottom":
        x = gameWidth / 2;
        y = gameHeight - gameHeight * 0.025;
        angle = 0;
        break;

      case "top":
        x = gameWidth / 2;
        y = gameHeight * 0.025;
        angle = 0;
        break;

      case "left":
        x = gameWidth * 0.025;
        y = gameHeight / 2;
        angle = 90;
        break;

      case "right":
        x = gameWidth - gameWidth * 0.025;
        y = gameHeight / 2;
        angle = 270;
        break;
    }

    return {x, y, angle};
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
    const {x, y, angle} = playerInfoCoord(position);
    text.x = x;
    text.y = y;
    text.angle = angle;

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
