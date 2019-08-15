import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { markdown } from 'markdown';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Modal from 'antd/lib/modal';
import HtmlContent from '@/components/HtmlContent';
import TextboxDialog from '@/components/dashboards/TextboxDialog';

function TextboxWidget({ widget, showDropdown, showDeleteButton, onDelete }) {
  const [text, setText] = useState(widget.text);

  const editTextBox = () => {
    TextboxDialog.showModal({
      text: widget.text,
      onConfirm: (newText) => {
        widget.text = newText;
        setText(newText);
        return widget.save();
      },
    });
  };

  const deleteTextbox = () => {
    Modal.confirm({
      title: 'Delete Textbox',
      content: 'Are you sure you want to remove this textbox from the dashboard?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => widget.delete().then(onDelete),
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  const TextboxMenu = (
    <Menu>
      <Menu.Item onClick={editTextBox}>Edit</Menu.Item>
      <Menu.Item onClick={deleteTextbox}>Remove from Dashboard</Menu.Item>
    </Menu>
  );

  return (
    <div className="tile body-container widget-text textbox">
      <div className="body-row clearfix t-body">
        {showDeleteButton && (
          <div className="dropdown pull-right widget-menu-remove">
            <div className="dropdown-header">
              <a className="actions" title="Remove From Dashboard" onClick={deleteTextbox}><i className="zmdi zmdi-close" /></a>
            </div>
          </div>
        )}
        {showDropdown && (
          <div className="dropdown pull-right widget-menu-regular">
            <div className="dropdown-header">
              <Dropdown
                overlay={TextboxMenu}
                placement="bottomRight"
                trigger={['click']}
              >
                <a className="actions p-l-15 p-r-15"><i className="zmdi zmdi-more-vert" /></a>
              </Dropdown>
            </div>
          </div>
        )}
      </div>
      <HtmlContent className="body-row-auto scrollbox tiled t-body p-15 markdown">
        {markdown.toHTML(text || '')}
      </HtmlContent>
    </div>
  );
}

TextboxWidget.propTypes = {
  widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  showDropdown: PropTypes.bool,
  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
};

TextboxWidget.defaultProps = {
  showDropdown: false,
  showDeleteButton: false,
  onDelete: () => {},
};

export default TextboxWidget;
