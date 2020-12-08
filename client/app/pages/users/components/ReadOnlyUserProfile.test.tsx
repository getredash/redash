import React from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'reac... Remove this comment to see the full error message
import renderer from "react-test-renderer";
import Group from "@/services/group";
import ReadOnlyUserProfile from "./ReadOnlyUserProfile";

// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'beforeEach'.
beforeEach(() => {
  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'jest'.
  Group.query = jest.fn().mockResolvedValue([]);
});

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
test("renders correctly", () => {
  const user = {
    id: 2,
    name: "John Doe",
    email: "john@doe.com",
    groupIds: [],
    profileImageUrl: "http://www.images.com/llama.jpg",
  };

  const component = renderer.create(<ReadOnlyUserProfile user={user} />);
  const tree = component.toJSON();
  // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
  expect(tree).toMatchSnapshot();
});
