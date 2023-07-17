import React from "react";
import { Section } from "@/components/visualizations/editor";

export default function Editor() {
  return (
    <React.Fragment>
      <p>This visualization expects the query result to have rows in one of the following formats:</p>
      {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <Section>
        <p>
          <strong>Option 1:</strong>
        </p>
        <ul>
          <li>
            <strong>sequence</strong> - sequence id
          </li>
          <li>
            <strong>stage</strong> - what stage in sequence this is (1, 2, ...)
          </li>
          <li>
            <strong>node</strong> - stage name
          </li>
          <li>
            <strong>value</strong> - number of times this sequence occurred
          </li>
        </ul>
      </Section>
      {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <Section>
        <p>
          <strong>Option 2:</strong>
        </p>
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
      </Section>
    </React.Fragment>
  );
}
