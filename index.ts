import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import type { ComponentType } from 'react';

import {
  installStartupErrorTrap,
  reportStartupError,
} from './src/lib/startupErrorTrap';
import { StartupErrorScreen } from './src/components/StartupErrorScreen';

// Zuerst die Fehler-Fallen setzen (synchrone Uncaught-Errors + Promise-Rejections).
installStartupErrorTrap();

// App BEWUSST per require() statt statischem import laden: statische imports
// werden hochgezogen und liefen VOR dem Trap. require() läuft hier, nach dem
// Trap und im try/catch – so werden auch Modul-Evaluierungs-Fehler (import-time,
// z. B. aus einem nativen Modul) abgefangen und sichtbar gemacht statt
// abzustürzen.
let RootComponent: ComponentType;
try {
  RootComponent = require('./App').default as ComponentType;
} catch (error) {
  reportStartupError(error);
  RootComponent = StartupErrorScreen;
}

// registerRootComponent ruft AppRegistry.registerComponent('main', () => App) auf.
registerRootComponent(RootComponent);
