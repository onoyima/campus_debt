import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {COLORS, SHADOWS} from '../constants/theme';
import apiClient from '../api/client';
import CameraCapture from '../components/CameraCapture';
import FingerprintCapture from '../components/FingerprintCapture';
import {addToSyncQueue, getPendingCount} from '../services/offlineSync';

const AttendanceScreen: React.FC<{route: any; navigation: any}> = ({
  route,
  navigation,
}) => {
  const [loading, setLoading] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<
    'face' | 'fingerprint' | null
  >(null);
  const [result, setResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [user, setUser] = useState<any>({});

  const sessionId = route.params?.sessionId;
  const eventId = route.params?.eventId;

  useEffect(() => {
    loadUser();
    checkPendingSync();
  }, []);

  const loadUser = async () => {
    const str = await AsyncStorage.getItem('user');
    if (str) setUser(JSON.parse(str));
  };

  const checkPendingSync = async () => {
    setPendingSync(await getPendingCount());
  };

  const submitAttendance = async (
    method: 'face' | 'fingerprint',
    capturedData: string,
  ) => {
    setLoading(true);
    setResult(null);
    try {
      const {data} = await apiClient.post('/biometric-templates/verify', {
        user_id: user.id,
        user_type: user.type || 'student',
        method,
        captured_data: capturedData,
        terminal_id: null,
      });
      setResult(data.data);
      if (data.data?.success) {
        const payload: any = {
          student_id: user.id,
          status_id: 1,
          attendance_method: `biometric_${method}`,
          timestamp: new Date().toISOString(),
        };
        if (sessionId) payload.session_id = sessionId;
        if (eventId) payload.institutional_event_id = eventId;

        try {
          await apiClient.post('/attendance-records', payload);
          Alert.alert('Success', 'Attendance recorded successfully!');
        } catch {
          await addToSyncQueue('attendance_records', 'create', payload);
          await checkPendingSync();
          Alert.alert(
            'Queued',
            'Offline. Attendance will sync when connectivity is restored.',
          );
        }
      } else {
        Alert.alert(
          'Verification Failed',
          data.data?.error_message || 'Biometric verification failed.',
        );
      }
    } catch (error: any) {
      if (
        error.message?.includes('Network') ||
        error.message?.includes('network')
      ) {
        await addToSyncQueue(
          'biometric_verification',
          'create',
          {
            user_id: user.id,
            user_type: user.type || 'student',
            method,
            captured_data: capturedData,
            session_id: sessionId,
            event_id: eventId,
          },
        );
        await checkPendingSync();
        Alert.alert(
          'Queued',
          'Offline. The record will sync when connectivity is restored.',
        );
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.message || 'Failed to record attendance.',
        );
      }
    } finally {
      setLoading(false);
      setVerificationMethod(null);
    }
  };

  const handleFaceCapture = (base64Image: string) => {
    setShowCamera(false);
    submitAttendance('face', base64Image);
  };

  const handleFingerprintCapture = (signature: string) => {
    setShowFingerprint(false);
    submitAttendance('fingerprint', signature);
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleFaceCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  if (showFingerprint) {
    return (
      <FingerprintCapture
        onCapture={handleFingerprintCapture}
        onClose={() => setShowFingerprint(false)}
      />
    );
  }

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
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSub}>
            {sessionId
              ? `Session #${sessionId}`
              : eventId
                ? `Event #${eventId}`
                : 'Quick Attendance'}
          </Text>
        </View>

        {/* Sync Banner */}
        {pendingSync > 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.syncBanner}>
              <Text style={styles.syncText}>
                {pendingSync} attendance records pending sync
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Verification Methods */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Choose Verification Method</Text>
          <Text style={styles.sectionDesc}>
            Select your preferred method to verify your identity and record
            attendance.
          </Text>

          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setShowCamera(true)}
              disabled={loading}
              activeOpacity={0.9}>
              <View style={styles.methodIconCircle}>
                <Text style={styles.methodIcon}>📷</Text>
              </View>
              <View style={styles.methodBody}>
                <Text style={styles.methodTitle}>Face Recognition</Text>
                <Text style={styles.methodDesc}>
                  Use your camera for quick contactless verification
                </Text>
              </View>
              {loading && verificationMethod === 'face' ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.methodArrow}>→</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setShowFingerprint(true)}
              disabled={loading}
              activeOpacity={0.9}>
              <View style={styles.methodIconCircle}>
                <Text style={styles.methodIcon}>🔒</Text>
              </View>
              <View style={styles.methodBody}>
                <Text style={styles.methodTitle}>Fingerprint</Text>
                <Text style={styles.methodDesc}>
                  Use your fingerprint sensor for secure verification
                </Text>
              </View>
              {loading && verificationMethod === 'fingerprint' ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.methodArrow}>→</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Result */}
          {result && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[
                styles.resultCard,
                result.success ? styles.resultSuccess : styles.resultFail,
              ]}>
              <Text
                style={[
                  styles.resultTitle,
                  {color: result.success ? COLORS.success : COLORS.error},
                ]}>
                {result.success ? '✓ Verified' : '✗ Verification Failed'}
              </Text>
              {result.confidence_score ? (
                <Text style={styles.resultDetail}>
                  Confidence: {(result.confidence_score * 100).toFixed(1)}%
                </Text>
              ) : null}
              {result.liveness_score ? (
                <Text style={styles.resultDetail}>
                  Liveness: {(result.liveness_score * 100).toFixed(1)}%
                </Text>
              ) : null}
              {result.duration_ms ? (
                <Text style={styles.resultDetail}>
                  Duration: {result.duration_ms}ms
                </Text>
              ) : null}
              {result.error_message ? (
                <Text style={styles.resultError}>
                  {result.error_message}
                </Text>
              ) : null}
            </Animated.View>
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
  syncBanner: {
    backgroundColor: COLORS.warning,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  syncText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {padding: 16, gap: 12},
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    gap: 16,
    ...SHADOWS.small,
  },
  methodIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodIcon: {fontSize: 24},
  methodBody: {flex: 1},
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  methodDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  methodArrow: {fontSize: 18, color: COLORS.textMuted, fontWeight: '600'},
  resultCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  resultSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  resultFail: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  resultDetail: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  resultError: {
    color: COLORS.error,
    marginTop: 8,
    fontSize: 14,
  },
});

export default AttendanceScreen;
