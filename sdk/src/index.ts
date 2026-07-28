import { SviPassiveLiveness } from './passive';
import { SviActiveLiveness } from './active';
import type { SviLivenessConfig, LivenessResult, SdkError } from './types';

export { SviPassiveLiveness, SviActiveLiveness };
export type { SviLivenessConfig, LivenessResult, SdkError };

/** SDK version string injected at build */
export const VERSION = '1.0.0';

/**
 * Create and start a liveness check.
 *
 * @example
 * ```js
 * SviLiveness.create({
 *   backendUrl: 'http://localhost:8000',
 *   mode: 'passive',
 *   containerId: 'svi-root',
 *   onComplete: (result) => console.log(result),
 *   onError: (err) => console.error(err),
 * });
 * ```
 */
export function create(config: SviLivenessConfig): SviPassiveLiveness | SviActiveLiveness {
  return config.mode === 'active'
    ? new SviActiveLiveness(config)
    : new SviPassiveLiveness(config);
}

// Also expose as global if loaded via script tag
if (typeof window !== 'undefined') {
  (window as any).SviLiveness = { VERSION: '1.0.0', create, SviPassiveLiveness, SviActiveLiveness };
}
