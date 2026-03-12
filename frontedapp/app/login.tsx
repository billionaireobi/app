/**
 * Login screen with camera photo + GPS tracking
 * Mirrors the web app's login.html + save_login_session logic
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../src/store/authStore';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { CameraCapture, type CaptureResult } from '../src/components/CameraCapture';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/colors';
import { saveLoginSession } from '../src/api/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string; photo?: string }>({});
  const [photoResult, setPhotoResult] = useState<CaptureResult | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Acquire GPS on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch {
          // GPS not available — non-fatal
        }
      }
    })();
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (!username.trim()) e.username = 'Username is required';
    if (!password.trim()) e.password = 'Password is required';
    if (!photoResult) e.photo = 'Login photo is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveLoginSessionData = async () => {
    if (!photoResult) return;
    try {
      // Convert image URI to base64
      let photoBase64: string | undefined;
      try {
        const base64 = await FileSystem.readAsStringAsync(photoResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        photoBase64 = base64;
      } catch {
        // If conversion fails, still continue without the photo
      }
      
      await saveLoginSession({
        latitude: photoResult.latitude ?? gpsCoords?.lat ?? undefined,
        longitude: photoResult.longitude ?? gpsCoords?.lng ?? undefined,
        photo_base64: photoBase64,
        timestamp: photoResult.timestamp,
      });
    } catch {
      // Non-fatal — session save failure should not block login
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      console.log('Attempting login with username:', username);
      await login({ username: username.trim(), password });
      console.log('Login successful, saving session...');
      await saveLoginSessionData();
      console.log('Session saved, navigating to tabs...');
      router.replace('/(tabs)');
    } catch (err) {
      const message = (err as Error).message ?? 'Login failed. Please try again.';
      console.error('Login error:', message, err);
      Toast.show({ type: 'error', text1: 'Login Failed', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoCapture = (result: CaptureResult) => {
    setPhotoResult(result);
    setCameraOpen(false);
    setErrors((prev) => ({ ...prev, photo: undefined }));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            {/* McDave brand logo mark */}
            <View style={styles.logoWrap}>
              <View style={styles.logoInner}>
                <Text style={styles.logoMC}>MC</Text>
                <View style={styles.logoAccentBar} />
              </View>
            </View>
            <Text style={styles.appName}>
              <Text style={{ color: Colors.white }}>Mc</Text>
              <Text style={{ color: Colors.gold }}>Dave</Text>
            </Text>
            <Text style={styles.tagline}>Order Management System</Text>

            {/* GPS status pill */}
            <View style={styles.gpsStatus}>
              <View style={[styles.gpsDot, gpsCoords ? styles.gpsOk : styles.gpsWait]} />
              <Text style={styles.gpsText}>
                {gpsCoords
                  ? `Location: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}`
                  : 'Acquiring location...'}
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Enter credentials and take a login photo</Text>

            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              leftIcon="person-outline"
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username}
              required
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              leftIcon="lock-closed-outline"
              placeholder="Enter your password"
              secureTextEntry
              error={errors.password}
              required
            />

            {/* Photo Capture */}
            <Text style={styles.photoLabel}>
              Login Photo <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.photoArea, errors.photo ? styles.photoAreaError : null]}
              onPress={() => setCameraOpen(true)}
              activeOpacity={0.8}
            >
              {photoResult ? (
                <View style={styles.photoPreviewWrap}>
                  <Image
                    source={{ uri: photoResult.uri }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <View style={styles.photoBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.photoBadgeText}>Photo captured</Text>
                  </View>
                  {photoResult.latitude && (
                    <Text style={styles.photoGps}>
                      {`\u{1F4CD} ${photoResult.latitude.toFixed(5)}, ${photoResult.longitude?.toFixed(5)}`}
                    </Text>
                  )}
                  <View style={styles.retakeOverlay}>
                    <Ionicons name="camera-outline" size={16} color={Colors.white} />
                    <Text style={styles.retakeText}>Tap to retake</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={Colors.gray400} />
                  <Text style={styles.photoHint}>Tap to take login photo</Text>
                  <Text style={styles.photoSub}>Front camera (selfie) · GPS watermarked</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}

            <Button
              onPress={handleLogin}
              label="Sign In"
              loading={submitting || isLoading}
              fullWidth
              size="lg"
              style={styles.loginBtn}
              textStyle={{ fontWeight: '800', letterSpacing: 0.5 }}
            />

            <TouchableOpacity
              onPress={() =>
                Toast.show({
                  type: 'info',
                  text1: 'Contact your administrator to reset your password.',
                })
              }
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>Forgot password? Contact administrator</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>McDave Co. Ltd · Nairobi, Kenya</Text>
            <Text style={styles.version}>v1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Camera Modal — front camera for selfie identity verification */}
      <CameraCapture
        visible={cameraOpen}
        username={username.trim() || 'User'}
        title="Login Photo"
        facing="front"
        onCapture={handlePhotoCapture}
        onClose={() => setCameraOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: Spacing.xl },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  logoWrap: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMC: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 2,
  },
  logoAccentBar: {
    height: 3,
    width: 36,
    backgroundColor: Colors.gold,
    borderRadius: 2,
    marginTop: 2,
  },
  appName: { fontSize: 32, fontWeight: '900', letterSpacing: 0.5 },
  tagline: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsOk: { backgroundColor: '#4ADE80' },
  gpsWait: { backgroundColor: '#FBBF24' },
  gpsText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  card: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  cardTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xl },
  photoLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  required: { color: Colors.error },
  photoArea: {
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    minHeight: 150,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  photoAreaError: { borderColor: Colors.error },
  photoPlaceholder: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.gray50,
  },
  photoHint: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '500' },
  photoSub: { fontSize: FontSize.xs, color: Colors.gray400 },
  photoPreviewWrap: { height: 200, position: 'relative' },
  photoPreview: { width: '100%', height: '100%' },
  photoBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  photoBadgeText: { fontSize: FontSize.xs, color: Colors.white, fontWeight: '600' },
  photoGps: {
    position: 'absolute',
    bottom: 30,
    left: Spacing.sm,
    right: Spacing.sm,
    fontSize: 10,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  retakeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: Spacing.sm,
  },
  retakeText: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
  errorText: { fontSize: FontSize.xs, color: Colors.error, marginBottom: Spacing.sm },
  loginBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  forgotLink: { alignItems: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, textDecorationLine: 'underline' },
  footer: { alignItems: 'center', marginTop: Spacing.xl, gap: 4 },
  footerText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)' },
  version: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.4)' },
});
