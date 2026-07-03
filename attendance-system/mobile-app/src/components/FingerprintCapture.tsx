import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

interface FingerprintCaptureProps {
  onCapture: (base64Template: string) => void;
  onClose: () => void;
}

const FingerprintCapture: React.FC<FingerprintCaptureProps> = ({
  onCapture,
  onClose,
}) => {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    try {
      const {available} = await rnBiometrics.isSensorAvailable();
      setSupported(available);
    } catch {
      setSupported(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const epochTimeSeconds = Math.round(
        new Date().getTime() / 1000,
      ).toString();
      const payload = epochTimeSeconds + 'attendance_fp_auth';

      const {success, signature} = await rnBiometrics.createSignature({
        promptMessage: 'Scan fingerprint to verify identity',
        payload,
      });

      if (success && signature) {
        onCapture(signature);
      } else {
        Alert.alert('Failed', 'Fingerprint scan was cancelled or failed.');
      }
    } catch (error: any) {
      Alert.alert(
        'Scan Error',
        error?.message || 'Could not complete fingerprint scan.',
      );
    } finally {
      setScanning(false);
    }
  };

  if (supported === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Checking fingerprint support...</Text>
      </View>
    );
  }

  if (supported === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Fingerprint scanner is not available on this device.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fingerprint Verification</Text>
      <Text style={styles.hint}>
        Place your finger on the scanner
      </Text>

      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.disabled]}
        onPress={handleScan}
        disabled={scanning}>
        <Text style={styles.scanIcon}>🔒</Text>
        <Text style={styles.scanText}>
          {scanning ? 'Scanning...' : 'Tap to Scan'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8},
  hint: {fontSize: 16, color: '#6b7280', marginBottom: 40, textAlign: 'center'},
  message: {fontSize: 16, color: '#6b7280', textAlign: 'center', margin: 40},
  scanButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    elevation: 4,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  scanIcon: {fontSize: 48, marginBottom: 8},
  scanText: {color: '#fff', fontSize: 14, fontWeight: '600'},
  disabled: {opacity: 0.6},
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 8,
    margin: 40,
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  cancelButton: {padding: 12},
  cancelText: {color: '#6b7280', fontSize: 16},
});

export default FingerprintCapture;
