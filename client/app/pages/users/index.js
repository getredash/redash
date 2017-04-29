import registerList from './list';
import registerShow from './show';
import registerNew from './new';

export default function (ngModule) {
  const routes = Object.assign({}, registerList(ngModule),
                                   registerNew(ngModule),
                                   registerShow(ngModule));
  return routes;
}
