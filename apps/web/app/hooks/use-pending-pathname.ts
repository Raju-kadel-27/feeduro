import { useLocation, useNavigation } from "react-router";

/**
 * Returns the pathname of the in-flight navigation while a loader is running,
 * falling back to the settled location. Use this instead of useLocation().pathname
 * for active-tab highlighting so links appear selected the moment they're clicked.
 */
export function usePendingPathname() {
  const location = useLocation();
  const navigation = useNavigation();
  return navigation.location?.pathname ?? location.pathname;
}
