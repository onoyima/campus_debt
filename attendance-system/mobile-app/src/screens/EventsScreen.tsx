import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {COLORS, SHADOWS} from '../constants/theme';
import apiClient from '../api/client';

const statusColors: Record<string, string> = {
  active: COLORS.success,
  draft: COLORS.textMuted,
  completed: COLORS.primary,
  cancelled: COLORS.error,
};

const EventsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const {data} = await apiClient.get(
        '/institutional-events?per_page=20',
      );
      setEvents(data.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderEvent = ({item, index}: {item: any; index: number}) => (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 80)}>
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() =>
          navigation.navigate('Attendance', {eventId: item.id})
        }
        activeOpacity={0.8}>
        <View style={styles.eventTop}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: (statusColors[item.status] || COLORS.textMuted) + '20'},
            ]}>
            <Text
              style={[
                styles.statusText,
                {color: statusColors[item.status] || COLORS.textMuted},
              ]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.eventDate}>{item.start_date}</Text>
        {item.venue && (
          <Text style={styles.eventVenue}>📍 {item.venue}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <Text style={styles.headerSub}>
          Tap an event to record attendance
        </Text>
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchEvents();
            }}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No Events</Text>
              <Text style={styles.emptyDesc}>
                There are no upcoming events at this time.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.cream},
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {marginBottom: 12, alignSelf: 'flex-start'},
  backText: {color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500'},
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  list: {padding: 16, paddingBottom: 32},
  eventCard: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eventDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  eventVenue: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default EventsScreen;
