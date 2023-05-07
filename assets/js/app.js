// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
// import "phoenix_html";
import "../css/app.css";
import "./user_socket";
import "./game";

const hideElem = el => el.style.display = "none";

const flashElem = document.querySelector("#flash");

if (flashElem) {
  flashElem.addEventListener("click", _ => {
    hideElem(flashElem);
  });

  setTimeout(() => hideElem(flashElem), 2000);
}
