import { currentUser } from "./auth";

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("currentUser", () => {
  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("currentUser.isAdmin", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'it'. Do you need to install type... Remove this comment to see the full error message
    it("returns state based on permission", () => {
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = ["admin"];

      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.isAdmin).toBeTruthy();

      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [];

      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.isAdmin).toBeFalsy();
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'it'. Do you need to install type... Remove this comment to see the full error message
    it("allows setting admin status explicitly", () => {
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [];
      currentUser.isAdmin = true;
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.isAdmin).toBeTruthy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = ["admin"];
      currentUser.isAdmin = true;
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.isAdmin).toBeTruthy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = ["admin"];
      currentUser.isAdmin = false;
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.isAdmin).toBeFalsy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [];
      currentUser.isAdmin = false;
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.isAdmin).toBeFalsy();
    });
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("currentUser.hasPermission", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'it'. Do you need to install type... Remove this comment to see the full error message
    it("let's override admin status", () => {
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [""];
      currentUser.isAdmin = true;
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.hasPermission("admin")).toBeTruthy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [""];
      currentUser.isAdmin = false;
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(currentUser.hasPermission("admin")).toBeFalsy();
    });
  });
});
