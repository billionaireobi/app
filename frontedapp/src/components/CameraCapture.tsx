/**
 * CameraCapture — matches behaviour of static/js/camera_capture.js
 * Forces rear camera, adds GPS + timestamp watermark on the captured image.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/colors';

export interface CaptureResult {
  uri: string;         // local file URI
  base64?: string;     // base64 string (optional, heavy)
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

  // Request GPS when modal opens
  React.useEffect(() => {
    if (!visible) {
      setPreview(null);
      setCaptureResult(null);
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
    } catch (err) {
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
  };

  // Camera permission not determined
  if (!permission) {
    return null;
  }

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
          /* Preview Mode */
          <View style={styles.previewContainer}>
            <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />

            {/* Watermark overlay (decorative — shows GPS + timestamp) */}
            <View style={styles.watermark}>
              <Text style={styles.watermarkText}>👤 {username}</Text>
              {gpsCoords && (
                <Text style={styles.watermarkText}>
                  📍 {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                </Text>
              )}
              <Text style={styles.watermarkText}>
                🕐 {captureResult?.timestamp}
              </Text>
            </View>

            {/* Action buttons */}
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
          /* Camera View */
          <View style={styles.cameraContainer}>
            {/* CameraView no longer has children — avoids the "does not support children" warning */}
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              zoom={0}
            />

            {/* GPS status overlay — absolutely positioned over the camera */}
            <View style={styles.gpsOverlay}>
              <View style={[styles.gpsDot, gpsCoords ? styles.gpsOk : gpsLoading ? styles.gpsWaiting : styles.gpsFail]} />
              <Text style={styles.gpsText}>
                {gpsLoading
                  ? 'Acquiring GPS...'
                  : gpsCoords
                  ? `GPS: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}`
                  : 'GPS unavailable'}
              </Text>
            </View>

            {/* Username overlay — absolutely positioned over the camera */}
            <View style={styles.userOverlay}>
              <Ionicons name="person-circle-outline" size={16} color={Colors.white} />
              <Text style={styles.userOverlayText}>{username}</Text>
            </View>

            {/* Capture button */}
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={capturing}
              >
                {capturing ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>
              <Text style={styles.captureHint}>
                {gpsLoading ? 'Waiting for GPS...' : 'Tap to capture'}
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
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
