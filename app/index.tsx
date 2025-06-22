// app/index.tsx
import '../src/firebase/config'; // Add this line
import 'react-native-get-random-values';
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(app)/HomeScreen" />;
}