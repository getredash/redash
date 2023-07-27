export interface ItemsSourceOptions<I = any> extends Partial<ItemsSourceState> {
  getRequest?: (params: any, context: any) => any; // TODO: Add stricter types
  doRequest?: () => any; // TODO: Add stricter type
  processResults?: () => any; // TODO: Add stricter type
  isPlainList?: boolean;
  sortByIteratees?: { [fieldName: string]: (a: I) => number };
}

export interface GetResourceContext extends ItemsSourceState {
  params: {
    currentPage: number;
    // TODO: Add more context parameters
  };
}

export type GetResourceRequest = any; // TODO: Add stricter type

export interface ItemsPage<INPUT = any> {
  count: number;
  page: number;
  page_size: number;
  results: INPUT[];
}

export interface ResourceItemsSourceOptions<INPUT = any, ITEM = any> extends ItemsSourceOptions {
  getResource: (context: GetResourceContext) => (request: GetResourceRequest) => Promise<INPUT[]>;
  getItemProcessor?: () => (input: INPUT) => ITEM;
}

export type ItemsSourceState<ITEM = any> = {
  page: number;
  itemsPerPage: number;
  orderByField: string;
  orderByReverse: boolean;
  searchTerm: string;
  selectedTags: string[];
  totalCount: number;
  pageItems: ITEM[];
  allItems: ITEM[] | undefined;
  params: {
    pageTitle?: string;
  } & { [key: string]: string | number };
};

declare class ItemsSource {
  constructor(options: ItemsSourceOptions);
}

declare class ResourceItemsSource<I> {
  constructor(options: ResourceItemsSourceOptions<I>);
}
