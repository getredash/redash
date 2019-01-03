import React from 'react';
import renderer from 'react-test-renderer';
import { UserShow } from './UserShow';

test('renders correctly', () => {
  const component = renderer.create(<UserShow name="John Doe" email="john@doe.com" profileImageUrl="http://www.images.com/llama.jpg" />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

