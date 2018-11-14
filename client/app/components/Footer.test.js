import React from 'react';
import renderer from 'react-test-renderer';
import { Footer } from './Footer';

test('Footer renders', () => {
  const clientConfig = {
    version: '5.0.1',
    newVersionAvailable: true,
  };
  const currentUser = {
    isAdmin: true,
  };
  const component = renderer.create(<Footer clientConfig={clientConfig} currentUser={currentUser} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
