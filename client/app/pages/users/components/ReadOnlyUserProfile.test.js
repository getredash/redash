import React from "react";
import { render, act } from "@testing-library/react";
import Group from "@/services/group";
import ReadOnlyUserProfile from "./ReadOnlyUserProfile";

beforeEach(() => {
  Group.query = jest.fn().mockResolvedValue([]);
});

test("renders correctly", async () => {
  const user = {
    id: 2,
    name: "John Doe",
    email: "john@doe.com",
    groupIds: [],
    profileImageUrl: "http://www.images.com/llama.jpg",
  };

  let container;
  await act(async () => {
    ({ container } = render(<ReadOnlyUserProfile user={user} />));
  });
  expect(container).toMatchSnapshot();
});
