import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { enforceOfflineSnapshotRetention } from './offlineSnapshots';

const foregroundRetentionIntervalMs = 1000 * 60 * 60 * 6;

export function OfflineSnapshotRetentionBridge() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRetentionRunAtRef = useRef(0);
  const retentionRunningRef = useRef(false);

  useEffect(() => {
    function runRetention(now: number) {
      if (retentionRunningRef.current) {
        return;
      }

      retentionRunningRef.current = true;
      lastRetentionRunAtRef.current = now;

      void enforceOfflineSnapshotRetention()
        .catch(() => undefined)
        .finally(() => {
          retentionRunningRef.current = false;
        });
    }

    runRetention(Date.now());

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const returnedToForeground =
        nextState === 'active' && (previousState === 'background' || previousState === 'inactive');
      if (!returnedToForeground) {
        return;
      }

      const now = Date.now();
      if (now - lastRetentionRunAtRef.current < foregroundRetentionIntervalMs) {
        return;
      }

      runRetention(now);
    });

    return () => subscription.remove();
  }, []);

  return null;
}
