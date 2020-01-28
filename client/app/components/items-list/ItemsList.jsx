import { omit, debounce } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import hoistNonReactStatics from "hoist-non-react-statics";
import { clientConfig } from "@/services/auth";

export const ControllerType = PropTypes.shape({
  // values of props declared by wrapped component and some additional props from items list
  params: PropTypes.object.isRequired,

  isLoaded: PropTypes.bool.isRequired,
  isEmpty: PropTypes.bool.isRequired,

  // search
  searchTerm: PropTypes.string,
  updateSearch: PropTypes.func.isRequired, // (searchTerm: string) => void

  // tags
  selectedTags: PropTypes.array.isRequired,
  updateSelectedTags: PropTypes.func.isRequired, // (selectedTags: array of tags) => void

  // sorting
  orderByField: PropTypes.string,
  orderByReverse: PropTypes.bool.isRequired,
  toggleSorting: PropTypes.func.isRequired, // (orderByField: string) => void

  // pagination
  page: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  totalItemsCount: PropTypes.number.isRequired,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
  pageItems: PropTypes.array.isRequired,
  updatePagination: PropTypes.func.isRequired, // ({ page: number, itemsPerPage: number }) => void

  handleError: PropTypes.func.isRequired, // (error) => void
});

export function wrap(WrappedComponent, createItemsSource, createStateStorage) {
  class ItemsListWrapper extends React.Component {
    static propTypes = {
      onError: PropTypes.func,
      children: PropTypes.node,
    };

    static defaultProps = {
      onError: error => {
        // Allow calling chain to roll up, and then throw the error in global context
        setTimeout(() => {
          throw error;
        });
      },
      children: null,
    };

    constructor(props) {
      super(props);

      const stateStorage = createStateStorage();
      const itemsSource = createItemsSource();
      this._itemsSource = itemsSource;

      itemsSource.setState({ ...stateStorage.getState(), validate: false });
      itemsSource.getCallbackContext = () => this.state;

      itemsSource.onBeforeUpdate = () => {
        const state = itemsSource.getState();
        stateStorage.setState(state);
        this.setState(this.getState({ ...state, isLoaded: false }));
      };

      itemsSource.onAfterUpdate = () => {
        const state = itemsSource.getState();
        this.setState(this.getState({ ...state, isLoaded: true }));
      };

      itemsSource.onError = error => this.props.onError(error);

      const initialState = this.getState({ ...itemsSource.getState(), isLoaded: false });
      const { updatePagination, toggleSorting, updateSearch, updateSelectedTags, update, handleError } = itemsSource;
      this.state = {
        ...initialState,
        toggleSorting, // eslint-disable-line react/no-unused-state
        updateSearch: debounce(updateSearch, 200), // eslint-disable-line react/no-unused-state
        updateSelectedTags, // eslint-disable-line react/no-unused-state
        updatePagination, // eslint-disable-line react/no-unused-state
        update, // eslint-disable-line react/no-unused-state
        handleError, // eslint-disable-line react/no-unused-state
      };
    }

    componentDidMount() {
      this.state.update();
    }

    componentWillUnmount() {
      this._itemsSource.onBeforeUpdate = () => {};
      this._itemsSource.onAfterUpdate = () => {};
      this._itemsSource.onError = () => {};
    }

    // eslint-disable-next-line class-methods-use-this
    getState({ isLoaded, totalCount, pageItems, params, ...rest }) {
      return {
        ...rest,

        params: {
          ...params, // custom params from items source
          ...omit(this.props, ["onError", "children"]), // add all props except of own ones
        },

        isLoaded,
        isEmpty: !isLoaded || totalCount === 0,
        totalItemsCount: isLoaded ? totalCount : 0,
        pageSizeOptions: clientConfig.pageSizeOptions,
        pageItems: isLoaded ? pageItems : [],
      };
    }

    render() {
      // don't pass own props to wrapped component
      const { children, onError, ...props } = this.props;
      return (
        <WrappedComponent {...props} controller={this.state}>
          {children}
        </WrappedComponent>
      );
    }
  }

  // Copy static methods from `WrappedComponent`
  hoistNonReactStatics(ItemsListWrapper, WrappedComponent);

  return ItemsListWrapper;
}
