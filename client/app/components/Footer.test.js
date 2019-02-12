import { extend } from 'lodash';
import React from 'react';
import renderer from 'react-test-renderer';
import { clientConfig, currentUser } from '../services/auth';
import { Footer } from './Footer';

test('Footer renders', () => {
  // TODO: Properly mock this
  extend(clientConfig, {
    version: '5.0.1',
    newVersionAvailable: true,
  });
  extend(currentUser, {
    permissions: ['admin'],
  });
  const component = renderer.create(<Footer />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
