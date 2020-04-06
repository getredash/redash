import React from "react";

export default function Editor() {
  return (
    <React.Fragment>
      <p>This visualization expects the query result to have rows in the following format:</p>
      <ul>
        <li>
          <strong>stage1</strong> - stage 1 value
        </li>
        <li>
          <strong>stage2</strong> - stage 2 value (or null)
        </li>
        <li>
          <strong>stage3</strong> - stage 3 value (or null)
        </li>
        <li>
          <strong>stage4</strong> - stage 4 value (or null)
        </li>
        <li>
          <strong>stage5</strong> - stage 5 value (or null)
        </li>
        <li>
          <strong>value</strong> - number of times this sequence occurred
        </li>
      </ul>
    </React.Fragment>
  );
}
