/* eslint-disable react/prop-types */
import { extend, trim } from 'lodash';
import React from 'react';
import { formatSimpleTemplate } from '@/lib/value-format';

export default function initImageColumn(column) {
  function prepareData(row) {
    row = extend({ '@': row[column.name] }, row);

    const src = trim(formatSimpleTemplate(column.imageUrlTemplate, row));
    if (src === '') {
      return {};
    }

    const width = parseInt(formatSimpleTemplate(column.imageWidth, row), 10);
    const height = parseInt(formatSimpleTemplate(column.imageHeight, row), 10);
    const title = trim(formatSimpleTemplate(column.imageTitleTemplate, row));

    const result = { src };

    if (Number.isFinite(width) && (width > 0)) {
      result.width = width;
    }
    if (Number.isFinite(height) && (height > 0)) {
      result.height = height;
    }
    if (title !== '') {
      result.text = title; // `text` is used for search
      result.title = title;
      result.alt = title;
    }

    return result;
  }

  function ImageColumn({ row }) {
    const { text, ...props } = prepareData(row);
    return <img alt="" {...props} />;
  }

  ImageColumn.prepareData = prepareData;

  return ImageColumn;
}

initImageColumn.friendlyName = 'Image';
