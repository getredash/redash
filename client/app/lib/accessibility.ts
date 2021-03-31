export function srNotify(text: string, expiry = 1000, container = document.body): void {
  const element = document.createElement("div");
  const id = `speak-${Date.now()}`;

  Object.assign(element, {
    id,
    className: "sr-only",
    textContent: text,
  });

  [
    ["role", "alert"],
    ["aria-live", "assertive"],
  ].forEach(([attr, value]) => element.setAttribute(attr, value));

  container.appendChild(element);

  setTimeout(() => {
    container.removeChild(element);
  }, expiry);
}
