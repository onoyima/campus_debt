import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import {COLORS, SHADOWS} from '../constants/theme';
import apiClient from '../api/client';

const LoginScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(
    null,
  );
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const logoScale = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withDelay(
      200,
      withSpring(1, {damping: 12, stiffness: 100}),
    );
    formOpacity.value = withDelay(
      600,
      withTiming(1, {duration: 600, easing: Easing.out(Easing.ease)}),
    );
  }, []);

  const logoAnimated = useAnimatedStyle(() => ({
    transform: [{scale: logoScale.value}],
  }));

  const formAnimated = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const buttonAnimated = useAnimatedStyle(() => ({
    transform: [{scale: buttonScale.value}],
  }));

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    if (!email.trim()) {
      setEmailError('Enter your email or matric number');
      valid = false;
    }
    if (!password) {
      setPasswordError('Enter your password');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const {data} = await apiClient.post('/login', {
        email: email.trim(),
        password,
      });
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      navigation.replace(
        data.user.type === 'staff' ? 'StaffDashboard' : 'StudentDashboard',
      );
    } catch (error: any) {
      const msg =
        error.response?.data?.errors?.email?.[0] ||
        error.response?.data?.message ||
        'Invalid credentials. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, logoAnimated]}>
          <View style={styles.logoIcon}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Veritas Attendance</Text>
          <Text style={styles.tagline}>Secure. Smart. Seamless.</Text>
        </Animated.View>

        <Animated.View style={[styles.card, formAnimated]}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to track your attendance and stay on top of your academic
            commitments.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL OR MATRIC NUMBER</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'email' && styles.inputFocused,
                emailError ? styles.inputError : null,
              ]}
              placeholder="e.g. johndoe or johndoe@veritas.edu.ng"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={t => {
                setEmail(t);
                if (emailError) setEmailError('');
              }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'password' && styles.inputFocused,
                passwordError ? styles.inputError : null,
              ]}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={t => {
                setPassword(t);
                if (passwordError) setPasswordError('');
              }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              autoCapitalize="none"
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          <Animated.View style={buttonAnimated}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              onPressIn={() =>
                (buttonScale.value = withTiming(0.96, {duration: 80}))
              }
              onPressOut={() =>
                (buttonScale.value = withSpring(1, {damping: 15, stiffness: 200}))
              }
              disabled={loading}
              activeOpacity={0.9}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.helpText}>
            Use your university email or matric number to sign in.{'\n'}
            Staff should use their staff email.
          </Text>
        </Animated.View>

        <Animated.View
          style={styles.footer}
          entering={FadeIn.delay(900).duration(600)}>
          <Text style={styles.footerText}>
            Powered by Veritas University ICT
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.primary},
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
  },
  header: {alignItems: 'center', marginBottom: 36},
  logoIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.large,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.milk,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 32,
    ...SHADOWS.large,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 28,
  },
  inputGroup: {marginBottom: 20},
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },
  inputError: {borderColor: COLORS.error},
  errorText: {fontSize: 12, color: COLORS.error, marginTop: 4, marginLeft: 4},
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.primary,
  },
  buttonDisabled: {opacity: 0.7},
  buttonContent: {flexDirection: 'row', alignItems: 'center'},
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonArrow: {
    color: COLORS.white,
    fontSize: 18,
    marginLeft: 10,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 24,
  },
  footer: {alignItems: 'center', marginTop: 28},
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
  },
});

export default LoginScreen;
