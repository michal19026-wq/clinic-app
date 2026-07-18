// src/app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import Login from './(auth)/login';
import Onboarding from './onboarding';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkOnboarding(userId: string) {
    const { data } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .single();
    setOnboardingCompleted(data?.onboarding_completed ?? false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) await checkOnboarding(session.user.id);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) await checkOnboarding(session.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return null;
  }

  let content = <Login />;
  if (session) {
    content = onboardingCompleted ? (
      <AppTabs />
    ) : (
      <Onboarding onComplete={() => setOnboardingCompleted(true)} />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {content}
    </ThemeProvider>
  );
}