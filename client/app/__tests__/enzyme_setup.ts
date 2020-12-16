import { configure } from "enzyme";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'enzy... Remove this comment to see the full error message
import Adapter from "enzyme-adapter-react-16";

configure({ adapter: new Adapter() });
