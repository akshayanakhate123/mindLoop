type InterceptFn = (url: string) => void;

let interceptor: InterceptFn | null = null;

export function setNavigationGuard(fn: InterceptFn) {
  interceptor = fn;
}

export function clearNavigationGuard() {
  interceptor = null;
}

/** Returns true if navigation should proceed, false if intercepted. */
export function tryNavigate(url: string): boolean {
  if (!interceptor) return true;
  interceptor(url);
  return false;
}
