const { configure } = require("enzyme");
const Adapter = require("@cfaester/enzyme-adapter-react-18");

configure({ adapter: new Adapter() });
