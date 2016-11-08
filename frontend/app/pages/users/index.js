import registerList from './list';
import registerShow from './show';

export default function (ngModule) {
  const routes = Object.assign({}, registerList(ngModule),
                                   registerShow(ngModule));
  return routes;
}
