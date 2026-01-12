import { ResizeMode, Video } from 'expo-av';
import React, {  useRef } from 'react';
import {  View } from 'react-native';


export function Premium3DSlide() {


  const cinematicVideoRef = useRef<Video>(null);

  return (
    <View className="flex-1 justify-center">


      <View className="mt-1 items-center">
        <Video
          ref={cinematicVideoRef}
          source={require('../../assets/videos/session-3d.mp4')}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted

          style={{ width: '100%', height: '130%' }}
        />
      </View>
    </View>
  );
}
