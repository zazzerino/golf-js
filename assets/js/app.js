// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { PIXI } from "../vendor/pixi";
import "../css/app.css";
import "./user_socket.js"

const gameWidth = 600;
const gameHeight = 600;

const app = new PIXI.Application({
  width: gameWidth, 
  height: gameHeight, 
  backgroundColor: 0x22ffdd,
  antialias: true,
});

const gameContainer = document.querySelector(".game-container");
gameContainer.appendChild(app.view);

function makeCardSprite(cardName, x = 0, y = 0) {
  const sprite = PIXI.Sprite.from(`/images/cards/${cardName}.svg`);
  sprite.scale.set(0.4, 0.4);
  sprite.anchor.set(0.5);
  sprite.x = x;
  sprite.y = y;
  return sprite;
}

function drawDeck(container) {
  const sprite = makeCardSprite("2B", 300, 300);
  container.addChild(sprite);
  return sprite;
}

const deck = drawDeck(app.stage);

let elapsed = 0.0;

app.ticker.add(delta => {
  elapsed += delta;
  deck.x = 300 + Math.cos(elapsed / 50) * 100;
  // deck.y = 300 + Math.cos(elapsed / 50) * 100;
});

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

// const cardTextures = PIXI.Assets.load(cardNames)
//   .then(textures => {
//     const card = PIXI.Sprite.from(textures["AS"]);
//     card.scale.set(0.4, 0.4);
//     card.anchor.set(0.5);
//     card.x = 300;
//     card.y = 300;
//     app.stage.addChild(card);
//   });

// Establish Phoenix Socket and LiveView configuration.
// import {Socket} from "phoenix"
// import {LiveSocket} from "phoenix_live_view"
// import topbar from "../vendor/topbar"

// let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
// let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken}})

// Show progress bar on live navigation and form submits
// topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
// window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
// window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
// liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
// window.liveSocket = liveSocket

