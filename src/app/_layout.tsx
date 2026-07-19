// src/app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import Login from './(auth)/login';
import Onboarding from './onboarding';
import LockScreen from '@/components/lock-screen';
import { supabase } from '@/lib/supabase';
import { hasPin } from '@/lib/pin-storage';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isLocked, setIsLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const appState = useRef(AppState.currentState);

  async function checkOnboarding(userId: string) {
    const result = await supabase
      .from('user_settings')
      .select('onboarding_completed, app_lock_enabled')
      .eq('user_id', userId)
      .single();

    setOnboardingCompleted(result.data ? result.data.onboarding_completed : false);
    setAppLockEnabled(result.data ? result.data.app_lock_enabled : true);
  }

  useEffect(function () {
    supabase.auth.getSession().then(async function (res) {
      setSession(res.data.session);
      if (res.data.session) await checkOnboarding(res.data.session.user.id);
      setPinExists(await hasPin());
      setIsLoading(false);
    });

    const listener = supabase.auth.onAuthStateChange(async function (_event, newSession) {
      setSession(newSession);
      if (newSession) await checkOnboarding(newSession.user.id);
    });

    return function () {
      listener.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(function () {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', async function (nextState) {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        session &&
        appLockEnabled
      ) {
        setPinExists(await hasPin());
        setIsLocked(true);
      }
      appState.current = nextState;
    });

    return function () {
      subscription.remove();
    };
  }, [session, appLockEnabled]);

  async function handleBiometric() {
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'אימות זהות',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
      }
    } finally {
      setAuthenticating(false);
    }
  }

  function handlePinUnlock() {
    setIsLocked(false);
  }

  if (isLoading) {
    return null;
  }

  let content = <Login />;
  if (session) {
    content = onboardingCompleted ? (
      <AppTabs />
    ) : (
      <Onboarding onComplete={function () { setOnboardingCompleted(true); }} />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isLocked ? (
        <LockScreen
          onUnlock={handlePinUnlock}
          onBiometric={handleBiometric}
          authenticating={authenticating}
          hasPinSet={pinExists}
        />
      ) : (
        content
      )}
    </ThemeProvider>
  );
}