import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {COLORS, SHADOWS} from '../constants/theme';

const ProfileScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [user, setUser] = useState<any>({});

  useEffect(() => {
    AsyncStorage.getItem('user').then(str => {
      if (str) setUser(JSON.parse(str));
    });
  }, []);

  const fields = [
    {label: 'Full Name', value: `${user.fname || ''} ${user.lname || ''}`},
    {label: 'Email Address', value: user.email},
    {label: 'Account Type', value: user.type},
    {label: 'User ID', value: `#${user.id}`},
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {(user.fname?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerName}>
            {user.fname || ''} {user.lname || ''}
          </Text>
          <Text style={styles.headerEmail}>{user.email || ''}</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          {fields.map((f, i) =>
            f.value ? (
              <Animated.View
                key={f.label}
                entering={FadeInDown.duration(350).delay(i * 80)}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{f.value}</Text>
                </View>
              </Animated.View>
            ) : null,
          )}
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
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {alignSelf: 'flex-start', marginBottom: 16},
  backText: {color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500'},
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  avatarLetter: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  content: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
});

export default ProfileScreen;
