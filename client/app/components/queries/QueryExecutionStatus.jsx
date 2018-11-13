import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

export default class QueryExecutionStatus extends React.Component {
  static propTypes = {
    query: PropTypes.object.isRequired,
    queryResult: PropTypes.object.isRequired,
    // XXX temp hack
    status: PropTypes.string,
  }


  static defaultProps = {
    status: null,
  }
  constructor(props) {
    super(props);
    this.state = {
      currentTime: '00:00:00',
      cancelling: false,
    };
  }

  componentDidMount() {
    this.startTimer();
  }

  componentDidUpdate() {
    if (this.props.status === 'processing' || this.props.status === 'waiting') {
      this.startTimer();
    }
  }

  componentWillUnmount() {
    if (this.currentTimer) {
      clearInterval(this.currentTimer);
    }
  }

  startTimer = () => {
    const self = this;
    this.currentTimer = setInterval(() => {
      const timestamp = self.props.queryResult.getUpdatedAt();
      self.setState({
        currentTime: moment(moment() - moment(timestamp)).utc().format('HH:mm:ss'),
        error: self.props.queryResult.getError(),
      });
      if (self.currentTimer && self.props.status !== 'processing' && self.props.status !== 'waiting') {
        clearInterval(self.currentTimer);
        self.currentTimer = null;
      }
    }, 1000);
  }

  cancelExecution = () => {
    this.setState({ cancelling: true });
    this.props.queryResult.cancelExecution();
    this.props.Events.record('cancel_execute', 'query', this.props.query.id);
  }

  render() {
    let display;
    let error;
    if (this.props.status === 'processing') {
      display = (
        <div className="alert alert-info m-t-15">
          Executing query&hellip;
          {this.state.currentTime}
          <button
            type="button"
            className="btn btn-warning btn-xs pull-right"
            disabled={this.state.cancelling}
            onClick={this.cancelExecution}
          >Cancel
          </button>
        </div>
      );
    } else if (this.props.status === 'waiting') {
      display = (
        <div className="alert alert-info m-t-15">
          Query in queue&hellip;
          {this.state.currentTime}
          <button
            type="button"
            className="btn btn-warning btn-xs pull-right"
            disabled={this.state.cancelling}
            onClick={this.cancelExecution}
          >Cancel
          </button>
        </div>
      );
    } else if (this.props.status === 'loading-result') {
      display = (
        <div className="alert alert-info m-t-15">
          Loading results&hellip;
          {this.state.currentTime}
        </div>
      );
    }
    if (this.state.error) {
      error = (
        <div className="alert alert-danger m-t-15">Error running query: <strong>{this.state.error}</strong>
        </div>
      );
    }
    return (
      <div className="query-alerts">
        {display}
        {error}
      </div>
    );
  }
}
