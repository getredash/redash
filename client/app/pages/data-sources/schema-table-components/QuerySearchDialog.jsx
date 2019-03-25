import React from "react";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import PropTypes from "prop-types";
import { Query } from "@/services/query";
import QueryListItem from "./QueryListItem";

export default class QuerySearchDialog extends React.Component {
  static propTypes = {
    onOk: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedQuery: null,
      searchedQueries: [],
    };
  }

  getHighlightedText = (text, highlight) => {
    // Split text on highlight term, include term itself into parts, ignore case
    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <span>
        {parts.map(part => (
          <span style={part.toLowerCase() === highlight.toLowerCase() ? { fontWeight: "bold" } : {}}>{part}</span>
        ))}
      </span>
    );
  };

  createRecentQueriesList = () => {
    if (!this.recentQueries || this.recentQueries.length <= 0) {
      return [];
    }
    return this.recentQueries.map(query => (
      <button key={query.id} className="list-group-item" type="button" onClick={() => this.selectQuery(query)}>
        {query.name}
      </button>
    ));
  };

  createSearchQueriesList = () =>
    this.state.searchedQueries.map(query => (
      <button
        key={query.id}
        type="button"
        className="btn btn-default list-group-item"
        onClick={() => this.selectQuery(query)}>
        {this.getHighlightedText(query.name, this.searchTerm)}
      </button>
    ));

  selectQuery = query => {
    this.setState({ selectedQuery: query });
  };

  searchQueries = e => {
    this.searchTerm = e.target.value;
    Query.query({ q: this.searchTerm }, results => {
      this.setState({ searchedQueries: results.results });
    });
  };

  render() {
    Query.recent().then(items => {
      this.recentQueries = items;
    });

    return (
      <Modal
        title="Add Sample Query"
        visible={this.props.visible}
        onCancel={this.props.onCancel}
        onOk={() => this.props.onOk(this.state.selectedQuery)}
        okText="Add Sample"
        cancelText="Close">
        {this.state.selectedQuery ? (
          <QueryListItem query={this.state.selectedQuery} removeQuery={() => this.selectQuery(null)} />
        ) : (
          <div>
            <div className="form-group">
              <Input
                className="form-control"
                autoFocus
                onChange={this.searchQueries}
                placeholder="Search a query by name..."
              />
            </div>

            <div className="scrollbox" style={{ maxHeight: "50vh" }}>
              {!this.state.searchedQueries || this.state.searchedQueries.length <= 0 ? (
                <div className="list-group">{this.createRecentQueriesList()}</div>
              ) : (
                <div className="list-group">{this.createSearchQueriesList()}</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    );
  }
}
