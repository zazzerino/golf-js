import { PIXI } from "../vendor/pixi";
import { socket } from "./user_socket";

const gameWidth = 600;
const gameHeight = 600;

const cardSvgWidth = 240;
const cardSvgHeight = 336;
const cardScale = 0.3;

const cardWidth = cardSvgWidth * cardScale;
const cardHeight = cardSvgHeight * cardScale;

const gameContainer = document.querySelector(".game-container");

if (gameContainer) {
  const gameId = parseInt(location.pathname.split("/").pop());
  const channel = socket.channel(`game:${gameId}`, {});

  let game = null;

  const app = new PIXI.Application({
    width: gameWidth,
    height: gameHeight,
    backgroundColor: 0x22ffdd,
    antialias: true,
  });

  gameContainer.appendChild(app.view);

  let deckSprite;
  let tableCardSprites = []
  let handSprites = {bottom: [], left: [], top: [], right: []};
  let heldCardSprite;

  let player1;

  const startGameButton = document.querySelector(".start-game-button");

  function onJoinChannel(resp) {
    game = resp.game;
    console.log("Joined game", game);
    drawGame();

    if (game.status === "init") {
      startGameButton.addEventListener("click", _ => {
        channel.push("start_game", {});
      });

      startGameButton.style.display = "block";
    }
  }

  channel.join()
    .receive("ok", onJoinChannel)
    .receive("error", resp => console.log("Unable to join", resp));

  channel.on("game", payload => {
    console.log("game message", payload);
    game = payload.game;
    drawGame();
  });

  channel.on("game_started", payload => {
    console.log("game started", payload.game)
    game = payload.game;
    deckSprite.visible = false;
    drawGame();
    startGameButton.style.display = "none";
  });

  channel.on("game_event", payload => {
    console.log("game event", payload);
    game = payload.game;
    drawGame();
  });

  function animateInitDeck(delta) {
    if (deckSprite.y < gameWidth / 2) {
      deckSprite.y += delta * 6;
    } else {
      deckSprite.y = gameHeight / 2;
      app.ticker.remove(animateInitDeck);
    }
  }

  const tableCardX = gameWidth / 2 + cardWidth / 2 + 1;
  const tableCardY = gameHeight / 2;

  function drawGame() {
    drawDeck();
    drawTableCards();

    player1 = game.players[0];

    if (player1 && player1.hand.length) {
      drawHand("bottom", player1.hand);

      if (player1.held_card) {
        drawHeldCard("bottom", player1.held_card);
      }
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
    const {x, y} = heldCardCoord(position);
    const sprite = makeCardSprite(card, x, y);
    sprite.cardPlace = "held";
    app.stage.addChild(sprite);
    heldCardSprite = sprite;
    return sprite;
  }

  function drawDeck() {
    deckSprite = makeCardSprite("2B", gameWidth / 2, gameHeight / 2);
    deckSprite.cardPlace = "deck";

    if (game.status === "init") {
      deckSprite.y = cardWidth / -2;
      app.ticker.add(animateInitDeck)
    } else {
      deckSprite.x -= cardWidth / 2 + 1;
    }

    app.stage.addChild(deckSprite);
  }

  function drawTableCards() {
    const card1 = game.table_cards[0];
    const card2 = game.table_cards[1];

    for (const card of [card2, card1]) {
      if (card) {
        const sprite = makeCardSprite(card, tableCardX, tableCardY);
        sprite.cardPlace = "table";
        tableCardSprites.push(sprite);
        app.stage.addChild(sprite);
      }
    }
  }

  function drawHand(position, cards) {
    for (let i = 0; i < 6; i++) {
      const card = cards[i];
      const name = card["face_up?"] ? card.name : "2B";

      const sprite = makeCardSprite(name);
      const {x, y} = handCardCoord(position, i);
      sprite.x = x;
      sprite.y = y;

      sprite.cardPlace = "hand";
      sprite.handIndex = i;

      handSprites[position][i] = sprite;
      app.stage.addChild(sprite);
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
          y = gameHeight - cardHeight * 1.5;
          break;

        default:
          y = gameHeight - cardHeight / 2;
          break;
      }

      switch (index) {
        case 0:
        case 3:
          x -= 1;
          break;

        case 2:
        case 5:
          x += 1;
          break;
      }
    }

    return { x, y };
  }

  function onDeckClick() {
    console.log("deck clicked");
  }

  function onTableClick() {
    console.log("table clicked");
  }

  function isHandCardPlayable(index) {
    switch (game.status) {
      case "flip2":
      case "flip":
        return !player1.hand[index]["face_up?"];
      default:
        return false;
    }
  }

  function onHandClick(index) {
    if (isHandCardPlayable(index)) {
      const event = {action: "flip", game_id: gameId, player_id: player1.id, hand_index: index};
      channel.push("game_event", event);
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

      default:
        onHandClick(this.handIndex);
    }
  }

  const cardPath = name => `/images/cards/${name}.svg`;

  function makeCardSprite(name, x = 0, y = 0) {
    const sprite = PIXI.Sprite.from(cardPath(name));
    sprite.scale.set(cardScale, cardScale);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.cardName = name;

    sprite.eventMode = "static";
    sprite.on("pointerdown", onCardClick);

    return sprite;
  }
}

// const cardNames = [
//   "2B",
//   "AC","2C","3C","4C","5C","6C","7C","8C","9C","TC","QC","KC",
//   "AD","2D","3D","4D","5D","6D","7D","8D","9D","TD","QD","KD",
//   "AH","2H","3H","4H","5H","6H","7H","8H","9H","TH","QH","KH",
//   "AS","2S","3S","4S","5S","6S","7S","8S","9S","TS","QS","KS",
// ];

// for (const name of cardNames) {
//   PIXI.Assets.add(name, `/images/cards/${name}.svg`);
// }
 
// PIXI.Assets.load(cardNames)
  //   .then(textures => {
  //     const deck = makeCardSprite(textures["2B"], 300, 300);
  //     app.stage.addChild(deck);

  // function gameStarted() {
  //   deckSprite.x -= cardWidth / 2;

  //   const tableCard1 = game.table_cards[0];
  //   tableCard1Sprite = makeCardSprite(tableCard1, tableCardWidth, tableCardHeight);
  //   app.stage.addChild(tableCard1Sprite);

  //   const player1 = game.players[0];

  //   if (player1) {
  //     drawHand("bottom", player1.hand);
  //   }
  // }
