import { omit, debounce } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import hoistNonReactStatics from "hoist-non-react-statics";
import { clientConfig } from "@/services/auth";
import { AxiosError } from "axios";

export interface PaginationOptions {
  page?: number;
  itemsPerPage?: number;
}

export interface Controller<I, P = any> {
  params: P; // TODO: Find out what params is (except merging with props)

  isLoaded: boolean;
  isEmpty: boolean;

  // search
  searchTerm?: string;
  updateSearch: (searchTerm: string) => void;

  // tags
  selectedTags: string[];
  updateSelectedTags: (selectedTags: string[]) => void;

  // sorting
  orderByField?: string;
  orderByReverse: boolean;
  toggleSorting: (orderByField: string) => void;
  setSorting: (orderByField: string, orderByReverse: boolean) => void;

  // pagination
  page: number;
  itemsPerPage: number;
  totalItemsCount: number;
  pageSizeOptions: number[];
  pageItems: I[];
  updatePagination: (options: PaginationOptions) => void; // ({ page: number, itemsPerPage: number }) => void

  handleError: (error: any) => void; // TODO: Find out if error is string or object or Exception.
}

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

export type GenericItemSourceError = AxiosError | Error;

export interface ItemsListWrapperProps {
  onError?: (error: AxiosError | Error) => void;
  children: React.ReactNode;
}

interface ItemsListWrapperState<I, P = any> extends Controller<I, P> {
  totalCount?: number;
  update: () => void;
}

type ItemsSource = any; // TODO: Type ItemsSource
type StateStorage = any; // TODO: Type StateStore

export interface ItemsListWrappedComponentProps<I, P = any> {
  controller: Controller<I, P>;
}

export function wrap<I, P = any>(
  WrappedComponent: React.ComponentType<ItemsListWrappedComponentProps<I>>,
  createItemsSource: () => ItemsSource,
  createStateStorage: () => StateStorage
) {
  class ItemsListWrapper extends React.Component<ItemsListWrapperProps, ItemsListWrapperState<I, P>> {
    private _itemsSource: ItemsSource;

    static propTypes = {
      onError: PropTypes.func,
      children: PropTypes.node,
    };

    static defaultProps = {
      onError: (error: GenericItemSourceError) => {
        // Allow calling chain to roll up, and then throw the error in global context
        setTimeout(() => {
          throw error;
        });
      },
      children: null,
    };

    constructor(props: ItemsListWrapperProps) {
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

      itemsSource.onError = (error: GenericItemSourceError) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.props.onError!(error);

      const initialState = this.getState({ ...itemsSource.getState(), isLoaded: false });
      const { updatePagination, toggleSorting, setSorting, updateSearch, updateSelectedTags, update, handleError } = itemsSource;
      this.state = {
        ...initialState,
        toggleSorting, // eslint-disable-line react/no-unused-state
        setSorting, // eslint-disable-line react/no-unused-state
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
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this._itemsSource.onBeforeUpdate = () => {};
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this._itemsSource.onAfterUpdate = () => {};
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this._itemsSource.onError = () => {};
    }

    // eslint-disable-next-line class-methods-use-this
    getState({
      isLoaded,
      totalCount,
      pageItems,
      params,
      ...rest
    }: ItemsListWrapperState<I, P>): ItemsListWrapperState<I, P> {
      return {
        ...rest,

        params: {
          ...params, // custom params from items source
          ...omit(this.props, ["onError", "children"]), // add all props except of own ones
        },

        isLoaded,
        isEmpty: !isLoaded || totalCount === 0,
        totalItemsCount: totalCount || 0,
        pageSizeOptions: (clientConfig as any).pageSizeOptions, // TODO: Type auth.js
        pageItems: pageItems || [],
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
