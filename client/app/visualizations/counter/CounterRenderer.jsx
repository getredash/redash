import React from 'react';
import PropTypes from 'prop-types';
import { isNumber, map, sum } from 'lodash';
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

const CounterOptions = PropTypes.exact({
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
      height: 0,
      rulerHeight: 0,
    };
  }

  componentDidMount() {
    // Haven't found a better way to do this yet.
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({ rulerHeight: this.calculateHeight(), height: this.rootRef.current.offsetHeight });
  }

  componentDidUpdate() {
    const height = this.rootRef.current.offsetHeight;
    const rulerHeight = this.calculateHeight();
    if (height !== this.state.height || rulerHeight !== this.state.rulerHeight) {
      // this is OK since it converges.
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ height, rulerHeight });
    }
  }

  calculateHeight() {
    // XXX this grows without limit
    const rulers = [this.counterRef.current, this.nameRef.current];
    if (this.targetRef.current) {
      rulers.push(this.targetRef.current);
    }
    return sum(map(rulers, 'offsetHeight'));
  }

  rootRef = React.createRef()
  counterRef = React.createRef()
  targetRef = React.createRef()
  nameRef = React.createRef()

  computeFontSize = () => {
    if (!this.state.rulerHeight) return '1em';
    const fontSize = parseInt(window.getComputedStyle(this.rootRef.current).fontSize.match(/(\d+)px/)[1], 10);
    const height = this.rootRef.current.offsetHeight;
    const rulerHeight = this.calculateHeight();
    return Math.floor(height / rulerHeight * fontSize);
  }

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

    return (
      <div className="counter-renderer">
        <div className={`counter ${trend}`} ref={this.rootRef} style={{ fontSize: this.computeFontSize() }}>
          <div className="value">
            <span className="ruler" ref={this.counterRef} title={counter}>
              {counter}
            </span>
          </div>
          {targetValueStr ?
            <div className="counter-target" title={targetValueStr}>
              <span className="ruler" ref={this.targetRef}>{targetValueStr}</span>
            </div> : null }
          <div className="counter-name">
            <span className="ruler" ref={this.nameRef} title={this.props.name}>
              {this.props.name}
            </span>
          </div>
        </div>
      </div>);
  }
}
