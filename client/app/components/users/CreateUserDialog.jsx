import React from 'react';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import { get } from 'lodash';
import { DynamicForm } from '@/components/dynamic-form/DynamicForm';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import recordEvent from '@/services/recordEvent';
import { toastr } from '@/services/ng';
import { absoluteUrl } from '@/services/utils';
import { User } from '@/services/user';
import InputWithCopy from '../InputWithCopy';

class CreateUserDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { savingUser: false, errorMessage: null };
    this.form = React.createRef();
  }

  componentDidMount() {
    recordEvent('view', 'page', 'users/new');
  }

  createUser = () => {
    this.form.current.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.setState({ savingUser: true });
        User.create(values, (user) => {
          toastr.success('Saved.');
          if (user.invite_link) {
            Modal.warning({ title: 'Email not sent!',
              content: (
                <React.Fragment>
                  <p>
                    The mail server is not configured, please send the following link
                    to <b>{user.name}</b>:
                  </p>
                  <InputWithCopy value={absoluteUrl(user.invite_link)} readOnly />
                </React.Fragment>
              ) });
          }
          this.props.dialog.close({ success: true });
        }, (error) => {
          const errorMessage = get(error, 'data.message', 'Failed saving.');
          this.setState({ savingUser: false, errorMessage });
        });
      }
    });
  };

  render() {
    const { savingUser, errorMessage } = this.state;
    const formFields = [
      { name: 'name', title: 'Name', type: 'text' },
      { name: 'email', title: 'Email', type: 'email' },
    ].map(field => ({ required: true, props: { onPressEnter: this.createUser }, ...field }));

    return (
      <Modal
        {...this.props.dialog.props}
        title="Create a New User"
        okText="Create"
        okButtonProps={{ loading: savingUser }}
        onOk={() => this.createUser()}
      >
        <DynamicForm fields={formFields} ref={this.form} hideSubmitButton />
        {errorMessage && <Alert message={errorMessage} type="error" showIcon />}
      </Modal>
    );
  }
}

export default wrapDialog(CreateUserDialog);
