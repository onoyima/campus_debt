import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import StudentDashboard from './src/screens/student/Dashboard';
import StaffDashboard from './src/screens/staff/Dashboard';
import AttendanceScreen from './src/screens/AttendanceScreen';
import EventsScreen from './src/screens/EventsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export type RootStackParamList = {
  Login: undefined;
  StudentDashboard: undefined;
  StaffDashboard: undefined;
  Attendance: {sessionId?: number; eventId?: number};
  Events: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="StudentDashboard"
          component={StudentDashboard}
          options={{title: 'Dashboard'}}
        />
        <Stack.Screen
          name="StaffDashboard"
          component={StaffDashboard}
          options={{title: 'Staff Dashboard'}}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{title: 'Attendance'}}
        />
        <Stack.Screen
          name="Events"
          component={EventsScreen}
          options={{title: 'Events'}}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{title: 'Profile'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
