import { isString, isNil, isFunction, map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import LivePaginator from '@/lib/pagination/live-paginator';
import { $location, $route } from '@/services/ng';
import { clientConfig } from '@/services/auth';

const ORDER_BY_REVERSE = '-';

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
});

function prepareOrderByField(orderByField, orderByReverse) {
  if (isNil(orderByField)) {
    return null;
  }
  return orderByReverse ? ORDER_BY_REVERSE + orderByField : orderByField;
}

export function createResourceFetcher(getResource, processItem) {
  return (request, controller) => {
    const resource = getResource(controller);
    return resource(request).$promise
      .then(({ results, count }) => ({
        count,
        results: map(results, item => processItem(item)),
      }));
  };
}

export function wrap(WrappedComponent, { defaultOrderBy, getRequest, doRequest }) {
  return class extends React.Component {
    static propTypes = {
      currentPage: PropTypes.string,
      children: PropTypes.node,
    };

    static defaultProps = {
      currentPage: null,
      children: null,
    };

    constructor(props) {
      super(props);

      const params = this.getParamsFromUrl();

      const paginator = new LivePaginator(this.fetchData.bind(this), params);

      this.state = this.getState({
        isLoaded: false,
        searchTerm: params.searchTerm,
        selectedTags: [],
        paginator,
      });

      let savedOrderByField = paginator.orderByField;

      this.state.toggleSorting = (orderByField) => {
        paginator.orderBy(orderByField); // fetch data
        savedOrderByField = paginator.orderByField;
      };
      this.state.updateSearch = (searchTerm) => {
        // here we update state directly, but later `fetchData` will update it properly
        this.state.searchTerm = searchTerm;
        // in search mode ignore the ordering and use the ranking order
        // provided by the server-side FTS backend instead, unless it was
        // requested by the user by actively ordering in search mode
        if (searchTerm === '') {
          paginator.orderByField = savedOrderByField; // restore ordering
        } else {
          paginator.orderByField = null;
        }
        paginator.setPage(1); // fetch data
      };
      this.state.updateSelectedTags = (selectedTags) => {
        // here we update state directly, but later `fetchData` will update it properly
        this.state.selectedTags = selectedTags;
        paginator.setPage(1); // fetch data
      };
      this.state.updatePagination = (updates) => {
        paginator.setPage(updates.page || paginator.page, updates.itemsPerPage); // fetch data
      };

      this.state.update = () => {
        paginator.fetchPage(); // fetch data
      };
    }

    componentDidMount() {
      this.state.update();
    }

    // eslint-disable-next-line class-methods-use-this
    getState({ isLoaded, searchTerm, selectedTags, paginator }) {
      return {
        currentPage: this.props.currentPage,
        title: $route.current.title,

        isLoaded,
        isEmpty: !isLoaded || (paginator.totalCount === 0),

        searchTerm,
        selectedTags,

        // sorting
        orderByField: paginator.orderByField,
        orderByReverse: paginator.orderByReverse,

        // pagination
        page: paginator.page,
        itemsPerPage: paginator.itemsPerPage,
        totalItemsCount: isLoaded ? paginator.totalCount : 0,
        pageSizeOptions: clientConfig.pageSizeOptions,
        pageItems: isLoaded ? paginator.getPageRows() : [],
      };
    }

    // eslint-disable-next-line class-methods-use-this
    getParamsFromUrl() {
      const urlQueryParams = $location.search();

      let orderByField = urlQueryParams.order || defaultOrderBy;
      const orderByReverse = orderByField.startsWith(ORDER_BY_REVERSE);
      if (orderByReverse) {
        orderByField = orderByField.substr(1);
      }

      return {
        page: parseInt(urlQueryParams.page, 10) || 1,
        itemsPerPage: parseInt(urlQueryParams.page_size, 10) || clientConfig.pageSize,
        orderByField,
        orderByReverse,
        searchTerm: urlQueryParams.q || '',
      };
    }

    // eslint-disable-next-line class-methods-use-this
    getRequest(controller) {
      const request = {
        page: controller.page,
        page_size: controller.itemsPerPage,
        order: prepareOrderByField(controller.orderByField, controller.orderByReverse),
        q: isString(controller.searchTerm) && (controller.searchTerm !== '') ? controller.searchTerm : undefined,
        tags: controller.selectedTags,
      };
      return isFunction(getRequest) ? getRequest(request, controller) : request;
    }

    fetchData(paginator) {
      this.setState(prevState => this.getState({
        isLoaded: false,
        searchTerm: prevState.searchTerm,
        selectedTags: prevState.selectedTags,
        paginator,
      }), () => {
        // State updated, now do request
        this.updateUrlParams();

        const controller = this.state;
        const request = this.getRequest(controller);
        return doRequest(request, controller).then((data) => {
          paginator.updateRows(data.results, data.count);
          this.setState(prevState => this.getState({
            isLoaded: true,
            searchTerm: prevState.searchTerm,
            selectedTags: prevState.selectedTags,
            paginator,
          }));
        });
      });
    }

    updateUrlParams() {
      $location.search({
        page: this.state.page,
        page_size: this.state.itemsPerPage,
        order: prepareOrderByField(this.state.orderByField, this.state.orderByReverse),
        q: this.state.searchTerm !== '' ? this.state.searchTerm : null,
      });
    }

    render() {
      const { children, ...props } = this.props;
      props.controller = this.state;
      return <WrappedComponent {...props}>{ children }</WrappedComponent>;
    }
  };
}
