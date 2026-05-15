import { AntDesign, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenListeners={() => ({
        tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      })}
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#888888',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#262626',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
        },
        animation: 'shift',
        sceneStyle: {
          backgroundColor: '#0A0A0A',
        },

        tabBarLabelStyle: {
          paddingTop: 5,
        },
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <FontAwesome5 name="tasks" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="rocket-outline" size={25} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <AntDesign name="bar-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
