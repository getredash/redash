import { react2angular } from 'react2angular';
import EditInPlace from './EditInPlace';

export default function init(ngModule) {
  ngModule.component('editInPlace', react2angular(EditInPlaceText));
}
