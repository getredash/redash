import registerList from './list';
import registerShow from './show';

export default function init(ngModule) {
  return Object.assign({}, registerList(ngModule), registerShow(ngModule));
}
