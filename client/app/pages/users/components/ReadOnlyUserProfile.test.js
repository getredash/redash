import React from "react";
import { render } from "@testing-library/react";
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

  const { container } = render(<ReadOnlyUserProfile user={user} />);
  expect(container).toMatchSnapshot();
});
