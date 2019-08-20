import fs from 'fs';
import path from 'path';
import getChartData from './getChartData';

function loadFixtures(directoryName) {
  directoryName = path.join(__dirname, directoryName);
  const fileNames = fs.readdirSync(directoryName);
  return fileNames.map((fileName) => {
    const str = fs.readFileSync(path.join(directoryName, fileName));
    return JSON.parse(str);
  });
}

describe('Visualizations - getChartData', () => {
  const fixtures = loadFixtures('fixtures/getChartData');
  fixtures.forEach(({ name, input, output }) => {
    test(name, () => {
      const data = getChartData(input.data, input.options);
      expect(data).toEqual(output.data);
    });
  });
});
