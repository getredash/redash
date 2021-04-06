import { srNotify } from "./accessibility";

describe("Accessibility.srNotify", () => {
  let srCleanup: Function;

  beforeEach(() => {
    srCleanup = srNotify({ text: "Thanks for all the fish", expiry: 999999 });
  });

  afterEach(() => {
    srCleanup();
  });

  test("notification is added to the DOM", () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(document.body.firstElementChild!.textContent).toBe("Thanks for all the fish");
  });

  test("notification is removed from the DOM", () => {
    srCleanup();
    expect(document.body.firstElementChild).toBeNull();
  });
});
