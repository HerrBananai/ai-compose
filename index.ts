import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent ruft AppRegistry.registerComponent('main', () => App) auf.
registerRootComponent(App);
