// Start the clock at a fixed date but let it keep running: debounced callbacks
// (use-debounce) measure elapsed time with Date.now() and never fire on a frozen clock.
jest.useFakeTimers({ now: new Date("2000-01-01T02:00:00.000"), advanceTimers: true });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
