import { last, reverse } from "lodash";
import React from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";
import Webix  from './Webix'

function getTotalMetadataColumns(columns: any[]) {
  return columns
    .filter(c => c.name.startsWith('__treetable__'))
    .map(c => {
      var [_e, _m, groupColsJoined, valueCol] = c.name.split('__')
      var groupFor = groupColsJoined.split('--')
      return {
        ...c,
        groupFor: groupFor,
        valueColumn: valueCol
      }
  })
}

function getGroupColumns(columns: any[], metadataColumns: any[]) {
  var currBigestColumnsGroup: any[] = []
  for (var c of metadataColumns) {
    if (c.groupFor.length > currBigestColumnsGroup.length) 
      currBigestColumnsGroup = c.groupFor
  }
  return columns.filter(c => currBigestColumnsGroup.includes(c.name))
}

function getValueColumns(columns: any[], metadataColumns: any[]) {
  const valueColsFromMetadata = metadataColumns.map((c: any) => c.valueColumn)
  return columns.filter(c => valueColsFromMetadata.includes(c.name))
}

function prepareColumns(columns: any[], metadataColumns: any[], groupCols: any[]) {
  var groupColsNames = groupCols.map(c => c.name)
  var valueColumns = columns
    .filter(c => !(groupCols.map(gc => gc.name).includes(c.name)))
    .map(
      c => {
        var curColumnObj = {
          id: c.name, header: c.title, sort: c.type, adjust: true, css: {'text-align': c.alignContent}
        }
        if (groupColsNames[0] == c.name) {
          curColumnObj.template = (obj, common) => {
            return common.treetable(obj, common) + obj[c.name]
          }
        }
        if (metadataColumns.map(mC => mC.name).includes(c.name)) {
          curColumnObj.hidden = true
        }
        if (c.numberFormat != undefined) curColumnObj.numberFormat = c.numberFormat
        if (c.template) curColumnObj.template = c.template
        return curColumnObj
      }
    )
  var obj = [{
      id: 'group',
      header: 'Group <button type="button" class="webix_button webix_img_btn" style="line-height:32px;"><span class="webix_icon_btn wxi-user" style="max-width:32px;"></span>Icon</button>',
      sort: 'string',
      fillspace: true,
      template: (obj, common) => {
        return common.treetable(obj, common) + obj[groupCols[obj.$level - 1].name]
      }
    },
    ...valueColumns
  ]
  console.log('uiColumns', obj)
  return obj
}

function prepareRows(rows: any[]) {
  return rows
}

function makeGroupParams(groupColumns: any, valueColumns: any, metadataColumns: any) {
  var groups = []
  var curGroup: any[] = []
  for (var groupCol of groupColumns) {
    curGroup.push(groupCol.name)
    groups.push([...curGroup])
  }
  groups = reverse(groups.slice(0, groups.length - 1))
  
  var groupObjs = []
  for (let group of groups) {
    var groupLevelObj = {
      'by': (obj: any) => {
        var objGroupValues = []
        for (var groupCol of group) {
          objGroupValues.push(obj[groupCol])
        }
        return objGroupValues.join('-')
      }, 'map': {}
    }
    groupLevelObj.map.value = [last(curGroup)]

    for (var thisGroupCol of group) {
      groupLevelObj.map[thisGroupCol] = [thisGroupCol]
    }

    for (let valueCol: any of valueColumns) {
      groupLevelObj.map[valueCol.name] = [valueCol.name, (_prop, data) => {
        var groupLookupRow = data[0]
        var lookupColumn = '__treetable__' + group.join('--') + '__' + valueCol.name
        return groupLookupRow[lookupColumn]
      }]
    }
    for (let metadataCol of metadataColumns) {
      groupLevelObj.map[metadataCol.name] = [metadataCol.name]
    }
    groupObjs.push(groupLevelObj)
  }
  return groupObjs
}

export default function Renderer({ options, data }: any) {
  console.log('Props passed to Treetable Renderer: ', data, options)
  
  const totalMetadataColumns = getTotalMetadataColumns(options.columns)
  const groupCols = getGroupColumns(options.columns, totalMetadataColumns)
  const valueCols = getValueColumns(options.columns, totalMetadataColumns)
  const uiColumns = prepareColumns(options.columns, totalMetadataColumns, groupCols)
  const groupParams = makeGroupParams(groupCols, valueCols, totalMetadataColumns)


  return (
    <div className="table-visualization-container">
      <Webix
        ui={{
          view:"treetable",
          columns: uiColumns,
          css: "webix_header_border webix_data_border multiline",
          clipboard: "selection",
          select: "cell",
          multiselect: true,
          scroll: 'xy',
          resizeColumn: { headerOnly: true },
          resizeRow: true,
          width:0, 
          height:0,
          autoheight:true,
          type:{height:"auto"}
          // autowidth:true
        }}
        data={data.rows}
        groupObjs={groupParams}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
