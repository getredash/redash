import React from 'react';
import renderer from 'react-test-renderer';
import { UserShow } from './UserShow';

test('renders correctly', () => {
  const user = {
    id: 2,
    name: 'John Doe',
    email: 'john@doe.com',
    profileImageUrl: 'http://www.images.com/llama.jpg',
  };

  const component = renderer.create(<UserShow user={user} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
