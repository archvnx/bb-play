import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../screens/main/HomeScreen';
import BookingScreen from '../screens/main/BookingScreen';
import NewsScreen from '../screens/main/NewsScreen';
import ChatbotScreen from '../screens/main/ChatbotScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { HomeIcon, BookingIcon, NewsIcon, BotIcon, ProfileIcon } from '../components/ui/Icons';

const Tab = createBottomTabNavigator();

interface TabIconProps {
  focused: boolean;
  IconComponent: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

const TabIcon = ({ focused, IconComponent }: TabIconProps) => (
  <View style={[tabSt.wrap, focused && tabSt.wrapActive]}>
    <IconComponent
      size={24}
      color={focused ? '#FFCC00' : '#555'}
      strokeWidth={focused ? 2.5 : 1.8}
    />
    {focused && <View style={tabSt.dot} />}
  </View>
);

const tabSt = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
    borderRadius: 14,
    gap: 4,
  },
  wrapActive: {
    backgroundColor: 'rgba(255, 204, 0, 0.08)',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFCC00',
  },
});

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#080808',
          borderTopColor: '#111',
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 10,
          paddingTop: 4,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} IconComponent={HomeIcon} />,
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} IconComponent={BookingIcon} />,
        }}
      />
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} IconComponent={NewsIcon} />,
        }}
      />
      <Tab.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} IconComponent={BotIcon} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} IconComponent={ProfileIcon} />,
        }}
      />
    </Tab.Navigator>
  );
}
