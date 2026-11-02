import React from "react";
import { render, waitFor } from "@testing-library/react";
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

  const { asFragment, queryByText } = render(<ReadOnlyUserProfile user={user} />);
  // wait for the user's groups to load
  await waitFor(() => expect(queryByText("Loading...")).toBeNull());
  expect(asFragment()).toMatchSnapshot();
});
