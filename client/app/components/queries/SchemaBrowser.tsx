import { isNil, map, filter, some, includes, get } from "lodash";
import cx from "classnames";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import Input from "antd/lib/input";
import Button from "antd/lib/button";
import Tooltip from "antd/lib/tooltip";
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer";
import List from "react-virtualized/dist/commonjs/List";
import useDataSourceSchema from "@/pages/queries/hooks/useDataSourceSchema";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import LoadingState from "../items-list/components/LoadingState";
type SchemaItemColumnType = {
    name: string;
    type?: string;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ name: Validator<str... Remove this comment to see the full error message
const SchemaItemColumnType: PropTypes.Requireable<SchemaItemColumnType> = PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
});
type SchemaItemType = {
    name: string;
    size?: number;
    loading?: boolean;
    columns: SchemaItemColumnType[];
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ name: Validator<str... Remove this comment to see the full error message
const SchemaItemType: PropTypes.Requireable<SchemaItemType> = PropTypes.shape({
    name: PropTypes.string.isRequired,
    size: PropTypes.number,
    loading: PropTypes.bool,
    columns: PropTypes.arrayOf(SchemaItemColumnType).isRequired,
});
export { SchemaItemType };
const schemaTableHeight = 22;
const schemaColumnHeight = 18;
type OwnSchemaItemProps = {
    item?: SchemaItemType;
    expanded?: boolean;
    onToggle?: (...args: any[]) => any;
    onSelect?: (...args: any[]) => any;
};
type SchemaItemProps = OwnSchemaItemProps & typeof SchemaItem.defaultProps;
// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
function SchemaItem({ item, expanded, onToggle, onSelect, ...props }: SchemaItemProps) {
    const handleSelect = useCallback((event, ...args) => {
        event.preventDefault();
        event.stopPropagation();
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        onSelect(...args);
    }, [onSelect]);
    if (!item) {
        return null;
    }
    const tableDisplayName = (item as any).displayName || (item as any).name;
    return (<div {...props}>
      <div className="table-name" onClick={onToggle}>
        <i className="fa fa-table m-r-5"/>
        <strong>
          <span title={(item as any).name}>{tableDisplayName}</span>
          {!isNil((item as any).size) && <span> ({(item as any).size})</span>}
        </strong>

        <Tooltip title="Insert table name into query text" mouseEnterDelay={0} mouseLeaveDelay={0}>
          <i className="fa fa-angle-double-right copy-to-editor" aria-hidden="true" onClick={e => handleSelect(e, (item as any).name)}/>
        </Tooltip>
      </div>
      {expanded && (<div>
          {(item as any).loading ? (<div className="table-open">Loading...</div>) : (map((item as any).columns, column => {
        const columnName = get(column, "name");
        const columnType = get(column, "type");
        return (<div key={columnName} className="table-open">
                  {columnName} {columnType && <span className="column-type">{columnType}</span>}
                  <Tooltip title="Insert column name into query text" mouseEnterDelay={0} mouseLeaveDelay={0}>
                    <i className="fa fa-angle-double-right copy-to-editor" aria-hidden="true" onClick={e => handleSelect(e, columnName)}/>
                  </Tooltip>
                </div>);
    }))}
        </div>)}
    </div>);
}
SchemaItem.defaultProps = {
    item: null,
    expanded: false,
    onToggle: () => { },
    onSelect: () => { },
};
function SchemaLoadingState() {
    return (<div className="schema-loading-state">
      <LoadingState className=""/>
    </div>);
}
export function SchemaList({ loading, schema, expandedFlags, onTableExpand, onItemSelect }: any) {
    const [listRef, setListRef] = useState(null);
    useEffect(() => {
        if (listRef) {
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            listRef.recomputeRowHeights();
        }
    }, [listRef, schema, expandedFlags]);
    return (<div className="schema-browser">
      {loading && <SchemaLoadingState />}
      {/* @ts-expect-error ts-migrate(2604) FIXME: JSX element type 'AutoSizer' does not have any con... Remove this comment to see the full error message */}
      {!loading && (<AutoSizer>
          {/* @ts-expect-error ts-migrate(2604) FIXME: JSX element type 'List' does not have any construc... Remove this comment to see the full error message */}
          {({ width, height }: any) => (<List ref={setListRef} width={width} height={height} rowCount={schema.length} rowHeight={({ index }: any) => {
        const item = schema[index];
        const columnsLength = !item.loading ? item.columns.length : 1;
        const columnCount = expandedFlags[item.name] ? columnsLength : 0;
        return schemaTableHeight + schemaColumnHeight * columnCount;
    }} rowRenderer={({ key, index, style }: any) => {
        const item = schema[index];
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
        return (<SchemaItem key={key} style={style} item={item} expanded={expandedFlags[item.name]} onToggle={() => onTableExpand(item.name)} onSelect={onItemSelect}/>);
    }}/>)}
        </AutoSizer>)}
    </div>);
}
export function applyFilterOnSchema(schema: any, filterString: any) {
    const filters = filter(filterString.toLowerCase().split(/\s+/), s => s.length > 0);
    // Empty string: return original schema
    if (filters.length === 0) {
        return schema;
    }
    // Single word: matches table or column
    if (filters.length === 1) {
        const nameFilter = filters[0];
        const columnFilter = filters[0];
        return filter(schema, item => includes(item.name.toLowerCase(), nameFilter) ||
            some(item.columns, column => includes(get(column, "name").toLowerCase(), columnFilter)));
    }
    // Two (or more) words: first matches table, seconds matches column
    const nameFilter = filters[0];
    const columnFilter = filters[1];
    return filter(map(schema, item => {
        if (includes(item.name.toLowerCase(), nameFilter)) {
            item = {
                ...item,
                columns: filter(item.columns, column => includes(get(column, "name").toLowerCase(), columnFilter)),
            };
            return item.columns.length > 0 ? item : null;
        }
    }));
}
type OwnSchemaBrowserProps = {
    dataSource?: any;
    onSchemaUpdate?: (...args: any[]) => any;
    onItemSelect?: (...args: any[]) => any;
};
type SchemaBrowserProps = OwnSchemaBrowserProps & typeof SchemaBrowser.defaultProps;
// @ts-expect-error ts-migrate(2339) FIXME: Property 'options' does not exist on type 'SchemaB... Remove this comment to see the full error message
export default function SchemaBrowser({ dataSource, onSchemaUpdate, onItemSelect, options, onOptionsUpdate, ...props }: SchemaBrowserProps) {
    const [schema, isLoading, refreshSchema] = useDataSourceSchema(dataSource);
    const [filterString, setFilterString] = useState("");
    const filteredSchema = useMemo(() => applyFilterOnSchema(schema, filterString), [schema, filterString]);
    const [handleFilterChange] = useDebouncedCallback(setFilterString, 500);
    const [expandedFlags, setExpandedFlags] = useState({});
    const handleSchemaUpdate = useImmutableCallback(onSchemaUpdate);
    useEffect(() => {
        setExpandedFlags({});
        handleSchemaUpdate(schema);
    }, [schema, handleSchemaUpdate]);
    if ((schema as any).length === 0 && !isLoading) {
        return null;
    }
    function toggleTable(tableName: any) {
        setExpandedFlags({
            ...expandedFlags,
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            [tableName]: !expandedFlags[tableName],
        });
    }
    return (<div className="schema-container" {...props}>
      <div className="schema-control">
        <Input className="m-r-5" placeholder="Search schema..." disabled={(schema as any).length === 0} onChange={event => handleFilterChange(event.target.value)}/>

        <Tooltip title="Refresh Schema">
          <Button onClick={() => refreshSchema(true)}>
            <i className={cx("zmdi zmdi-refresh", { "zmdi-hc-spin": isLoading })}/>
          </Button>
        </Tooltip>
      </div>
      <SchemaList loading={isLoading && (schema as any).length === 0} schema={filteredSchema} expandedFlags={expandedFlags} onTableExpand={toggleTable} onItemSelect={onItemSelect}/>
    </div>);
}
SchemaBrowser.defaultProps = {
    dataSource: null,
    onSchemaUpdate: () => { },
    onItemSelect: () => { },
};
