import { currentUser } from "./auth";

describe("currentUser", () => {
  describe("currentUser.isAdmin", () => {
    it("returns state based on permission", () => {
      currentUser.permissions = ["admin"];

      expect(currentUser.isAdmin).toBeTruthy();

      currentUser.permissions = [];

      expect(currentUser.isAdmin).toBeFalsy();
    });

    it("allows setting admin status explicitly", () => {
      currentUser.permissions = [];
      currentUser.isAdmin = true;
      expect(currentUser.isAdmin).toBeTruthy();
      currentUser.permissions = ["admin"];
      currentUser.isAdmin = true;
      expect(currentUser.isAdmin).toBeTruthy();
      currentUser.permissions = ["admin"];
      currentUser.isAdmin = false;
      expect(currentUser.isAdmin).toBeFalsy();
      currentUser.permissions = [];
      currentUser.isAdmin = false;
      expect(currentUser.isAdmin).toBeFalsy();
    });
  });

  describe("currentUser.hasPermission", () => {
    it("let's override admin status", () => {
      currentUser.permissions = [""];
      currentUser.isAdmin = true;
      expect(currentUser.hasPermission("admin")).toBeTruthy();
      currentUser.permissions = [""];
      currentUser.isAdmin = false;
      expect(currentUser.hasPermission("admin")).toBeFalsy();
    });
  });
});
