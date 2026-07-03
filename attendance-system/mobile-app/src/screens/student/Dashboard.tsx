import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {FadeInDown, FadeIn, Layout} from 'react-native-reanimated';
import {COLORS, SHADOWS} from '../../constants/theme';
import apiClient from '../../api/client';
import {flushSyncQueue, getPendingCount} from '../../services/offlineSync';

const {width} = Dimensions.get('window');

const StatCard: React.FC<{
  label: string;
  value: string;
  color?: string;
  icon: string;
  delay: number;
  subtitle?: string;
}> = ({label, value, color, icon, delay, subtitle}) => (
  <Animated.View
    entering={FadeInDown.duration(400).delay(delay).springify()}
    layout={Layout.springify()}
    style={[styles.statCard, color ? {borderTopColor: color, borderTopWidth: 3} : null]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, color ? {color} : null]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSub}>{subtitle}</Text>}
  </Animated.View>
);

const QuickAction: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  desc?: string;
}> = ({icon, label, onPress, color, desc}) => (
  <TouchableOpacity
    style={[styles.quickAction, color ? {backgroundColor: color + '12'} : null]}
    onPress={onPress}
    activeOpacity={0.7}>
    <View style={[styles.quickActionIconWrap, color ? {backgroundColor: color + '22'} : null]}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
    </View>
    <View style={styles.quickActionTextWrap}>
      <Text style={styles.quickActionLabel}>{label}</Text>
      {desc && <Text style={styles.quickActionDesc}>{desc}</Text>}
    </View>
    <Text style={styles.quickActionArrow}>›</Text>
  </TouchableOpacity>
);

