const MockDate = require('mockdate');

// Set a fixed date for all tests
beforeAll(() => {
  // Set to January 15, 2023, noon UTC
  // This ensures consistent date/time calculations regardless of the test environment
  MockDate.set('2023-01-15T12:00:00Z');
});

afterAll(() => {
  // Reset the mocked date after tests complete
  MockDate.reset();
});
