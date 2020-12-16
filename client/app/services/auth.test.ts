import { currentUser } from "./auth";

describe("currentUser", () => {
  describe("currentUser.isAdmin", () => {
    it("returns state based on permission", () => {
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = ["admin"];

      expect(currentUser.isAdmin).toBeTruthy();

      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [];

      expect(currentUser.isAdmin).toBeFalsy();
    });

    it("allows setting admin status explicitly", () => {
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [];
      currentUser.isAdmin = true;
      expect(currentUser.isAdmin).toBeTruthy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = ["admin"];
      currentUser.isAdmin = true;
      expect(currentUser.isAdmin).toBeTruthy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = ["admin"];
      currentUser.isAdmin = false;
      expect(currentUser.isAdmin).toBeFalsy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [];
      currentUser.isAdmin = false;
      expect(currentUser.isAdmin).toBeFalsy();
    });
  });

  describe("currentUser.hasPermission", () => {
    it("let's override admin status", () => {
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [""];
      currentUser.isAdmin = true;
      expect(currentUser.hasPermission("admin")).toBeTruthy();
      // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
      currentUser.permissions = [""];
      currentUser.isAdmin = false;
      expect(currentUser.hasPermission("admin")).toBeFalsy();
    });
  });
});
