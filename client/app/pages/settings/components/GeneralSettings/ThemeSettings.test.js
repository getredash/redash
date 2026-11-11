import React from "react";
import { render } from "@testing-library/react";
import Form from "antd/lib/form";
import { currentUser } from "@/services/auth";
import ThemeSettings from "./ThemeSettings";

const note = () => document.querySelector('[data-test="DefaultThemeOverriddenNote"]');

const renderSettings = () =>
  render(
    <Form>
      <ThemeSettings values={{ default_theme: "dark" }} onChange={() => {}} loading={false} />
    </Form>
  );

afterEach(() => {
  delete currentUser.theme;
});

test("tells admins with a theme of their own that the default doesn't change what they see", () => {
  currentUser.theme = "system";
  renderSettings();
  expect(note().textContent).toBe("You see the System theme, chosen in your profile.");
});

test("says nothing when the admin uses the organization default", () => {
  currentUser.theme = null;
  renderSettings();
  expect(note()).toBeNull();
});
