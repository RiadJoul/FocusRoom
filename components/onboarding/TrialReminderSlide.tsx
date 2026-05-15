import React from 'react';
import { Text, View } from 'react-native';



export function TrialReminderSlide() {



  return (
    <View className="flex-1 justify-center items-center">

      <Text style={{ color: '#ffffff', fontSize: 92, fontFamily: 'Poppins_700Bold', marginBottom: 16 }}>
        🔔
      </Text>

      {/* Copy below */}
      <View style={{ marginTop: 28, alignItems: 'center', paddingHorizontal: 8 }}>
        <Text style={{ color: '#ffffff', fontSize: 20, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8 }}>
          No surprises. Ever.
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 16, fontFamily: 'Poppins_500Medium', textAlign: 'center', lineHeight: 22 }}>
          {"We'll send you a reminder 1 day before your trial ends so you're always in control."}
        </Text>
      </View>
    </View>
  );
}
