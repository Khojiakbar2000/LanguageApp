import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { RoomControls } from './types';
export function usePandaAnimation(night: boolean) {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [status, setStatus] = useState('Dori is enjoying a quiet moment.');
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  const active = focused && foreground;
  const nightProgress = useSharedValue(night ? 1 : 0);
  const action = useSharedValue(0);
  const actionTime = useSharedValue(0);
  const fireRef = useRef<RoomControls['fireRef']['current']>(null);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadline = useRef(0);
  const remaining = useRef(0);
  const finish = useCallback(() => {
    locked.current = false;
    setBusy(false);
    action.set(0);
    actionTime.set(0);
    setStatus('Dori is enjoying a quiet moment.');
  }, [action, actionTime]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    nightProgress.set(reduced ? (night ? 1 : 0) : withTiming(night ? 1 : 0, { duration: 900 }));
  }, [night, reduced, nightProgress]);
  useEffect(() => {
    if (!active) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      remaining.current = Math.max(0, deadline.current - Date.now());
      cancelAnimation(actionTime);
    } else if (locked.current && remaining.current > 0) {
      deadline.current = Date.now() + remaining.current;
      const target = action.get() === 2 ? 9.2 : 2.8;
      actionTime.set(withTiming(target, { duration: remaining.current, easing: Easing.linear }));
      timer.current = setTimeout(finish, remaining.current);
    }
  }, [active, action, actionTime, finish]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      cancelAnimation(actionTime);
      cancelAnimation(nightProgress);
      fireRef.current = null;
    },
    [actionTime, nightProgress],
  );
  const request = useCallback(
    (kind: 'coffee' | 'wave') => {
      if (!active || locked.current) return false;
      void Haptics.selectionAsync().catch(() => undefined);
      if (reduced) {
        const message =
          kind === 'coffee' ? '따뜻해요. Dori enjoyed a warm coffee.' : '안녕! Dori says hello.';
        setStatus(message);
        AccessibilityInfo.announceForAccessibility(message);
        return true;
      }
      locked.current = true;
      setBusy(true);
      setStatus(
        kind === 'coffee' ? 'Dori is taking a little coffee break.' : '안녕! Dori is waving hello.',
      );
      const duration = kind === 'coffee' ? 9200 : 2800;
      action.set(kind === 'coffee' ? 2 : 1);
      actionTime.set(0);
      actionTime.set(withTiming(duration / 1000, { duration, easing: Easing.linear }));
      deadline.current = Date.now() + duration;
      remaining.current = duration;
      fireRef.current?.(kind);
      timer.current = setTimeout(finish, duration);
      return true;
    },
    [active, reduced, action, actionTime, finish],
  );
  return {
    controls: { active, busy, reduced, night, nightProgress, action, actionTime, fireRef },
    busy,
    status,
    request,
  };
}
