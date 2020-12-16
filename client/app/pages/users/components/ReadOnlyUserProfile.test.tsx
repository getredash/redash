import React from "react";
import renderer from "react-test-renderer";
import Group from "@/services/group";
import ReadOnlyUserProfile from "./ReadOnlyUserProfile";

beforeEach(() => {
  Group.query = jest.fn().mockResolvedValue([]);
});

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
  expect(tree).toMatchSnapshot();
});
