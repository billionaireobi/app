/**
 * CameraCapture — camera modal with face-guide oval overlay.
 * The capture button is disabled until a face is detected inside the oval.
 * Forces rear camera by default; pass facing="front" for selfie.
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { FaceFeature } from 'expo-face-detector';
import * as Location from 'expo-location';

// Dynamically require expo-face-detector so the app doesn't crash in Expo Go
// (native module only available in custom dev/production builds).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FD: any = null;
try {
  FD = require('expo-face-detector');
} catch {
  // Running in Expo Go — face detection disabled, visual guide only
}
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/colors';

export interface CaptureResult {
  uri: string;
  base64?: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

interface CameraCaptureProps {
  visible: boolean;
  username: string;
  onCapture: (result: CaptureResult) => void;
  onClose: () => void;
  title?: string;
  /** Which camera to use. Defaults to 'back'. Pass 'front' for selfie. */
  facing?: 'front' | 'back';
}

// Oval guide occupies this fraction of the camera view
const OVAL_W_RATIO = 0.62; // 62% of view width
const OVAL_H_RATIO = 0.52; // 52% of view height
// Oval vertical center is slightly above the mid-point (better for a face/head)
const OVAL_CENTER_Y_RATIO = 0.46;

export function CameraCapture({
  visible,
  username,
  onCapture,
  onClose,
  title = 'Take Photo',
  facing = 'back',
}: CameraCaptureProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const [preview, setPreview] = useState<string | null>(null);
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Face detection state
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceInPosition, setFaceInPosition] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  // Reset state when modal closes
  React.useEffect(() => {
    if (!visible) {
      setPreview(null);
      setCaptureResult(null);
      setFaceDetected(false);
      setFaceInPosition(false);
      return;
    }
    (async () => {
      setGpsLoading(true);
      try {
        if (!locationPermission?.granted) {
          await requestLocationPermission();
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
        });
        setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        setGpsCoords(null);
      } finally {
        setGpsLoading(false);
      }
    })();
  }, [visible]);

  // Compute the oval's bounding box in view-space pixels
  const ovalBounds = useMemo(() => {
    const { width, height } = cameraLayout;
    if (!width || !height) return null;
    const ovalW = width * OVAL_W_RATIO;
    const ovalH = height * OVAL_H_RATIO;
    const centerX = width / 2;
    const centerY = height * OVAL_CENTER_Y_RATIO;
    return {
      left: centerX - ovalW / 2,
      top: centerY - ovalH / 2,
      right: centerX + ovalW / 2,
      bottom: centerY + ovalH / 2,
      width: ovalW,
      height: ovalH,
      centerX,
      centerY,
    };
  }, [cameraLayout]);

  const handleCameraLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCameraLayout({ width, height });
  }, []);

  // Called by CameraView whenever faces are detected / lost
  const handleFacesDetected = useCallback(
    ({ faces }: { faces: FaceFeature[] }) => {
      if (!faces || faces.length === 0) {
        setFaceDetected(false);
        setFaceInPosition(false);
        return;
      }

      setFaceDetected(true);

      if (!ovalBounds) return;

      // Pick the largest face (closest to camera)
      const face = faces.reduce((best, f) =>
        f.bounds.size.width > best.bounds.size.width ? f : best
      );
      const { origin, size } = face.bounds;
      const faceCX = origin.x + size.width / 2;
      const faceCY = origin.y + size.height / 2;

      // Allow a 12% tolerance margin inside the oval centre
      const tolerX = ovalBounds.width * 0.12;
      const tolerY = ovalBounds.height * 0.12;

      const centred =
        faceCX >= ovalBounds.left + tolerX &&
        faceCX <= ovalBounds.right - tolerX &&
        faceCY >= ovalBounds.top + tolerY &&
        faceCY <= ovalBounds.bottom - tolerY;

      // Face size sanity: not too tiny (far away) or too big (too close)
      const minW = ovalBounds.width * 0.28;
      const maxW = ovalBounds.width * 1.15;
      const sizeOk = size.width >= minW && size.width <= maxW;

      setFaceInPosition(centred && sizeOk);
    },
    [ovalBounds]
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo) throw new Error('No photo captured');

      const timestamp = format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
      const result: CaptureResult = {
        uri: photo.uri,
        latitude: gpsCoords?.lat ?? null,
        longitude: gpsCoords?.lng ?? null,
        timestamp,
      };

      setPreview(photo.uri);
      setCaptureResult(result);
    } catch {
      Alert.alert('Camera Error', 'Failed to capture photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, gpsCoords]);

  const handleUse = () => {
    if (captureResult) {
      onCapture(captureResult);
      setPreview(null);
      setCaptureResult(null);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setCaptureResult(null);
    setFaceDetected(false);
    setFaceInPosition(false);
  };

  if (!permission) return null;

  // When face detector native module is unavailable (Expo Go), skip the face lock
  const faceDetectionAvailable = FD !== null;

  // Derive oval border colour from detection state (visual guide only — does NOT block capture)
  const ovalColor = faceInPosition ? '#4ADE80' : faceDetected ? '#FBBF24' : 'rgba(255,255,255,0.7)';

  // Capture is NEVER blocked by face detection — the oval is a guide, not a gate.
  // Requiring a perfect face lock causes the button to appear disabled on devices
  // where the face detector is slow, uses New Architecture, or the user's face
  // is partially outside the oval region.
  const captureDisabled = capturing;

  // Instruction text shown inside/below the oval
  const guideText = !faceDetectionAvailable
    ? 'Position your face in the oval'
    : faceInPosition
    ? 'Hold still — ready!'
    : faceDetected
    ? 'Move closer / centre your face'
    : 'Position your face in the oval';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* No permission */}
        {!permission.granted ? (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={64} color={Colors.gray400} />
            <Text style={styles.permText}>Camera access is required</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : preview ? (
          /* ── Preview mode ── */
          <View style={styles.previewContainer}>
            <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />

            <View style={styles.watermark}>
              <Text style={styles.watermarkText}>👤 {username}</Text>
              {gpsCoords && (
                <Text style={styles.watermarkText}>
                  📍 {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                </Text>
              )}
              <Text style={styles.watermarkText}>🕐 {captureResult?.timestamp}</Text>
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Ionicons name="refresh-outline" size={20} color={Colors.white} />
                <Text style={styles.btnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.useBtn} onPress={handleUse}>
                <Ionicons name="checkmark-outline" size={20} color={Colors.white} />
                <Text style={styles.btnText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── Live camera view ── */
          <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              zoom={0}
              {...(FD ? {
                onFacesDetected: handleFacesDetected,
                faceDetectorSettings: {
                  mode: FD.FaceDetectorMode.fast,
                  detectLandmarks: FD.FaceDetectorLandmarks.none,
                  runClassifications: FD.FaceDetectorClassifications.none,
                  minDetectionInterval: 200,
                  tracking: true,
                },
              } as any : {})}
            />

            {/* ── Face guide overlay ── */}
            {ovalBounds && (
              <>
                {/* Dark vignette — four rectangles around the oval */}
                {/* Top */}
                <View
                  style={[
                    styles.vignette,
                    { top: 0, left: 0, right: 0, height: ovalBounds.top },
                  ]}
                />
                {/* Bottom */}
                <View
                  style={[
                    styles.vignette,
                    {
                      top: ovalBounds.bottom,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    },
                  ]}
                />
                {/* Left */}
                <View
                  style={[
                    styles.vignette,
                    {
                      top: ovalBounds.top,
                      left: 0,
                      width: ovalBounds.left,
                      height: ovalBounds.height,
                    },
                  ]}
                />
                {/* Right */}
                <View
                  style={[
                    styles.vignette,
                    {
                      top: ovalBounds.top,
                      right: 0,
                      width: cameraLayout.width - ovalBounds.right,
                      height: ovalBounds.height,
                    },
                  ]}
                />

                {/* Oval border */}
                <View
                  style={[
                    styles.ovalGuide,
                    {
                      left: ovalBounds.left,
                      top: ovalBounds.top,
                      width: ovalBounds.width,
                      height: ovalBounds.height,
                      borderRadius: ovalBounds.width / 2,
                      borderColor: ovalColor,
                    },
                  ]}
                />

                {/* Instruction label below the oval */}
                <View
                  style={[
                    styles.guideLabelWrap,
                    { top: ovalBounds.bottom + 12, left: 0, right: 0 },
                  ]}
                >
                  {faceInPosition && (
                    <Ionicons name="checkmark-circle" size={18} color="#4ADE80" style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.guideLabel, { color: ovalColor }]}>{guideText}</Text>
                </View>
              </>
            )}

            {/* GPS status overlay */}
            <View style={styles.gpsOverlay}>
              <View
                style={[
                  styles.gpsDot,
                  gpsCoords ? styles.gpsOk : gpsLoading ? styles.gpsWaiting : styles.gpsFail,
                ]}
              />
              <Text style={styles.gpsText}>
                {gpsLoading
                  ? 'Acquiring GPS...'
                  : gpsCoords
                  ? `GPS: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}`
                  : 'GPS unavailable'}
              </Text>
            </View>

            {/* Username overlay */}
            <View style={styles.userOverlay}>
              <Ionicons name="person-circle-outline" size={16} color={Colors.white} />
              <Text style={styles.userOverlayText}>{username}</Text>
            </View>

            {/* Capture button */}
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[
                  styles.captureBtn,
                  captureDisabled && styles.captureBtnDisabled,
                  faceInPosition && styles.captureBtnReady,
                ]}
                onPress={handleCapture}
                disabled={captureDisabled}
                activeOpacity={0.8}
              >
                {capturing ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <View
                    style={[
                      styles.captureInner,
                      faceInPosition && styles.captureInnerReady,
                    ]}
                  />
                )}
              </TouchableOpacity>
              <Text style={styles.captureHint}>
                {capturing
                  ? 'Capturing…'
                  : faceInPosition
                  ? 'Tap to capture'
                  : 'Align face to unlock'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  permText: {
    fontSize: FontSize.md,
    color: Colors.gray400,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  permBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  // Dark vignette rectangles around the oval cutout area
  vignette: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  // Oval border guide
  ovalGuide: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  // Label below oval
  guideLabelWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  guideLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  gpsOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 100,
    left: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsOk: { backgroundColor: '#4ADE80' },
  gpsWaiting: { backgroundColor: '#FBBF24' },
  gpsFail: { backgroundColor: '#F87171' },
  gpsText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '500',
  },
  userOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 100,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  userOverlayText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '600',
  },
  captureRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: Spacing.sm,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.4,
  },
  captureBtnReady: {
    borderColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  captureInnerReady: {
    backgroundColor: Colors.white,
  },
  captureHint: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  // Preview
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  preview: {
    flex: 1,
  },
  watermark: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 3,
  },
  watermarkText: {
    fontSize: 12,
    color: Colors.white,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.xl,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  useBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  btnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
