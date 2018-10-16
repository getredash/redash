import React from 'react';
import PropTypes from 'prop-types';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import PivotTable from 'react-pivottable/PivotTable';
import 'react-pivottable/pivottable.css';
import './pivot.less';

export default class PivotRenderer extends React.Component {
  static DEFAULT_OPTIONS = Object.freeze({
    controls: Object.freeze({ enabled: false }),
  })

  static propTypes = {
    data: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  updateOptions = (opts) => {
    delete opts.aggregators;
    delete opts.renderers;
    delete opts.onRefresh;
    return this.props.updateOptions(opts);
  }


  render() {
    const PivotView = this.props.options.controls.enabled ? PivotTable : PivotTableUI;
    return <PivotView data={this.props.data.rows} onChange={this.updateOptions} {...this.props.options} />;
  }
}
