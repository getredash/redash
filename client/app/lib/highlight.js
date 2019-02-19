function escapeRegexp(queryToEscape) {
  return ('' + queryToEscape).replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
}

// https://github.com/angular-ui/ui-select/blob/master/src/common.js#L146
export default function highlight(matchItem, query, template = '<span class="ui-select-highlight">$&</span>') {
  return query && matchItem ? ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), template) : matchItem;
}
