import React from "react";
import PropTypes from "prop-types";
import { Query } from "@/components/proptypes";
import Input from "antd/lib/input";
import QueryListItem from "./QueryListItem";
import QuerySearchDialog from "./QuerySearchDialog";

export default class SampleQueryList extends React.Component {
  static propTypes = {
    value: PropTypes.objectOf(PropTypes.shape(Query)),
    onChange: PropTypes.func,
  };

  static defaultProps = {
    value: {},
    onChange: () => {},
  };

  constructor(props) {
    super(props);

    this.state = {
      searchDialogOpen: false,
      sampleQueries: Object.keys(this.props.value).length > 0 ? this.props.value : {},
    };
  }

  createSampleQueriesList = () => {
    const sampleQueryValues = Object.values(this.state.sampleQueries);
    if (sampleQueryValues.length <= 0) {
      return (
        <div className="p-relative">
          <Input className="bg-white" readOnly="readonly" disabled placeholder="Add new query sample..." />
        </div>
      );
    }

    return sampleQueryValues.map(query => (
      <QueryListItem key={query.id} query={query} removeQuery={() => this.removeSampleQuery(query)} />
    ));
  };

  removeSampleQuery = query => {
    const newSampleQueries = Object.assign({}, this.state.sampleQueries);
    delete newSampleQueries[query.id];
    this.setState({ sampleQueries: newSampleQueries });
    this.props.onChange(newSampleQueries);
  };

  addSampleQuery = newQuery => {
    const newSampleQueries = Object.assign({}, this.state.sampleQueries);
    newSampleQueries[newQuery.id] = newQuery;
    this.setState({
      searchDialogOpen: false,
      sampleQueries: newSampleQueries,
    });
    this.props.onChange(newSampleQueries);
  };

  openSearchDialog = () => {
    this.setState({ searchDialogOpen: true });
  };

  closeSearchDialog = () => {
    this.setState({ searchDialogOpen: false });
  };

  render() {
    return (
      <div>
        <div className="sample-list">{this.createSampleQueriesList()}</div>
        <div title="Add a sample" className="add-sample">
          <button className="btn btn-primary" type="button" onClick={this.openSearchDialog}>
            +
          </button>
        </div>
        <QuerySearchDialog
          visible={this.state.searchDialogOpen}
          onOk={this.addSampleQuery}
          onCancel={this.closeSearchDialog}
        />
      </div>
    );
  }
}
