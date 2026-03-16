import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { getMessages, sendMessage } from '../../src/api/messages';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../src/api/notifications';
import { getCustomers } from '../../src/api/customers';
import { submitFeedback } from '../../src/api/feedback';
import { useAuthStore } from '../../src/store/authStore';
import { getCacheConfig } from '../../src/hooks/useCacheConfig';
import { CameraCapture, type CaptureResult } from '../../src/components/CameraCapture';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/colors';
import type { FeedbackType } from '../../src/types';

type Section = 'menu' | 'messages' | 'notifications' | 'profile' | 'feedback';

const FEEDBACK_TYPES: { label: string; value: FeedbackType }[] = [
  { label: 'Quality', value: 'quality' },
  { label: 'Pricing', value: 'pricing' },
  { label: 'Payments', value: 'payments' },
  { label: 'Delivery Time', value: 'delivery_time' },
];

// ==================== MAIN COMPONENT ====================
export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('menu');
  const [messageText, setMessageText] = useState('');

  // Feedback state
  const [feedbackCustomerSearch, setFeedbackCustomerSearch] = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [shopName, setShopName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('quality');
  const [starRating, setStarRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<CaptureResult | null>(null);
  const [feedbackErrors, setFeedbackErrors] = useState<Record<string, string>>({});

  // ==================== QUERIES ====================
  const { data: customersData } = useQuery({
    queryKey: ['customers-search', feedbackCustomerSearch],
    queryFn: () => getCustomers({ search: feedbackCustomerSearch }),
    enabled: showCustomerDrop && feedbackCustomerSearch.length > 1,
  });

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: getMessages,
    enabled: section === 'messages',
    ...getCacheConfig('messages'), // Optimized message caching with 30s staleTime (no manual refetch interval)
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    enabled: section === 'notifications',
    ...getCacheConfig('notifications'), // Optimized notification caching
  });

  // ==================== MUTATIONS ====================
  const { mutate: doSendMsg, isPending: sendPending } = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: Error) => Toast.show({ type: 'error', text1: err.message }),
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const { mutate: markSingleRead } = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const { mutate: doSubmitFeedback, isPending: feedbackPending } = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Feedback submitted!' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Reset
      setSelectedCustomer(null);
      setFeedbackCustomerSearch('');
      setShopName('');
      setContactPerson('');
      setExactLocation('');
      setFeedbackPhone('');
      setFeedbackType('quality');
      setStarRating(5);
      setFeedbackComment('');
      setCapturedPhoto(null);
      setSection('menu');
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'Submit failed', text2: err.message }),
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Unread counts
  const unreadMessages = messagesData?.results?.filter((m) => !m.is_read).length ?? 0;
  const unreadNotifications = notificationsData?.results?.filter((n) => !n.is_read).length ?? 0;

  // ==================== FEEDBACK HELPERS ====================
  const validateFeedback = () => {
    const e: Record<string, string> = {};
    if (!selectedCustomer) e.customer = 'Select a customer';
    if (!shopName.trim()) e.shopName = 'Shop name required';
    if (!contactPerson.trim()) e.contactPerson = 'Contact person required';
    if (!exactLocation.trim()) e.exactLocation = 'Location required';
    if (!feedbackPhone.trim()) e.phone = 'Phone required';
    setFeedbackErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitFeedback = () => {
    if (!validateFeedback()) return;
    doSubmitFeedback({
      customer_id: selectedCustomer!.id,
      shop_name: shopName.trim(),
      contact_person: contactPerson.trim(),
      exact_location: exactLocation.trim(),
      phone_number: feedbackPhone.trim(),
      feedback_type: feedbackType,
      rating: starRating,
      comment: feedbackComment.trim(),
      photo_uri: capturedPhoto?.uri,
      latitude: capturedPhoto?.latitude ?? undefined,
      longitude: capturedPhoto?.longitude ?? undefined,
    });
  };

  // ==================== MENU ====================
  if (section === 'menu') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.userCard}>
            <View style={styles.userRow}>
              <View style={[styles.userAvatar, user?.is_admin && { backgroundColor: Colors.primaryDark }]}>
                <Text style={styles.userAvatarText}>
                  {(user?.user?.first_name?.charAt(0) ?? user?.user?.username?.charAt(0) ?? 'U').toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.user?.first_name} {user?.user?.last_name}
                </Text>
                <View style={styles.userRoleRow}>
                  <Ionicons
                    name={user?.is_admin ? 'shield-checkmark' : 'briefcase-outline'}
                    size={13}
                    color={user?.is_admin ? Colors.gold : Colors.primary}
                  />
                  <Text style={[styles.userRole, user?.is_admin && { color: Colors.primary }]}>
                    {user?.is_admin ? 'Administrator' : 'Salesperson'}
                  </Text>
                </View>
                {user?.department && (
                  <Text style={styles.userDept}>{user.department}</Text>
                )}
                <Text style={styles.userEmail}>{user?.user?.email}</Text>
              </View>
            </View>
          </Card>

          {[
            { icon: 'chatbubbles-outline', label: 'Internal Messages', section: 'messages' as Section, count: unreadMessages || null, color: Colors.primary },
            { icon: 'notifications-outline', label: 'Notifications', section: 'notifications' as Section, count: unreadNotifications || null, color: Colors.warning },
            { icon: 'star-outline', label: 'Customer Feedback', section: 'feedback' as Section, count: null, color: Colors.secondary },
            { icon: 'person-outline', label: 'My Profile', section: 'profile' as Section, count: null, color: Colors.gray600 },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => setSection(item.section)}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuRight}>
                {item.count ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.count}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.errorSurface }]}>
              <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            </View>
            <Text style={[styles.menuLabel, { color: Colors.error }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.error} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== MESSAGES ====================
  if (section === 'messages') {
    const messages = messagesData?.results ?? [];
    return (
      <SafeAreaView style={styles.safe}>
        <SectionHeader title="Internal Messages" onBack={() => setSection('menu')} />
        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.content, messages.length === 0 && { flex: 1 }]}
          inverted={messages.length > 0}
          ListEmptyComponent={
            msgsLoading ? (
              <LoadingSpinner message="Loading messages..." />
            ) : (
              <EmptyState icon="chatbubbles-outline" title="No Messages" description="Send a broadcast message below." />
            )
          }
          renderItem={({ item }) => (
            <View style={[
              styles.msgBubble,
              item.sender_name === user?.user?.username ? styles.msgBubbleOut : styles.msgBubbleIn,
            ]}>
              {item.sender_name !== user?.user?.username && (
                <Text style={styles.msgSender}>{item.sender_name}</Text>
              )}
              <Text style={item.sender_name === user?.user?.username ? styles.msgTextOut : styles.msgText}>
                {item.message}
              </Text>
              <Text style={styles.msgTime}>{format(new Date(item.created_at), 'HH:mm')}</Text>
            </View>
          )}
        />
        <View style={styles.msgInputRow}>
          <TextInput
            style={styles.msgInput}
            placeholder="Broadcast message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
            onPress={() => { if (messageText.trim()) doSendMsg({ message: messageText.trim() }); }}
            disabled={!messageText.trim() || sendPending}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== NOTIFICATIONS ====================
  if (section === 'notifications') {
    const notifications = notificationsData?.results ?? [];
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.sectionHeaderRow}>
          <TouchableOpacity onPress={() => setSection('menu')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={() => markAllRead()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.content, notifications.length === 0 && { flex: 1 }]}
          ListEmptyComponent={
            <EmptyState icon="notifications-outline" title="No Notifications" description="You're all caught up!" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={item.is_read ? 1 : 0.7}
              onPress={() => { if (!item.is_read) markSingleRead(item.id); }}
            >
              <Card style={[styles.notifCard, !item.is_read ? styles.notifUnread : undefined]}>
                <View style={styles.notifRow}>
                  <View style={[styles.notifIcon, { backgroundColor: getNotifColor(item.event_type) + '20' }]}>
                    <Ionicons name={getNotifIcon(item.event_type) as any} size={18} color={getNotifColor(item.event_type)} />
                  </View>
                  <View style={styles.notifBody}>
                    <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]}>{item.title}</Text>
                    <Text style={[styles.notifMsg, !item.is_read && styles.notifMsgUnread]}>{item.body}</Text>
                    <Text style={styles.notifTime}>{format(new Date(item.created_at), 'dd MMM, HH:mm')}</Text>
                  </View>
                  {!item.is_read && <View style={styles.unreadDot} />}
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // ==================== FEEDBACK ====================
  if (section === 'feedback') {
    return (
      <SafeAreaView style={styles.safe}>
        <SectionHeader title="Customer Feedback" onBack={() => setSection('menu')} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <TextInput
              style={[styles.searchInput, feedbackErrors.customer ? styles.inputError : undefined]}
              placeholder="Search customer..."
              value={selectedCustomer ? selectedCustomer.name : feedbackCustomerSearch}
              onChangeText={(v) => {
                setFeedbackCustomerSearch(v);
                setSelectedCustomer(null);
                setShowCustomerDrop(true);
              }}
            />
            {feedbackErrors.customer ? <Text style={styles.errorText}>{feedbackErrors.customer}</Text> : null}
            {showCustomerDrop && !selectedCustomer && customersData?.results && customersData.results.length > 0 && (
              <View style={styles.dropdown}>
                {customersData.results.slice(0, 5).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.dropItem}
                    onPress={() => {
                      setSelectedCustomer({ id: c.id, name: `${c.first_name} ${c.last_name}` });
                      setFeedbackCustomerSearch(`${c.first_name} ${c.last_name}`);
                      setShowCustomerDrop(false);
                      // Auto-fill fields from customer data
                      setShopName(c.first_name || '');
                      setContactPerson('');
                      setFeedbackPhone(c.phone_number || '');
                      setExactLocation(c.address || '');
                    }}
                  >
                    <Text style={styles.dropItemText}>{c.first_name} {c.last_name} — {c.phone_number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Visit Details</Text>
            <Input
              label="Shop Name"
              value={shopName}
              onChangeText={setShopName}
              leftIcon="storefront-outline"
              placeholder="Customer's shop name"
              error={feedbackErrors.shopName}
              required
            />
            <Input
              label="Contact Person"
              value={contactPerson}
              onChangeText={setContactPerson}
              leftIcon="person-outline"
              placeholder="Name of person met"
              error={feedbackErrors.contactPerson}
              required
            />
            <View style={{ marginBottom: Spacing.md }}>
              <Input
                label="Exact Location (GPS)"
                value={exactLocation}
                onChangeText={setExactLocation}
                leftIcon="location-outline"
                placeholder="Street / area (or tap GPS button)"
                error={feedbackErrors.exactLocation}
                required
              />
              <TouchableOpacity
                style={{
                  marginTop: Spacing.sm,
                  backgroundColor: Colors.info,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.sm,
                }}
                onPress={async () => {
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                      Toast.show({ type: 'error', text1: 'Location access denied' });
                      return;
                    }
                    
                    Toast.show({ type: 'info', text1: 'Getting location...' });
                    const location = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.High,
                    });
                    
                    const { latitude, longitude } = location.coords;
                    setExactLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                    Toast.show({ type: 'success', text1: 'GPS location captured' });
                  } catch (err) {
                    Toast.show({ type: 'error', text1: 'Failed to get location' });
                  }
                }}
              >
                <Ionicons name="navigate-circle" size={18} color={Colors.white} />
                <Text style={{ color: Colors.white, fontWeight: '600', fontSize: 13 }}>
                  Capture GPS Location
                </Text>
              </TouchableOpacity>
            </View>
            <Input
              label="Phone Number"
              value={feedbackPhone}
              onChangeText={setFeedbackPhone}
              leftIcon="call-outline"
              keyboardType="phone-pad"
              placeholder="0700000000"
              error={feedbackErrors.phone}
              required
            />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Feedback Type</Text>
            <View style={styles.pillRow}>
              {FEEDBACK_TYPES.map((ft) => (
                <TouchableOpacity
                  key={ft.value}
                  onPress={() => setFeedbackType(ft.value)}
                  style={[styles.pill, feedbackType === ft.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, feedbackType === ft.value && styles.pillTextActive]}>
                    {ft.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Star Rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setStarRating(star)}>
                  <Ionicons
                    name={star <= starRating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= starRating ? '#FFC107' : Colors.gray300}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {starRating === 1 ? 'Very Poor' : starRating === 2 ? 'Poor' : starRating === 3 ? 'Average' : starRating === 4 ? 'Good' : 'Excellent'}
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Comment (optional)</Text>
            <TextInput
              style={[styles.searchInput, { minHeight: 80 }]}
              placeholder="Additional notes..."
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              multiline
              textAlignVertical="top"
            />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Photo Evidence</Text>
            {capturedPhoto ? (
              <View style={styles.photoPreview}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                <Text style={styles.photoPreviewText}>Photo captured with GPS</Text>
                {capturedPhoto.latitude && (
                  <Text style={styles.gpsText}>
                    {capturedPhoto.latitude.toFixed(5)}, {capturedPhoto.longitude?.toFixed(5)}
                  </Text>
                )}
                <TouchableOpacity onPress={() => setCapturedPhoto(null)} style={styles.retakeBtn}>
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Button
                label="Take Photo"
                variant="outline"
                onPress={() => setCameraOpen(true)}
                fullWidth
              />
            )}
          </Card>

          <Button
            onPress={handleSubmitFeedback}
            label="Submit Feedback"
            variant="primary"
            size="lg"
            loading={feedbackPending}
            fullWidth
            style={styles.submitBtn}
          />
        </ScrollView>

        <CameraCapture
          visible={cameraOpen}
          username={user?.user?.username ?? 'user'}
          title="Capture Feedback Photo"
          onCapture={(result) => {
            setCapturedPhoto(result);
            setCameraOpen(false);
          }}
          onClose={() => setCameraOpen(false)}
        />
      </SafeAreaView>
    );
  }

  // ==================== PROFILE ====================
  return (
    <SafeAreaView style={styles.safe}>
      <SectionHeader title="My Profile" onBack={() => setSection('menu')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={[styles.userAvatar, styles.userAvatarLarge]}>
              <Text style={styles.userAvatarTextLarge}>
                {(user?.user?.first_name?.charAt(0) ?? 'U').toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userNameLarge}>
                {user?.user?.first_name} {user?.user?.last_name}
              </Text>
              <Badge label={user?.is_admin ? 'Admin' : 'Salesperson'} variant={user?.is_admin ? 'error' : 'primary'} />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <ProfileRow icon="person-outline" label="Username" value={user?.user?.username ?? '-'} />
          <ProfileRow icon="mail-outline" label="Email" value={user?.user?.email ?? '-'} />
          <ProfileRow icon="call-outline" label="Phone" value={user?.phone ?? '-'} />
          <ProfileRow icon="business-outline" label="Department" value={user?.department ?? '-'} />
          <ProfileRow icon="card-outline" label="National ID" value={user?.national_id ?? '-'} />
          <ProfileRow icon="calendar-outline" label="Join Date" value={user?.join_date ? format(new Date(user.join_date), 'dd MMM yyyy') : '-'} />
          <ProfileRow icon="person-circle-outline" label="Gender" value={user?.gender ?? '-'} />
        </Card>

        <Button onPress={handleLogout} label="Sign Out" variant="danger" fullWidth style={styles.submitBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== SUB-COMPONENTS ====================
function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

function ProfileRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function getNotifIcon(type: string): string {
  switch (type) {
    case 'feedback_new': return 'chatbox-outline';
    case 'message_new': return 'chatbubbles-outline';
    case 'order_created': return 'cart-outline';
    case 'order_updated': return 'pencil-outline';
    case 'order_deleted': return 'trash-outline';
    case 'beat_visit': return 'location-outline';
    case 'beat_plan_new': return 'calendar-outline';
    case 'stock_change': return 'layers-outline';
    case 'payment_new': return 'cash-outline';
    case 'login_new': return 'lock-closed-outline';
    case 'general': return 'notifications-outline';
    default: return 'notifications-outline';
  }
}

function getNotifColor(type: string): string {
  switch (type) {
    case 'feedback_new': return Colors.secondary;
    case 'message_new': return Colors.primary;
    case 'order_created': return Colors.info;
    case 'order_updated': return Colors.info;
    case 'order_deleted': return Colors.error;
    case 'beat_visit': return Colors.primary;
    case 'beat_plan_new': return Colors.primary;
    case 'stock_change': return Colors.warning;
    case 'payment_new': return Colors.success;
    case 'login_new': return Colors.primary;
    case 'general': return Colors.gray500;
    default: return Colors.gray500;
  }
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.lg,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  section: { marginBottom: Spacing.md },
  sectionHeaderRow: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { paddingHorizontal: Spacing.sm },
  markAllText: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },

  userCard: { marginBottom: Spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarLarge: { width: 64, height: 64, borderRadius: 32 },
  userAvatarText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
  userAvatarTextLarge: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  userNameLarge: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  userRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  userRole: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  userDept: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  userEmail: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  logoutItem: { marginTop: Spacing.md },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontSize: 11, fontWeight: '700', color: Colors.white },

  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  msgBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  msgBubbleIn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  msgBubbleOut: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  msgSender: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  msgText: { fontSize: FontSize.md, color: Colors.textPrimary },
  msgTextOut: { fontSize: FontSize.md, color: Colors.white },
  msgTime: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, alignSelf: 'flex-end' },
  msgInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    gap: Spacing.sm,
  },
  msgInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.gray400 },

  notifCard: { marginBottom: Spacing.sm },
  notifUnread: { backgroundColor: Colors.primarySurface },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  notifIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  notifTitleUnread: { fontWeight: '700' },
  notifMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xs },
  notifMsgUnread: { fontWeight: '500', color: Colors.textPrimary },
  notifTime: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4 },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.md,
  },
  profileLabel: { width: 100, fontSize: FontSize.sm, color: Colors.textSecondary },
  profileValue: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  submitBtn: { marginTop: Spacing.md },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.xs },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
  },
  pillActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySurface },
  pillText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: Colors.primary, fontWeight: '700' },
  searchInput: {
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputError: { borderColor: Colors.error },
  errorText: { fontSize: FontSize.xs, color: Colors.error, marginBottom: Spacing.xs },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
    maxHeight: 160,
    overflow: 'hidden',
  },
  dropItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  dropItemText: { fontSize: FontSize.sm, color: Colors.textPrimary },
  // Feedback
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  photoPreview: {
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.successSurface ?? Colors.gray100,
    borderRadius: BorderRadius.md,
  },
  photoPreviewText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.success },
  gpsText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  retakeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  retakeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
