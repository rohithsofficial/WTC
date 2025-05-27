import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
// import App from './App';
import { name as appName } from '../app.json';
import { Redirect } from 'expo-router';

AppRegistry.registerComponent(appName, () => App);

export default function Index() {
  return <Redirect href="/(app)/HomeScreen" />;
}