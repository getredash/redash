import moment from "moment";
import { toMoment, toMomentRange } from "./dateTimeUtils";

describe("dateTimeUtils", () => {
  test("normalizes invalid moment instances to null", () => {
    expect(toMoment(moment.invalid())).toBeNull();
  });

  test("normalizes ranges with invalid moment entries to null", () => {
    expect(toMomentRange([moment(), moment.invalid()])).toBeNull();
  });

  test("keeps valid moment instances unchanged", () => {
    const value = moment("2024-04-05T12:30:00Z");
    expect(toMoment(value)).toBe(value);
  });
});
