import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore }    from '../store/useAuthStore';
import { useBookingStore } from '../store/useBookingStore';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const isLoggedIn  = useAuthStore((state) => state.isLoggedIn);
  const isRestoring = useAuthStore((state) => state.isRestoring);

  // Сбрасываем локальные брони при выходе из аккаунта.
  // Подписка здесь вместо useAuthStore, чтобы избежать циклической зависимости сторов.
  useEffect(() => {
    if (!isLoggedIn) {
      useBookingStore.getState().resetSession();
    }
  }, [isLoggedIn]);

  if (isRestoring) {
    return (
      <View style={st.loader}>
        <ActivityIndicator size="large" color="#FFCC00" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const st = StyleSheet.create({
  loader: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
});
