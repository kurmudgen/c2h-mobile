import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import DevAutoLogin from './components/common/DevAutoLogin';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      {__DEV__ && <DevAutoLogin />}
      <RootNavigator />
    </AuthProvider>
  );
}
