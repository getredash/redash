import registerList from './list';
import registerShow from './show';

export default function (ngModule) {
  return Object.assign({}, registerList(ngModule), registerShow(ngModule));
}
