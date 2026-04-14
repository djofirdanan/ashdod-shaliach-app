// ============================================================
// PROOF OF DELIVERY - אשדוד-שליח Courier App
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';
import { ProofOfDelivery as ProofType, Coordinates } from '../../types';

interface ProofOfDeliveryProps {
  visible: boolean;
  deliveryId: string;
  onSubmit: (proof: ProofType) => Promise<void>;
  onClose: () => void;
}

export const ProofOfDelivery: React.FC<ProofOfDeliveryProps> = ({
  visible,
  deliveryId,
  onSubmit,
  onClose,
}) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'photo' | 'signature' | 'qr'>('photo');

  useEffect(() => {
    if (visible) {
      // Auto-get GPS location when modal opens
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        .then((pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        })
        .catch(() => {
          // GPS unavailable – proceed without it
        });
    }
  }, [visible]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאפשר גישה למצלמה בהגדרות.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאפשר גישה לגלריה בהגדרות.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!photoUri && activeTab === 'photo') {
      Alert.alert('נדרשת תמונה', 'אנא צלם תמונה כאישור מסירה.');
      return;
    }

    const fallbackLocation: Coordinates = location ?? { latitude: 0, longitude: 0 };

    const proof: ProofType = {
      photoUri: photoUri ?? undefined,
      notes: notes.trim() || undefined,
      location: fallbackLocation,
      timestamp: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSubmit(proof);
      // Reset state
      setPhotoUri(null);
      setNotes('');
      setLocation(null);
      setActiveTab('photo');
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן להעלות את אישור המסירה. אנא נסה שנית.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timestamp = new Date().toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>אישור מסירה</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tab bar */}
          <View style={styles.tabBar}>
            {(['photo', 'signature', 'qr'] as const).map((tab) => {
              const labels = { photo: '📷 תמונה', signature: '✏️ חתימה', qr: '📱 QR' };
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {labels[tab]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Photo tab */}
          {activeTab === 'photo' && (
            <View style={styles.tabContent}>
              {photoUri ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => setPhotoUri(null)}
                  >
                    <Text style={styles.retakeText}>מחק תמונה</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>
                    צלם תמונה של הלקוח / חבילה / דלת
                  </Text>
                  <View style={styles.photoButtonsRow}>
                    <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                      <Text style={styles.photoButtonText}>📸 מצלמה</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoButton, styles.photoButtonSecondary]}
                      onPress={pickPhoto}
                    >
                      <Text style={[styles.photoButtonText, styles.photoButtonTextSecondary]}>
                        🖼️ גלריה
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Signature tab */}
          {activeTab === 'signature' && (
            <View style={styles.tabContent}>
              <View style={styles.signaturePlaceholder}>
                <Text style={styles.signatureIcon}>✏️</Text>
                <Text style={styles.signatureText}>
                  בקש מהלקוח לחתום על המסך
                </Text>
                <Text style={styles.signatureSubtext}>
                  (תמיכה בחתימה דיגיטלית בגרסה הבאה)
                </Text>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={takePhoto}
                >
                  <Text style={styles.photoButtonText}>📷 צלם חתימה</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* QR tab */}
          {activeTab === 'qr' && (
            <View style={styles.tabContent}>
              <View style={styles.signaturePlaceholder}>
                <Text style={styles.signatureIcon}>📱</Text>
                <Text style={styles.signatureText}>סרוק את קוד ה-QR של הלקוח</Text>
                <Text style={styles.signatureSubtext}>
                  (סריקת QR תתמך בגרסה הבאה)
                </Text>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={takePhoto}
                >
                  <Text style={styles.photoButtonText}>📷 צלם QR</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Auto stamps */}
          <View style={styles.stampsSection}>
            <Text style={styles.sectionLabel}>חותמות אוטומטיות</Text>
            <View style={styles.stampRow}>
              <View style={styles.stamp}>
                <Text style={styles.stampIcon}>🕐</Text>
                <View>
                  <Text style={styles.stampLabel}>זמן מסירה</Text>
                  <Text style={styles.stampValue}>{timestamp}</Text>
                </View>
              </View>
              <View style={styles.stamp}>
                <Text style={styles.stampIcon}>📍</Text>
                <View>
                  <Text style={styles.stampLabel}>מיקום GPS</Text>
                  <Text style={styles.stampValue}>
                    {location
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : 'ממתין...'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionLabel}>הערות (אופציונלי)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="הערות על המסירה..."
              placeholderTextColor={Colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Submit button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!photoUri && activeTab === 'photo') && styles.submitButtonDisabled,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || (!photoUri && activeTab === 'photo')}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>✓ אשר מסירה</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  activeTab: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.primary,
  },
  tabContent: {
    marginBottom: Spacing.base,
  },

  // Photo
  photoPlaceholder: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  photoButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  photoButtonSecondary: {
    backgroundColor: Colors.backgroundDark,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  photoButtonTextSecondary: {
    color: Colors.textPrimary,
  },
  photoPreviewContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
    marginBottom: Spacing.md,
  },
  retakeButton: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  retakeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },

  // Signature placeholder
  signaturePlaceholder: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  signatureIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  signatureText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  signatureSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  // Stamps
  stampsSection: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  stampRow: {
    gap: Spacing.sm,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  stampIcon: {
    fontSize: 24,
  },
  stampLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  stampValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Notes
  notesSection: {
    marginBottom: Spacing.base,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'right',
  },

  // Submit
  submitContainer: {
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.available,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
  },
});

export default ProofOfDelivery;
