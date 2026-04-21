import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  photo?: string;
  name: string;
}

export function Avatar({ photo, name }: AvatarProps) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (photo && photo.length > 10) {
    return (
      <Image
        source={{ uri: photo }}
        style={st.img}
        key={photo.slice(0, 50)}
      />
    );
  }
  return (
    <View style={st.wrap}>
      <Text style={st.text}>{initials}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  img:  { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFCC00' },
  wrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1A1A1A', borderWidth: 3, borderColor: '#FFCC00', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFCC00', fontSize: 32, fontWeight: '900' },
});
