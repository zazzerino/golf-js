// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"

const gameContainer = document.querySelector(".game-container");
const gameWidth = 600;
const gameHeight = 600;

const app = new PIXI.Application({width: gameWidth, height: gameHeight, backgroundColor: 0x22ffdd});
gameContainer.appendChild(app.view);

const sprite = PIXI.Sprite.from("/images/cards/AS.svg");
sprite.scale.set(0.35, 0.35);
sprite.anchor.set(0.5);
sprite.x = 300;
sprite.y = 300;
app.stage.addChild(sprite);

let elapsed = 0.0;

app.ticker.add(delta => {
  elapsed += delta;
  sprite.x = 300 + Math.cos(elapsed /50) * 100;
});

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

