import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DoctorsListScreen } from './DoctorsListScreen';
import { RegisterDoctorScreen } from './RegisterDoctorScreen';
import { DoctorsStackParamList } from '../types';

const Stack = createNativeStackNavigator<DoctorsStackParamList>();

export const DoctorsScreen: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="DoctorsList"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DoctorsList" component={DoctorsListScreen} />
      <Stack.Screen name="RegisterDoctor" component={RegisterDoctorScreen} />
    </Stack.Navigator>
  );
};
