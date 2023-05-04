import { PIXI } from "../vendor/pixi";
import { socket } from "./user_socket";

const gameContainer = document.querySelector(".game-container");

const gameWidth = 600;
const gameHeight = 600;

const cardSvgWidth = 240;
const cardSvgHeight = 336;
const cardScale = 0.3;

const cardWidth = cardSvgWidth * cardScale;
const cardHeight = cardSvgHeight * cardScale;

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
  let tableCard1Sprite;
  let tableCard2Sprite;

  let handSprites = {bottom: [], left: [], top: [], right: []};

  channel.join()
    .receive("ok", resp => {
      game = resp.game;
      console.log("Joined game", game);
      drawGame();
    })
    .receive("error", resp => console.log("Unable to join", resp));

  channel.on("game", payload => {
    console.log("game message", payload);
    game = payload.game;
  });

  channel.on("game_started", payload => {
    console.log("game started", payload.game)
    game = payload.game;
    gameStarted();
  });

  function animateInitDeck(delta) {
    if (deckSprite.y < gameWidth / 2) {
      deckSprite.y += delta * 6;
    } else {
      deckSprite.y = gameHeight / 2;
      app.ticker.remove(animateInitDeck);
    }
  }

  function drawGame() {
    deckSprite = makeCardSprite("2B", gameWidth / 2, gameHeight / 2);
    if (game.status === "init") {
      deckSprite.y = cardWidth / -2;
      app.ticker.add(animateInitDeck)
    }
    if (game.status !== "init") {
      deckSprite.x -= cardWidth/2;
    }
    app.stage.addChild(deckSprite);

    const tableCard1 = game.table_cards[0];
    const tableCard2 = game.table_cards[1];

    if (tableCard1) {
      tableCard1Sprite = makeCardSprite(tableCard1, gameWidth/2 + cardWidth/2, gameHeight/2);
      app.stage.addChild(tableCard1Sprite);
    }

    if (tableCard2) {
      tableCard2Sprite = makeCardSprite(tableCard2, gameWidth/2 + cardWidth/2, gameHeight/2);
      app.stage.addChild(tableCard2Sprite);
    }

    const player1 = game.players[0];

    if (player1 && player1.hand.length) {
      drawHand("bottom", player1.hand);
    }
  }

  function gameStarted() {
    deckSprite.x -= cardWidth/2;
    const tableCard1 = game.table_cards[0];
    tableCard1Sprite = makeCardSprite(tableCard1, gameWidth/2 + cardWidth/2, gameHeight/2);
    app.stage.addChild(tableCard1Sprite);

    const player1 = game.players[0];

    if (player1) {
      drawHand("bottom", player1.hand);
    }
  }

  const startGameButton = document.querySelector(".start-game-button");

  if (startGameButton) {
    startGameButton.addEventListener("click", _ => {
      channel.push("start_game", {});
    });
  }

  function drawHand(position, cards) {
    for (let i = 0; i < 6; i++) {
      const card = cards[i];

      if (card["face_up?"]) {
        const sprite = makeCardSprite(card.name, 0, 0);
        const coord = handCardCoord(position, i);
        sprite.x = coord.x;
        sprite.y = coord.y;
        handSprites[position][i] = sprite;
        app.stage.addChild(sprite);
      } else {
        const sprite = makeCardSprite("2B", 0, 0);
        const coord = handCardCoord("bottom", i);
        sprite.x = coord.x;
        sprite.y = coord.y;
        handSprites[position][i] = sprite;
        app.stage.addChild(sprite);
      }
    }
  }
}

function handCardCoord(position, index) {
  let x, y;

  if (position === "bottom") {
    if ([0, 1, 2].includes(index)) {
      y = gameHeight - cardHeight * 1.5;
    } else {
      y = gameHeight - cardHeight / 2;
    }

    x = (gameWidth / 2) - cardWidth + (cardWidth * (index % 3));
  }

  return {x, y};
}

const cardPath = name => `/images/cards/${name}.svg`;
  
function makeCardSprite(name, x = 0, y = 0) {
  const sprite = PIXI.Sprite.from(cardPath(name));
  sprite.scale.set(cardScale, cardScale);
  sprite.anchor.set(0.5);
  sprite.x = x;
  sprite.y = y;
  return sprite;
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

