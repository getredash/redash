import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import Menu from 'antd/lib/menu';
import recordEvent from '@/services/recordEvent';
import { FiltersType } from '@/components/Filters';

import './Widget.less';

function WidgetDropdownButton({ extraOptions, showDeleteOption, onDelete, ...otherProps }) {
  const WidgetMenu = (
    <Menu {...otherProps}>
      {extraOptions}
      {(showDeleteOption && extraOptions) && <Menu.Divider />}
      {showDeleteOption && <Menu.Item onClick={onDelete}>Remove from Dashboard</Menu.Item>}
    </Menu>
  );

  return (
    <div className="dropdown pull-right widget-menu-regular">
      <div className="actions">
        <Dropdown
          overlay={WidgetMenu}
          placement="bottomRight"
          trigger={['click']}
        >
          <a className="p-l-15 p-r-15"><i className="zmdi zmdi-more-vert" /></a>
        </Dropdown>
      </div>
    </div>
  );
}

WidgetDropdownButton.propTypes = {
  extraOptions: PropTypes.node,
  showDeleteOption: PropTypes.bool,
  onDelete: PropTypes.func,
};

WidgetDropdownButton.defaultProps = {
  extraOptions: null,
  showDeleteOption: false,
  onDelete: () => {},
};

function WidgetDeleteButton({ onClick }) {
  return (
    <div className="dropdown pull-right widget-menu-remove">
      <div className="actions">
        <a title="Remove From Dashboard" onClick={onClick}><i className="zmdi zmdi-close" /></a>
      </div>
    </div>
  );
}

WidgetDeleteButton.propTypes = { onClick: PropTypes.func };
WidgetDeleteButton.defaultProps = { onClick: () => {} };

class Widget extends React.Component {
  static propTypes = {
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    className: PropTypes.string,
    children: PropTypes.node,
    filters: FiltersType,
    canEdit: PropTypes.bool,
    isPublic: PropTypes.bool,
    menuOptions: PropTypes.node,
    onDelete: PropTypes.func,
  };

  static defaultProps = {
    className: '',
    children: null,
    filters: [],
    canEdit: false,
    isPublic: false,
    menuOptions: null,
    onDelete: () => {},
  };

  componentDidMount() {
    const { widget } = this.props;
    recordEvent('view', 'widget', widget.id);
  }

  deleteWidget = () => {
    const { widget, onDelete } = this.props;

    Modal.confirm({
      title: 'Delete Widget',
      content: 'Are you sure you want to remove this widget from the dashboard?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => widget.delete().then(onDelete),
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  render() {
    const { className, children, filters, canEdit, isPublic, menuOptions, onDelete, ...otherProps } = this.props;

    return (
      <div className="widget-wrapper">
        <div {...otherProps} className={cx('tile body-container', className)}>
          <div className="body-row widget-header">
            <div className="t-header widget clearfix">
              {canEdit && <WidgetDeleteButton onClick={this.deleteWidget} />}
              {!isPublic && (
                <WidgetDropdownButton
                  extraOptions={menuOptions}
                  showDeleteOption={canEdit}
                  onDelete={this.deleteWidget}
                />
              )}
            </div>
          </div>
          {children}
        </div>
      </div>
    );
  }
}

export default Widget;
