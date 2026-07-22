import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';
import { installStartupErrorTrap } from './src/lib/startupErrorTrap';

// So früh wie möglich – noch vor dem Registrieren der App – die Fehler-Fallen
// setzen, damit ein Startup-Fatal sichtbar wird statt die App abzuschießen.
installStartupErrorTrap();

// registerRootComponent ruft AppRegistry.registerComponent('main', () => App) auf.
registerRootComponent(App);
