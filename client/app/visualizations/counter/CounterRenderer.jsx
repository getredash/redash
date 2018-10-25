import React from 'react';
import PropTypes from 'prop-types';
import { isNumber } from 'lodash';
import numberFormat from 'underscore.string/numberFormat';

import { QueryData } from '@/components/proptypes';

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
        this.rootRef.current.offsetHeight / this.containerRef.current.offsetHeight,
        this.rootRef.current.offsetWidth / this.containerRef.current.offsetWidth,
      ) * 100) / 100,
    });
  }

  rootRef = React.createRef()
  containerRef = React.createRef()

  render() {
    if (!this.props.data) return null;
    const opts = this.props.options;
    const rowNumber = getRowNumber(opts.rowNumber, this.props.data.rows.length);
    const targetRowNumber = getRowNumber(opts.targetRowNumber, this.props.data.rows.length);
    const targetValue = opts.targetColName && this.props.data.rows[targetRowNumber][opts.targetColName];
    let counterValue = null;
    if (opts.countRow) {
      counterValue = this.props.data.rows.length;
    } else if (opts.counterColName) {
      counterValue = this.props.data.rows[rowNumber][opts.counterColName];
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
        <div className={`counter ${trend}`} ref={this.rootRef}>
          <div
            ref={this.containerRef}
            style={{
              '-o-transform': `scale(${scale})`,
              '-ms-transform': `scale(${scale})`,
              '-moz-transform': `scale(${scale})`,
              '-webkit-transform': `scale(${scale})`,
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
