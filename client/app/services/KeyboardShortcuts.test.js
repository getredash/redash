import KeyboardShortcuts from "./KeyboardShortcuts";

function pressCtrlEnter() {
  const event = new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true });
  Object.defineProperty(event, "keyCode", { value: 13 });
  Object.defineProperty(event, "which", { value: 13 });
  document.dispatchEvent(event);
}

describe("KeyboardShortcuts", () => {
  test("a handler runs once when two of its shortcuts are the same keys", () => {
    // Outside macOS (and in jsdom) `mod` is Ctrl
    const handler = jest.fn();
    const keymap = { "mod+enter, alt+enter, ctrl+enter": handler };
    KeyboardShortcuts.bind(keymap);
    try {
      pressCtrlEnter();
      expect(handler).toHaveBeenCalledTimes(1);
      pressCtrlEnter();
      expect(handler).toHaveBeenCalledTimes(2);
    } finally {
      KeyboardShortcuts.unbind(keymap);
    }
  });

  test("different handlers of the same keys all run", () => {
    const first = jest.fn();
    const second = jest.fn();
    KeyboardShortcuts.bind({ "ctrl+enter": first });
    KeyboardShortcuts.bind({ "mod+enter": second });
    try {
      pressCtrlEnter();
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    } finally {
      KeyboardShortcuts.unbind({ "ctrl+enter": first });
      KeyboardShortcuts.unbind({ "mod+enter": second });
    }
  });
});
