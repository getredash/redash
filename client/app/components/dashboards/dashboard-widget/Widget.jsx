import React from 'react';
import PropTypes from 'prop-types';
import recordEvent from '@/services/recordEvent';
import { FiltersType } from '@/components/Filters';
import VisualizationWidget from './VisualizationWidget';
import TextboxWidget from './TextboxWidget';

import './Widget.less';

class Widget extends React.Component {
  static propTypes = {
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    filters: FiltersType,
    isPublic: PropTypes.bool,
    canEdit: PropTypes.bool,
    onDelete: PropTypes.func,
  };

  static defaultProps = {
    filters: [],
    isPublic: false,
    canEdit: false,
    onDelete: () => {},
  };

  componentDidMount() {
    const { widget } = this.props;
    recordEvent('view', 'widget', widget.id);
  }

  // eslint-disable-next-line class-methods-use-this
  renderRestrictedError() {
    return (
      <div className="tile body-container widget-restricted">
        <div className="t-body body-row-auto scrollbox">
          <div className="text-center">
            <h1><span className="zmdi zmdi-lock" /></h1>
            <p className="text-muted">
              {'This widget requires access to a data source you don\'t have access to.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { widget, isPublic, canEdit, onDelete } = this.props;

    return (
      <div className="widget-wrapper">
        {widget.visualization && <VisualizationWidget {...this.props} />}
        {(!widget.visualization && widget.restricted) && this.renderRestrictedError()}
        {(!widget.visualization && !widget.restricted && widget.width !== 0) && (
          <TextboxWidget
            widget={widget}
            showDropdown={!isPublic && canEdit}
            showDeleteButton={!isPublic && canEdit}
            onDelete={onDelete}
          />
        )}
      </div>
    );
  }
}

export default Widget;
