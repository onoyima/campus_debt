import {Platform} from 'react-native';

export const COLORS = {
  primary: '#004f40',
  primaryLight: '#006b57',
  primaryDark: '#00382e',
  primaryFaded: 'rgba(0, 79, 64, 0.08)',
  milk: '#FDF8F0',
  cream: '#FAF3E3',
  white: '#FFFFFF',
  textPrimary: '#1a1a2e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  error: '#dc2626',
  success: '#059669',
  warning: '#d97706',
  inputBorder: '#E5E7EB',
  cardBg: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
};

export const SHADOWS = {
  small: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {elevation: 3},
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: {elevation: 6},
  }),
  large: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.18,
      shadowRadius: 20,
    },
    android: {elevation: 12},
  }),
  primary: Platform.select({
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {elevation: 8},
  }),
};
