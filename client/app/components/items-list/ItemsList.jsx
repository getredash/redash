import { omit, debounce } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { $route } from '@/services/ng';
import { clientConfig } from '@/services/auth';
import { StateStorage } from './classes/StateStorage';

export const ControllerType = PropTypes.shape({
  currentPage: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,

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

export function wrap(WrappedComponent, itemsSource, stateStorage) {
  class ItemsListWrapper extends React.Component {
    static propTypes = {
      ...omit(WrappedComponent.propTypes, ['controller']),
      currentPage: PropTypes.string,
      onError: PropTypes.func,
      children: PropTypes.node,
    };

    static defaultProps = {
      ...omit(WrappedComponent.defaultProps, ['controller']),
      currentPage: null,
      onError: (error) => {
        // Allow calling chain to roll up, and then throw the error in global context
        setTimeout(() => { throw error; });
      },
      children: null,
    };

    constructor(props) {
      super(props);

      stateStorage = stateStorage || new StateStorage();
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

      this.state = this.getState({
        ...itemsSource.getState(),
        isLoaded: false,
      });

      const { updatePagination, toggleSorting, updateSearch, updateSelectedTags, update, handleError } = itemsSource;

      this.state.toggleSorting = toggleSorting;
      this.state.updateSearch = debounce(updateSearch, 200);
      this.state.updateSelectedTags = updateSelectedTags;
      this.state.updatePagination = updatePagination;
      this.state.update = update;
      this.state.handleError = handleError;
    }

    componentDidMount() {
      this.state.update();
    }

    // eslint-disable-next-line class-methods-use-this
    getState({ isLoaded, ...rest }) {
      return {
        currentPage: this.props.currentPage,
        title: $route.current.title,

        isLoaded,
        isEmpty: !isLoaded || (rest.totalCount === 0),

        searchTerm: rest.searchTerm,
        selectedTags: rest.selectedTags,

        // sorting
        orderByField: rest.orderByField,
        orderByReverse: rest.orderByReverse,

        // pagination
        page: rest.page,
        itemsPerPage: rest.itemsPerPage,
        totalItemsCount: isLoaded ? rest.totalCount : 0,
        pageSizeOptions: clientConfig.pageSizeOptions,
        pageItems: isLoaded ? rest.pageItems : [],
      };
    }

    render() {
      const { children, ...props } = this.props;
      props.controller = this.state;
      return <WrappedComponent {...props}>{ children }</WrappedComponent>;
    }
  }

  // Copy static methods from `WrappedComponent`
  hoistNonReactStatics(ItemsListWrapper, WrappedComponent);

  return ItemsListWrapper;
}
