import React from 'react';
import PropTypes from 'prop-types';
import Popover from 'antd/lib/popover';
import 'antd/lib/popover/style';
import { ColumnDetail } from '@/components/proptypes';

const FormGroup = props => (
  <div className="form-group">
    { /* eslint-disable-next-line jsx-a11y/label-has-for */ }
    <label htmlFor={`table-editor-${props.name}-${props.controlName}`}>{props.children}</label>
    <input
      className="form-control"
      type={props.type}
      value={props.value}
      onChange={props.onChange}
      id={`table-editor-${props.name}-${props.controlName}`}
    />
  </div>
);

const CheckboxFormGroup = props => (
  <div className="form-group">
    <label htmlFor={`table-editor-${props.name}-${props.controlName}`}>
      <input
        type="checkbox"
        checked={props.value}
        onChange={props.onChange}
        id={`table-editor-${props.name}-${props.controlName}`}
      />
      {props.label}
    </label>
  </div>
);

const fgPropTypes = {
  name: PropTypes.string.isRequired,
  controlName: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

CheckboxFormGroup.propTypes = { ...fgPropTypes, label: PropTypes.string.isRequired };
FormGroup.propTypes = { ...fgPropTypes, children: PropTypes.node.isRequired };

const AlignButton = props => (
  <button
    type="button"
    className={'btn btn-default btn-xs' + (props.column.alignContent === props.direction ? ' active' : '')}
    onClick={() => props.updateColumn({ alignContent: props.direction })}
  >
    <i className={'fa fa-align-' + props.direction} />
  </button>
);

AlignButton.propTypes = {
  column: ColumnDetail.isRequired,
  direction: PropTypes.string.isRequired,
  updateColumn: PropTypes.func.isRequired,
};


export default function TableEditorColumnDetail({ updateColumn, column }) {
  const stringColumn = (
    <div>
      <CheckboxFormGroup
        name={column.name}
        value={column.allowHTML}
        onChange={e => updateColumn({ allowHTML: e.target.checked })}
        controlName="allowhtml"
        label="Allow HTML content"
      />

      {column.allowHTML ? (
        <CheckboxFormGroup
          name={column.name}
          value={column.highlightLinks}
          onChange={e => updateColumn({ highlightLinks: e.target.checked })}
          controlName="hilightLinks"
          label="Highlight links"
        />) : ''}
    </div>
  );
  const numberPopover = (
    <React.Fragment>
      Format <a href="http://numeraljs.com/#format" rel="noopener noreferrer" target="_blank">specs.</a>
    </React.Fragment>
  );
  const numberColumn = (
    <div>
      <FormGroup
        name={column.name}
        controlName="number-format"
        value={column.numberFormat}
        onChange={e => updateColumn({ numberFormat: e.target.value })}
      >
        Number format
        <Popover trigger="click" content={numberPopover}>
          <i className="m-l-5 fa fa-question-circle" />
        </Popover>
      </FormGroup>
    </div>
  );
  const datetimePopover = (
    <React.Fragment>
      Format <a href="https://momentjs.com/docs/#/displaying/format/" rel="noopener noreferrer" target="_blank">specs.</a>
    </React.Fragment>
  );

  const datetimeColumn = (
    <div>
      <FormGroup
        name={column.name}
        controlName="datetime-format"
        value={column.dateTimeFormat}
        onChange={e => updateColumn({ dateTimeFormat: e.target.value })}
      >
        Date/Time format
        <Popover trigger="click" content={datetimePopover}>
          <i className="m-l-5 fa fa-question-circle" />
        </Popover>
      </FormGroup>
    </div>
  );

  const booleanColumn = (
    <div>
      <FormGroup
        name={column.name}
        controlName="boolean-false"
        value={column.booleanValues[0]}
        onChange={e => updateColumn({ booleanValues: [e.target.value, column.booleanValues[1]] })}
      >
        Value for <code>false</code>
      </FormGroup>
      <FormGroup
        name={column.name}
        controlName="boolean-true"
        value={column.booleanValues[1]}
        onChange={e => updateColumn({ booleanValues: [column.booleanValues[0], e.target.value] })}
      >
        Value for <code>true</code>
      </FormGroup>
    </div>
  );


  const templateHintPopover = (
    <React.Fragment>
      All columns can be referenced using <code>{'{{ column_name }}'}</code> syntax.
      Use <code>{'{{ @ }}'}</code> to reference current (this) column.
      This syntax is applicable to URL, Title and Size options.
    </React.Fragment>
  );
  const imageColumn = (
    <div>
      <FormGroup
        name={column.name}
        controlName="image-url-template"
        value={column.imageUrlTemplate}
        onChange={e => updateColumn({ imageUrlTemplate: e.target.value })}
      >
        URL template
      </FormGroup>
      <div className="form-group">
        { /* eslint-disable-next-line jsx-a11y/label-has-for */ }
        <label id={`table-editor-${column.name}-imagesize-label`}>
          <Popover
            trigger="click"
            content="Any positive integer value that specifies size in pixels. Leave empty to use default value."
          >
            <i className="m-l-5 fa fa-question-circle" />
          </Popover>
        </label>
        <div className="d-flex">
          <input
            className="form-control"
            value={column.imageWidth}
            onChange={e => updateColumn({ imageWidth: e.target.value })}
            type="number"
            placeholder="Width"
          />
          <span className="form-control-static m-l-5 m-r-5">&times;</span>
          <input
            className="form-control"
            value={column.imageHeight}
            onChange={e => updateColumn({ imageHeight: e.target.value })}
            type="number"
            placeholder="Height"
          />
        </div>
      </div>

      <FormGroup
        name={column.name}
        controlName="image-title-template"
        value={column.imageTitleTemplate}
        onChange={e => updateColumn({ imageTitleTemplate: e.target.value })}
      >
        Title template
      </FormGroup>

      <div className="form-group">
        <Popover
          className="text-muted"
          style={{ fontWeight: 'normal', cursor: 'pointer' }}
          content={templateHintPopover}
          trigger="click"
          placement="top"
        >
          Format specs <i className="fa fa-question-circle m-l-5" />
        </Popover>
      </div>
    </div>
  );

  const linkColumn = (
    <div>
      <FormGroup
        name={column.name}
        controlName="link-url-template"
        value={column.linkUrlTemplate}
        onChange={e => updateColumn({ linkUrlTemplate: e.target.value })}
      >
        URL template
      </FormGroup>
      <FormGroup
        name={column.name}
        controlName="link-text-template"
        value={column.linkTextTemplate}
        onChange={e => updateColumn({ linkTextTemplate: e.target.value })}
      >
        Text template
      </FormGroup>
      <FormGroup
        name={column.name}
        controlName="link-title-template"
        value={column.linkTitleTemplate}
        onChange={e => updateColumn({ linkTitleTemplate: e.target.value })}
      >
        Title template
      </FormGroup>
      <CheckboxFormGroup
        name={column.name}
        value={column.linkOpenInNewTab}
        onChange={e => updateColumn({ linkOpenInNewTab: e.target.checked })}
        controlName="link-open-in-new-tab"
        label="Open in new tab"
      />
      <div className="form-group">
        <Popover
          className="text-muted"
          style={{ fontWeight: 'normal', cursor: 'pointer' }}
          content={templateHintPopover}
          trigger="click"
          placement="top"
        >
          Format specs <i className="fa fa-question-circle m-l-5" />
        </Popover>
      </div>
    </div>
  );

  const DISPLAY_AS_OPTIONS = [
    { name: 'Text', value: 'string' },
    { name: 'Number', value: 'number' },
    { name: 'Date/Time', value: 'datetime' },
    { name: 'Boolean', value: 'boolean' },
    { name: 'JSON', value: 'json' },
    { name: 'Image', value: 'image' },
    { name: 'Link', value: 'link' },
  ];

  const display = {
    string: stringColumn,
    number: numberColumn,
    datetime: datetimeColumn,
    boolean: booleanColumn,
    image: imageColumn,
    link: linkColumn,
  };

  return (
    <div>
      <div className="table-editor-column-header form-group">
        <div className="input-group">
          <span className="input-group-addon"><input type="checkbox" checked={column.visible} onChange={e => updateColumn({ visible: e.target.checked })} /></span>
          <input className="form-control" defaultValue={column.title} onChange={e => updateColumn({ title: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <div className="btn-group btn-group-justified">
          <AlignButton updateColumn={updateColumn} column={column} direction="left" />
          <AlignButton updateColumn={updateColumn} column={column} direction="center" />
          <AlignButton updateColumn={updateColumn} column={column} direction="right" />
        </div>
      </div>

      <CheckboxFormGroup
        name={column.name}
        value={column.allowSearch}
        onChange={e => updateColumn({ allowSearch: e.target.checked })}
        controlName="allow-search"
        label="Use for search"
      />

      <div className="form-group">
        <label style={{ width: '100%' }} htmlFor={`table-editor-${column.name}-display-as`}>
          Display as:
          <select
            id={`table-editor-${column.name}-display-as`}
            value={column.displayAs}
            onChange={e => updateColumn({ displayAs: e.target.value })}
            className="form-control"
          >
            {DISPLAY_AS_OPTIONS.map(item => <option key={`table-editor-select-${item.value}`} value={item.value}>{item.name}</option>)}
          </select>
        </label>
      </div>
      {display[column.displayAs]}
    </div>
  );
}

TableEditorColumnDetail.propTypes = {
  column: ColumnDetail.isRequired,
  updateColumn: PropTypes.func.isRequired,
};
