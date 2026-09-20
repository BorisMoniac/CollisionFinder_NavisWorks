const eventName = "nashepo:clash-scene-owner";
/** A hidden panel keeps its data but releases its annotations in the shared scene. */
export function watchSceneOwner(container: HTMLElement, activate: () => void, deactivate: () => void) {
  const owner = crypto.randomUUID();
  let visible = false, active = false;
  const release = () => { if (active) { active = false; deactivate(); } };
  const claim = () => {
    if (!visible || active) return;
    window.dispatchEvent(new CustomEvent(eventName, {detail: owner}));
    active = true;
    activate();
  };
  const update = () => {
    const next = container.isConnected && container.getClientRects().length > 0 &&
      getComputedStyle(container).visibility !== "hidden";
    if (next === visible) return;
    visible = next;
    if (next) claim(); else release();
  };
  const changed = (event: Event) => {
    if ((event as CustomEvent).detail !== owner) release();
  };
  window.addEventListener(eventName, changed);
  container.addEventListener("pointerdown", claim);
  const observer = new ResizeObserver(update);
  observer.observe(container);
  const timer = window.setInterval(update, 200);
  update();
  return () => {
    observer.disconnect(); clearInterval(timer);
    window.removeEventListener(eventName, changed);
    container.removeEventListener("pointerdown", claim);
    release();
  };
}
