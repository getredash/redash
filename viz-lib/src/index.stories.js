import React from "react";
import { Button } from "@storybook/react/demo";
import { withKnobs, text, object } from "@storybook/addon-knobs";

export default { title: "Button", decorators: [withKnobs] };

export const withText = () => <Button>{text("Text", "Hello World")}</Button>;

export const withEmoji = () => (
  <div style={object("Style", { backgroundColor: "red" })}>
    <span role="img" aria-label="so cool">
      😀 😎 👍 💯
    </span>
  </div>
);
