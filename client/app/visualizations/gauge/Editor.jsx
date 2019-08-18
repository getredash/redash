import React from 'react';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, onOptionsChange }) {
  const updateOptions = updates => onOptionsChange({
    ...options,
    ...updates,
  });

  return (
    <div className="form-group">
      <label className="d-flex flex-column m-b-10" htmlFor="gauge-okRange-column">
        <span className="m-r-10">Ok Range</span>
        <input id="gauge-okRange-column" className="form-control" type="text" value={options.okRange} onChange={event => updateOptions({ okRange: event.target.value })} />
      </label>

      <label className="d-flex flex-column m-b-10" htmlFor="gauge-okColor-column">
        <span className="m-r-10">Ok Color</span>
        <input className="form-control" type="color" value={options.okColor} onChange={event => updateOptions({ okColor: event.target.value })} />
      </label>

      <label className="d-flex flex-column m-b-10" htmlFor="gauge-warningRange-column">
        <span className="m-r-10">Warning Range</span>
        <input className="form-control" type="text" value={options.warningRange} onChange={event => updateOptions({ warningRange: event.target.value })} />
      </label>

      <label className="d-flex flex-column m-b-10" htmlFor="gauge-warningColor-column">
        <span className="m-r-10">Warning Color</span>
        <input className="form-control" type="color" value={options.warningColor} onChange={event => updateOptions({ warningColor: event.target.value })} />
      </label>

      <label className="d-flex flex-column m-b-10" htmlFor="gauge-dangerRange-column">
        <span className="m-r-10">Danger Range</span>
        <input className="form-control" type="text" value={options.dangerRange} onChange={event => updateOptions({ dangerRange: event.target.value })} />
      </label>

      <label className="d-flex flex-column m-b-10" htmlFor="gauge-dangerColor-column">
        <span className="m-r-10">Danger Color</span>
        <input className="form-control" type="color" value={options.dangerColor} onChange={event => updateOptions({ dangerColor: event.target.value })} />
      </label>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
