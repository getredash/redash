import React from 'react';

export default function Editor() {
  return (
    <div className="form-horizontal">
      <div>
        This visualization expects the query result to have rows in one of the following formats:

        <div className="m-t-10">
          <strong>Option 1:</strong>
          <ul>
            <li><strong>sequence</strong> - sequence id</li>
            <li><strong>stage</strong> - what stage in sequence this is (1, 2, ...)</li>
            <li><strong>node</strong> - stage name</li>
            <li><strong>value</strong> - number of times this sequence occurred</li>
          </ul>
        </div>

        <div className="m-t-10">
          <strong>Option 2:</strong>
          <ul>
            <li><strong>stage1</strong> - stage 1 value</li>
            <li><strong>stage2</strong> - stage 2 value (or null)</li>
            <li><strong>stage3</strong> - stage 3 value (or null)</li>
            <li><strong>stage4</strong> - stage 4 value (or null)</li>
            <li><strong>stage5</strong> - stage 5 value (or null)</li>
            <li><strong>value</strong> - number of times this sequence occurred</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
