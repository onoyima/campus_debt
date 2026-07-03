import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {COLORS, SHADOWS} from '../../constants/theme';
import apiClient from '../../api/client';

interface ActionCardProps {
  icon: string;
  title: string;
  desc: string;
  delay: number;
  onPress: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  desc,
  delay,
  onPress,
}) => (
  <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
      <Text style={styles.cardArrow}>→</Text>
    </TouchableOpacity>
  </Animated.View>
);

const StaffDashboard: React.FC<{navigation: any}> = ({navigation}) => {
  const [user, setUser] = useState<any>({});

  useEffect(() => {
    AsyncStorage.getItem('user').then(str => {
      if (str) setUser(JSON.parse(str));
    });
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/logout');
    } catch {}
    await AsyncStorage.multiRemove(['token', 'user']);
    navigation.reset({index: 0, routes: [{name: 'Login'}]});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.headerLogoSmall}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.headerLogoImg}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.greeting}>Welcome, {user.fname || 'Staff'}</Text>
                <Text style={styles.headerSub}>{user.email || ''}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerRole}>
            Staff Dashboard
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <ActionCard
            icon="📷"
            title="Take Attendance"
            desc="Record student attendance via biometrics"
            delay={100}
            onPress={() => navigation.navigate('Attendance', {})}
          />
          <ActionCard
            icon="📅"
            title="My Events"
            desc="View and manage institutional events"
            delay={200}
            onPress={() => navigation.navigate('Events')}
          />
          <ActionCard
            icon="👤"
            title="Profile"
            desc="View your account information"
            delay={300}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.cream},
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    padding: 6,
  },
  headerLogoImg: {
    width: '100%',
    height: '100%',
  },
  greeting: {fontSize: 22, fontWeight: '700', color: COLORS.white},
  headerSub: {fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2},
  headerRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
    fontWeight: '500',
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutText: {color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500'},
  actions: {padding: 16, gap: 12, marginTop: 8},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    gap: 16,
    ...SHADOWS.small,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: {fontSize: 22},
  cardBody: {flex: 1},
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardArrow: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});

export default StaffDashboard;
