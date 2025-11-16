import { NavigationContainerRef, createNavigationContainerRef, ParamListBase } from '@react-navigation/native';

// Import your navigation param list types
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Helper type to extract route names
type RouteNames = keyof RootStackParamList;

export function navigate<RouteName extends RouteNames>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    // Use type assertion to handle the navigation
    (navigationRef.navigate as any)(name, params);
  } else {
    console.warn('Navigation reference is not ready');
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export function resetTo<RouteName extends RouteNames>(
  routeName: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: routeName, params } as any],
    });
  }
}

export function getCurrentRoute() {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute();
  }
  return null;
}

// Helper function to get the navigation state
export function getNavigationState() {
  if (navigationRef.isReady()) {
    return navigationRef.getRootState();
  }
  return null;
}

// Helper function to check if a screen exists in the current navigation state
export function isRouteActive(routeName: string): boolean {
  const state = getNavigationState();
  if (!state) return false;
  
  const findRoute = (routes: any[]): boolean => {
    return routes.some(route => {
      if (route.name === routeName) return true;
      if (route.state?.routes) return findRoute(route.state.routes);
      return false;
    });
  };
  
  return findRoute(state.routes);
}
