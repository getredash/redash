/* eslint-disable react/prop-types */

import { isFinite, isString, isArray, isObject, keys, map } from "lodash";
import React, { useState } from "react";
import cx from "classnames";
import PropTypes from "prop-types";

import "./json-view-interactive.less";

function JsonBlock({ value, children, openingBrace, closingBrace, withKeys }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const objectKeys = keys(value);
  const count = objectKeys.length;

  return (
    <React.Fragment>
      {count > 0 && (
        <span className="jvi-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          <i className={cx("fa", { "fa-caret-right": !isExpanded, "fa-caret-down": isExpanded })} />
        </span>
      )}
      <span className="jvi-punctuation jvi-braces">{openingBrace}</span>
      {!isExpanded && count > 0 && (
        <span className="jvi-punctuation jvi-ellipsis" onClick={() => setIsExpanded(true)}>
          &hellip;
        </span>
      )}
      {isExpanded && (
        <span className="jvi-block">
          {map(objectKeys, (key, index) => {
            const isFirst = index === 0;
            const isLast = index === count - 1;
            const comma = isLast ? null : <span className="jvi-punctuation jvi-comma">,</span>;
            return (
              <span
                key={"item-" + key}
                className={cx("jvi-item", { "jvi-nested-first": isFirst, "jvi-nested-last": isLast })}>
                {withKeys && (
                  <span className="jvi-object-key">
                    <JsonValue value={key}>
                      <span className="jvi-punctuation">: </span>
                    </JsonValue>
                  </span>
                )}
                <JsonValue value={value[key]}>{comma}</JsonValue>
              </span>
            );
          })}
        </span>
      )}
      <span className="jvi-punctuation jvi-braces">{closingBrace}</span>
      {children}
      {!isExpanded && <span className="jvi-comment">{" // " + count + " " + (count === 1 ? "item" : "items")}</span>}
    </React.Fragment>
  );
}

function JsonValue({ value, children }) {
  if (value === null || value === false || value === true || isFinite(value)) {
    return (
      <span className="jvi-value jvi-primitive">
        {"" + value}
        {children}
      </span>
    );
  }
  if (isString(value)) {
    return (
      <React.Fragment>
        <span className="jvi-punctuation jvi-string">&quot;</span>
        <span className="jvi-value jvi-string">{value}</span>
        <span className="jvi-punctuation jvi-string">&quot;</span>
        {children}
      </React.Fragment>
    );
  }
  if (isArray(value)) {
    return (
      <JsonBlock value={value} openingBrace="[" closingBrace="]">
        {children}
      </JsonBlock>
    );
  }
  if (isObject(value)) {
    return (
      <JsonBlock value={value} openingBrace="{" closingBrace="}" withKeys>
        {children}
      </JsonBlock>
    );
  }
  return null;
}

export default function JsonViewInteractive({ value }) {
  return (
    <span className="jvi-item jvi-root">
      <JsonValue value={value} />
    </span>
  );
}

JsonViewInteractive.propTypes = {
  value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
};

JsonViewInteractive.defaultProps = {
  // `null` will be rendered as "null" because it is a valid JSON value, so use `undefined` for no value
  value: undefined,
};
