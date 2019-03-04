import { markdown } from 'markdown';
import { debounce } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import Tooltip from 'antd/lib/tooltip';
import Divider from 'antd/lib/divider';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { toastr } from '@/services/ng';

import './AddTextboxDialog.less';

class AddTextboxDialog extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    dialog: DialogPropType.isRequired,
    onConfirm: PropTypes.func.isRequired,
  };

  state = {
    saveInProgress: false,
    text: '',
    preview: '',
  }

  updatePreview = debounce(() => {
    const text = this.state.text;
    this.setState({
      preview: markdown.toHTML(text),
    });
  }, 100);

  onTextChanged = (event) => {
    this.setState({ text: event.target.value });
    this.updatePreview();
  };

  saveWidget() {
    this.setState({ saveInProgress: true });

    this.props.onConfirm(this.state.text)
      .then(() => {
        this.props.dialog.close();
      })
      .catch(() => {
        toastr.error('Widget could not be added');
      })
      .finally(() => {
        this.setState({ saveInProgress: false });
      });
  }

  render() {
    const { dialog } = this.props;

    return (
      <Modal
        {...dialog.props}
        title="Add Textbox"
        onOk={() => this.saveWidget()}
        okButtonProps={{
          loading: this.state.saveInProgress,
          disabled: !this.state.text,
        }}
        okText="Add to Dashboard"
        width={500}
      >
        <div className="add-textbox">
          <Input.TextArea
            className="resize-vertical"
            rows="5"
            value={this.state.text}
            onChange={this.onTextChanged}
            autoFocus
            placeholder="This is where you write some text"
          />
          <small>
            Supports basic{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.markdownguide.org/cheat-sheet/#basic-syntax"
            >
              <Tooltip title="Markdown guide opens in new window">Markdown</Tooltip>
            </a>.
          </small>
          {this.state.text && (
            <React.Fragment>
              <Divider dashed />
              <strong className="preview-title">Preview:</strong>
              <p
                dangerouslySetInnerHTML={{ __html: this.state.preview }} // eslint-disable-line react/no-danger
                className="preview"
              />
            </React.Fragment>
          )}
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(AddTextboxDialog);
