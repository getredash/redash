import React from 'react';
import ReactDOM from 'react-dom';

const asUIBModal = (WrappedComponent) => {
  const container = document.createElement('div');

  const render = (component) => {
    ReactDOM.render(component, container);
    document.body.appendChild(container);
  };

  const destroy = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  };

  const getResult = props => new Promise((resolve) => {
    const component = (
      <WrappedComponent
        onClose={destroy}
        onConfirm={resolve}
        {...props}
      />
    );

    render(component);
  });

  return {
    open: props => ({
      result: getResult(props),
    }),
  };
};

export default asUIBModal;
