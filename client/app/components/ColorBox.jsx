// ANGULAR_REMOVE_ME
import { react2angular } from 'react2angular';

import ColorPicker from '@/components/ColorPicker';

import './color-box.less';

export default function init(ngModule) {
  ngModule.component('colorBox', react2angular(ColorPicker.Swatch));
}

init.init = true;
