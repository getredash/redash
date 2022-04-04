// example of custom component with Webix UI inside
// this one is a static view, not linked to the React data store

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { reverse } from 'lodash';

import * as webix from 'webix/webix.js';
import 'webix/webix.css';

webix.DataStore.prototype.sorting.as.float = function (a, b) {
  return a > b ? 1 : -1;
}

class Webix extends Component {
  render() { 
    return (
      <div ref="root"></div>
    );
  }

  setWebixData(data, groupObjs=[]){
    const ui = this.ui;
    if (ui.setValues) {
      ui.setValues(data);
    }
    else if (ui.parse) {
      ui.parse(data)
    }
    else if (ui.setValue) {
      ui.setValue(data);  
    }
    if (groupObjs.length > 0) {
      var useZero = false
      for (var groupObj of groupObjs) {
        if (!useZero) {
          ui.group(groupObj)
          useZero = true
        } else {
          ui.group(groupObj, 0)
        }
      }
    }
  }

  componentWillUnmount(){
    this.ui.destructor();
    this.ui = null;
  }
  shouldComponentUpdate(nextProps, nextState)

  componentWillUpdate(props){
    if (this.ui) {
      this.ui.destructor()
      this.ui = webix.ui(
        this.props.ui, 
        ReactDOM.findDOMNode(this.refs.root)
      );
    }
    if (props.data)
      this.setWebixData(props.data, props.groupObjs);
    if (props.select)
      this.select(props.select);
  }

  componentDidMount(){
  	this.ui = webix.ui(
  	  this.props.ui, 
  	  ReactDOM.findDOMNode(this.refs.root)
	  );
    this.setWebixData(this.props.data, this.props.groupObjs);
  }
  
}

export default Webix;