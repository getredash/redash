import React from 'react';
import PropTypes from 'prop-types';
import { isNumber } from 'lodash';
import numberFormat from 'underscore.string/numberFormat';

import { QueryData, RefObject } from '@/components/proptypes';

function getRowNumber(index, size) {
  if (index >= 0) {
    return index - 1;
  }

  if (Math.abs(index) > size) {
    index %= size;
  }

  return size + index;
}

const CounterOptions = PropTypes.shape({
  counterColName: PropTypes.string.isRequired,
  targetColName: PropTypes.string.isRequired,
  countRow: PropTypes.bool.isRequired,
  rowNumber: PropTypes.number.isRequired,
  targetRowNumber: PropTypes.number.isRequired,
  stringDecimal: PropTypes.number.isRequired,
  stringDecChar: PropTypes.string.isRequired,
  stringThouSep: PropTypes.string.isRequired,
});

export default class CounterRenderer extends React.Component {
  static Options = CounterOptions

  static DEFAULT_OPTIONS = {
    counterColName: 'counter',
    targetColName: null,
    countRow: false,
    rowNumber: 1,
    targetRowNumber: 1,
    stringDecimal: 0,
    stringDecChar: '.',
    stringThouSep: ',',
    defaultColumns: 2,
    defaultRows: 5,
  };

  static propTypes = {
    containerRef: RefObject.isRequired,
    data: QueryData.isRequired,
    options: CounterOptions.isRequired,
    name: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      scale: null,
    };
  }

  componentDidMount() {
    if (this.state.scale === null) this.rescale();
  }

  componentDidUpdate() {
    if (this.state.scale === null) this.rescale();
  }

  rescale() {
    this.setState({
      scale: Math.floor(Math.min(
        this.props.containerRef.current.offsetHeight / this.counterRef.current.offsetHeight,
        this.props.containerRef.current.offsetWidth / this.counterRef.current.offsetWidth,
      ) * 100) / 100,
    });
  }

  counterRef = React.createRef()

  render() {
    if (!this.props.data) return null;
    const opts = this.props.options;
    const rowNumber = getRowNumber(opts.rowNumber, this.props.data.rows.length);
    const targetRowNumber = getRowNumber(opts.targetRowNumber, this.props.data.rows.length);
    let targetValue = null;
    if (opts.targetColName) {
      const row = this.props.data.rows[targetRowNumber];
      if (row) {
        targetValue = [opts.targetColName];
      }
    }
    let counterValue = null;
    if (opts.countRow) {
      counterValue = this.props.data.rows.length;
    } else if (opts.counterColName) {
      const row = this.props.data.rows[rowNumber];
      if (row) {
        counterValue = row[opts.counterColName];
      }
    }
    const delta = opts.targetColName && opts.targetValue && (counterValue - opts.targetValue);
    const trendPositive = delta && delta >= 0;
    const targetValueStr = isNumber(targetValue) && `(${numberFormat(targetValue)})`;
    let trend = '';
    if (targetValue && trendPositive) {
      trend = 'positive';
    } else if (targetValue && !trendPositive) {
      trend = 'negative';
    }
    let counter = counterValue;
    if (isNumber(counterValue) && (opts.stringDecimal || opts.stringDecChar || opts.stringThouSep)) {
      const counterFormatted = numberFormat(
        counterValue, opts.stringDecimal, opts.stringDecChar,
        opts.stringThouSep,
      );
      counter = `${opts.stringPrefix || ''}${counterFormatted}${opts.stringSuffix || ''}`;
    }
    const scale = this.state.scale || 1;
    return (

      <div className="counter-renderer">
        <div className={`counter ${trend}`} ref={this.props.containerRef}>
          <div
            ref={this.counterRef}
            style={{
              oTransform: `scale(${scale})`,
              msTransform: `scale(${scale})`,
              mozTransform: `scale(${scale})`,
              webkitTransform: `scale(${scale})`,
              transform: `scale(${scale})`,
            }}
          >
            <div className="value">
              {counter}
            </div>
            {targetValueStr ?
              <div className="counter-target" title={targetValueStr}>
                {targetValueStr}
              </div> : null }
            <div className="counter-name">
              {this.props.name}
            </div>
          </div>
        </div>
      </div>);
  }
}
