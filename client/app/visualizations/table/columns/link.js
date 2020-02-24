/* eslint-disable react/prop-types */
import { extend, trim } from 'lodash';
import React from 'react';
import { formatSimpleTemplate } from '@/lib/value-format';

export default function initLinkColumn(column) {
  function prepareData(row) {
    row = extend({ '@': row[column.name] }, row);

    const href = trim(formatSimpleTemplate(column.linkUrlTemplate, row));
    if (href === '') {
      return {};
    }

    const title = trim(formatSimpleTemplate(column.linkTitleTemplate, row));
    const text = trim(formatSimpleTemplate(column.linkTextTemplate, row));

    const result = {
      href,
      text: text !== '' ? text : href,
    };

    if (title !== '') {
      result.title = title;
    }
    if (column.linkOpenInNewTab) {
      result.target = '_blank';
    }

    return result;
  }

  function LinkColumn({ row }) {
    const { text, ...props } = prepareData(row);
    return <a {...props}>{text}</a>;
  }

  LinkColumn.prepareData = prepareData;

  return LinkColumn;
}

initLinkColumn.friendlyName = 'Link';