const StudentDashboard: React.FC<{navigation: any}> = ({navigation}) => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>({});
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    loadUser();
    fetchOverview();
    checkSync();
  }, []);

  const loadUser = async () => {
    const str = await AsyncStorage.getItem('user');
    if (str) setUser(JSON.parse(str));
  };

  const checkSync = async () => {
    setPendingSync(await getPendingCount());
  };

  const fetchOverview = async () => {
    try {
      const {data} = await apiClient.get('/student-dashboard/overview');
      setOverview(data.data || data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOverview();
    checkSync();
  }, []);

  const handleSync = async () => {
    const result = await flushSyncQueue();
    await checkSync();
    Alert.alert(
      'Sync Complete',
      `${result.synced} synced.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
    );
  };

  const handleLogout = async () => {
    try { await apiClient.post('/logout'); } catch {}
    await AsyncStorage.multiRemove(['token', 'user']);
    navigation.reset({index: 0, routes: [{name: 'Login'}]});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBg} />
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Image source={require('../../assets/logo.png')} style={styles.avatarImg} resizeMode="contain" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.greeting}>Hello, {user.fname || 'Student'}</Text>
                  <Text style={styles.headerSub}>{user.matric_no || user.email || ''}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                <Text style={styles.logoutIcon}>⏻</Text>
              </TouchableOpacity>
            </View>
            {overview && (
              <View style={styles.headerBadgeRow}>
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeDot}>●</Text>
                  <Text style={styles.headerBadgeText}>{overview.total_courses ?? 0} Active Courses</Text>
                </View>
                <View style={[styles.headerBadge, {backgroundColor: 'rgba(255,255,255,0.1)'}]}>
                  <Text style={[styles.headerBadgeDot, {color: '#4ade80'}]}>●</Text>
                  <Text style={styles.headerBadgeText}>Current Session</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Sync Banner */}
        {pendingSync > 0 && (
          <Animated.View entering={FadeIn.duration(300).springify()} style={styles.syncWrap}>
            <TouchableOpacity style={styles.syncBanner} onPress={handleSync} activeOpacity={0.8}>
              <View style={styles.syncIconWrap}>
                <Text style={styles.syncIcon}>⬆</Text>
              </View>
              <View style={styles.syncTextWrap}>
                <Text style={styles.syncTitle}>Pending Sync</Text>
                <Text style={styles.syncSub}>{pendingSync} records — Tap to upload</Text>
              </View>
              <Text style={styles.syncArrow}>→</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stats */}
        <Animated.View entering={FadeInDown.duration(500).delay(100).springify()} style={styles.statsRow}>
          <StatCard icon="📚" label="Courses" value={`${overview?.total_courses ?? 0}`} subtitle="Enrolled" delay={100} color={COLORS.primary} />
          <StatCard icon="📊" label="Attendance" value={`${overview?.attendance_percentage ?? 0}%`} subtitle="Overall" delay={200} color="#0891b2" />
          <StatCard icon="💰" label="Outstanding" value={`₦${overview?.outstanding_debts ?? 0}`} subtitle="Unpaid" delay={300} color="#dc2626" />
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(400).springify()} style={styles.actions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <QuickAction
            icon="📷"
            label="Mark Attendance"
            desc="Verify with face or fingerprint"
            onPress={() => navigation.navigate('Attendance', {})}
            color={COLORS.primary}
          />

          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={styles.miniAction}
              onPress={() => navigation.navigate('Events')}
              activeOpacity={0.7}>
              <View style={[styles.miniActionIcon, {backgroundColor: '#f59e0b22'}]}>
                <Text style={styles.miniActionEmoji}>📅</Text>
              </View>
              <Text style={styles.miniActionLabel}>Events</Text>
              <Text style={styles.miniActionDesc}>Upcoming</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniAction}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.7}>
              <View style={[styles.miniActionIcon, {backgroundColor: '#6366f122'}]}>
                <Text style={styles.miniActionEmoji}>👤</Text>
              </View>
              <Text style={styles.miniActionLabel}>Profile</Text>
              <Text style={styles.miniActionDesc}>View details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniAction}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.7}>
              <View style={[styles.miniActionIcon, {backgroundColor: '#0891b222'}]}>
                <Text style={styles.miniActionEmoji}>📋</Text>
              </View>
              <Text style={styles.miniActionLabel}>Records</Text>
              <Text style={styles.miniActionDesc}>My history</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Activity Card */}
          <View style={styles.recentCard}>
            <Text style={styles.recentTitle}>Recent Activity</Text>
            {[
              {icon: '✅', text: 'Attendance recorded - CSC 301', time: '2h ago'},
              {icon: '📸', text: 'Biometric verification successful', time: '2h ago'},
              {icon: '📅', text: 'Upcoming: CSC 303 Lab Session', time: 'Tomorrow'},
            ].map((item, i) => (
              <View key={i} style={styles.recentItem}>
                <Text style={styles.recentItemIcon}>{item.icon}</Text>
                <View style={styles.recentItemTextWrap}>
                  <Text style={styles.recentItemText}>{item.text}</Text>
                  <Text style={styles.recentItemTime}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8f6f0'},
  header: {
    position: 'relative',
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {paddingHorizontal: 20},
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 14},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    padding: 8,
    ...SHADOWS.small,
  },
  avatarImg: {width: '100%', height: '100%'},
  headerTextWrap: {flex: 1},
  greeting: {fontSize: 20, fontWeight: '700', color: COLORS.white},
  headerSub: {fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2},
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {fontSize: 16, color: 'rgba(255,255,255,0.8)'},
  headerBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  headerBadgeDot: {fontSize: 8, color: '#4ade80'},
  headerBadgeText: {fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500'},
  syncWrap: {paddingHorizontal: 16, marginTop: 16},
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    padding: 14,
    borderRadius: 16,
    gap: 12,
    ...SHADOWS.small,
  },
  syncIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIcon: {fontSize: 18},
  syncTextWrap: {flex: 1},
  syncTitle: {color: COLORS.white, fontSize: 14, fontWeight: '700'},
  syncSub: {color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1},
  syncArrow: {color: 'rgba(255,255,255,0.6)', fontSize: 20, fontWeight: '300'},
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statIcon: {fontSize: 20, marginBottom: 6},
  statValue: {fontSize: 22, fontWeight: '800', color: COLORS.textPrimary},
  statLabel: {fontSize: 11, color: COLORS.textSecondary, marginTop: 3, fontWeight: '600'},
  statSub: {fontSize: 9, color: '#bbb', marginTop: 1},
  actions: {padding: 16, gap: 10},
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    ...SHADOWS.small,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {fontSize: 22},
  quickActionTextWrap: {flex: 1},
  quickActionLabel: {fontSize: 15, fontWeight: '600', color: COLORS.textPrimary},
  quickActionDesc: {fontSize: 11, color: COLORS.textSecondary, marginTop: 1},
  quickActionArrow: {fontSize: 22, color: '#ccc', fontWeight: '300'},
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniAction: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  miniActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniActionEmoji: {fontSize: 20},
  miniActionLabel: {fontSize: 12, fontWeight: '600', color: COLORS.textPrimary},
  miniActionDesc: {fontSize: 9, color: COLORS.textSecondary, marginTop: 1},
  recentCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 18,
    marginTop: 4,
    ...SHADOWS.small,
  },
  recentTitle: {fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12},
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentItemIcon: {fontSize: 18},
  recentItemTextWrap: {flex: 1},
  recentItemText: {fontSize: 13, fontWeight: '500', color: COLORS.textPrimary},
  recentItemTime: {fontSize: 10, color: COLORS.textSecondary, marginTop: 1},
});

export default StudentDashboard;
