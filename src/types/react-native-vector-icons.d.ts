declare module 'react-native-vector-icons' {
  import * as React from 'react';

  type IconProps = {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  };

  export function createIconSetFromIcoMoon(config: any): React.ComponentType<IconProps>;

  // You can also add other exports if you use them, e.g.
  // export default class Icon extends React.Component<IconProps> {}
}
