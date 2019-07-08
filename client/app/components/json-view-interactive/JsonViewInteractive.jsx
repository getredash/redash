/* eslint-disable react/prop-types */

import { isFinite, isString, isArray, isObject, keys, map } from 'lodash';
import React, { useState } from 'react';
import cx from 'classnames';
import PropTypes from 'prop-types';

import './json-view-interactive.less';

function JsonArray({ value, children }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const count = value.length;
  const toggle = (
    <span className="jvi-toggle" onClick={() => setIsExpanded(!isExpanded)}>
      <i className={cx('fa', { 'fa-caret-right': !isExpanded, 'fa-caret-down': isExpanded })} />
    </span>
  );
  const openingBrace = <span className="jvi-punctuation jvi-braces">[</span>;
  const closingBrace = <span className="jvi-punctuation jvi-braces">]</span>;

  if (isExpanded) {
    return (
      <React.Fragment>
        {toggle}
        {openingBrace}
        <span className="jvi-block">
          {map(value, (item, index) => {
            const isFirst = index === 0;
            const isLast = index === count - 1;
            const comma = isLast ? null : <span className="jvi-punctuation jvi-comma">,</span>;
            return (
              <span
                key={'item' + index}
                className={cx('jvi-item', { 'jvi-nested-first': isFirst, 'jvi-nested-last': isLast })}
              >
                <JsonValue value={item}>{comma}</JsonValue>
              </span>
            );
          })}
        </span>
        {closingBrace}
        {children}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      {toggle}
      {openingBrace}
      <span className="jvi-punctuation jvi-ellipsis" onClick={() => setIsExpanded(true)}>&hellip;</span>
      {closingBrace}
      {children}
      <span className="jvi-comment">{' // ' + count + ' ' + (count === 1 ? 'item' : 'items')}</span>
    </React.Fragment>
  );
}

function JsonObject({ value, children }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const objectKeys = keys(value);

  const count = objectKeys.length;
  const toggle = (
    <span className="jvi-toggle" onClick={() => setIsExpanded(!isExpanded)}>
      <i className={cx('fa', { 'fa-caret-right': !isExpanded, 'fa-caret-down': isExpanded })} />
    </span>
  );
  const openingBrace = <span className="jvi-punctuation jvi-braces">{'{'}</span>;
  const closingBrace = <span className="jvi-punctuation jvi-braces">{'}'}</span>;

  if (isExpanded) {
    return (
      <React.Fragment>
        {toggle}
        {openingBrace}
        <span className="jvi-block">
          {map(objectKeys, (key, index) => {
            const isFirst = index === 0;
            const isLast = index === count - 1;
            const comma = isLast ? null : <span className="jvi-punctuation jvi-comma">,</span>;
            return (
              <span
                key={key}
                className={cx('jvi-item', { 'jvi-nested-first': isFirst, 'jvi-nested-last': isLast })}
              >
                <span className="jvi-object-key">
                  <JsonValue value={key}>
                    <span className="jvi-punctuation">: </span>
                  </JsonValue>
                </span>
                <JsonValue value={value[key]}>{comma}</JsonValue>
              </span>
            );
          })}
        </span>
        {closingBrace}
        {children}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      {toggle}
      {openingBrace}
      <span className="jvi-punctuation jvi-ellipsis" onClick={() => setIsExpanded(true)}>&hellip;</span>
      {closingBrace}
      {children}
      <span className="jvi-comment">{' // ' + count + ' ' + (count === 1 ? 'item' : 'items')}</span>
    </React.Fragment>
  );
}

function JsonValue({ value, children }) {
  if ((value === null) || (value === false) || (value === true) || isFinite(value)) {
    return (
      <span className="jvi-value jvi-primitive">
        {'' + value}
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
    return <JsonArray value={value}>{children}</JsonArray>;
  }
  if (isObject(value)) {
    return <JsonObject value={value}>{children}</JsonObject>;
  }
  return null;
}

export default function JsonViewInteractive({ value }) {
  return (
    <span className="jvi-item">
      <JsonValue value={value} />
    </span>
  );
}

JsonViewInteractive.propTypes = {
  value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
};

JsonViewInteractive.defaultProps = {
  value: undefined, // `null` will be rendered as "null" is it is a valid JSON value, so use `undefined` for no value
};
