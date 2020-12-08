import React from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'enzy... Remove this comment to see the full error message
import { mount } from "enzyme";
import ErrorMessage from "./ErrorMessage";

const ErrorMessages = {
  UNAUTHORIZED: "It seems like you don’t have permission to see this page.",
  NOT_FOUND: "It seems like the page you're looking for cannot be found.",
  GENERIC: "It seems like we encountered an error. Try refreshing this page or contact your administrator.",
};

function mockAxiosError(status = 500, response = {}) {
  const error = new Error(`Failed with code ${status}.`);
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'isAxiosError' does not exist on type 'Er... Remove this comment to see the full error message
  error.isAxiosError = true;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'response' does not exist on type 'Error'... Remove this comment to see the full error message
  error.response = { status, ...response };
  return error;
}

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("Error Message", () => {
  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'jest'.
  const spyError = jest.spyOn(console, "error");

  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
  beforeEach(() => {
    spyError.mockReset();
  });

  function expectErrorMessageToBe(error: any, errorMessage: any) {
    const component = mount(<ErrorMessage error={error} />);

    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
    expect(component.find(".error-state__details h4").text()).toBe(errorMessage);
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
    expect(spyError).toHaveBeenCalledWith(error);
  }

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
  test("displays a generic message on adhoc errors", () => {
    expectErrorMessageToBe(new Error("technical information"), ErrorMessages.GENERIC);
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
  test("displays a not found message on axios errors with 404 code", () => {
    expectErrorMessageToBe(mockAxiosError(404), ErrorMessages.NOT_FOUND);
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
  test("displays a unauthorized message on axios errors with 401 code", () => {
    expectErrorMessageToBe(mockAxiosError(401), ErrorMessages.UNAUTHORIZED);
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
  test("displays a unauthorized message on axios errors with 403 code", () => {
    expectErrorMessageToBe(mockAxiosError(403), ErrorMessages.UNAUTHORIZED);
  });

  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
  test("displays a generic message on axios errors with 500 code", () => {
    expectErrorMessageToBe(mockAxiosError(500), ErrorMessages.GENERIC);
  });
});
