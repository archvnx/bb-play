import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from './src/store/useAuthStore';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const { isRestoring, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  if (isRestoring) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#FFCC00" size="large" />
      </View>
    );
  }

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
