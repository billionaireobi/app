import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { getOrder, getOrderItems, updateOrderStatus, downloadOrderReceipt, deleteOrder } from '../../../src/api/orders';
import { addPayment, getOrderPayments, initiateSTKPush } from '../../../src/api/payments';
import { Card } from '../../../src/components/ui/Card';
import { Badge, getOrderStatusVariant, formatOrderStatus } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../src/constants/colors';
import type { PaymentMethod } from '../../../src/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = Number(id);

  const [paymentModal, setPaymentModal] = useState(false);
  const [mpesaModal, setMpesaModal] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  });

  const { data: items } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => getOrderItems(orderId),
  });

  const { data: payments } = useQuery({
    queryKey: ['order-payments', orderId],
    queryFn: () => getOrderPayments(orderId),
  });

  const { mutate: addPay, isPending: payPending } = useMutation({
    mutationFn: addPayment,
    onSuccess: (response) => {
      Toast.show({ type: 'success', text1: 'Payment recorded!' });
      
      // Immediately update the order query with the new payment status
      if (response.order_update) {
        queryClient.setQueryData(['order', orderId], (oldData: any) => ({
          ...oldData,
          paid_status: response.order_update.paid_status,
          amount_paid: response.order_update.amount_paid,
        }));
      }
      
      queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] });
      setPaymentModal(false);
      setPayAmount('');
      setPayRef('');
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to record payment' }),
  });

  const { mutate: updateDelivery, isPending: deliveryPending } = useMutation({
    mutationFn: (status: string) => updateOrderStatus(orderId, { delivery_status: status as any }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Delivery status updated!' });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDeliveryModal(false);
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'Update failed', text2: err.message }),
  });

  const { mutate: stkPush, isPending: stkPending } = useMutation({
    mutationFn: initiateSTKPush,
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'STK Push Sent!',
        text2: `Check phone ${mpesaPhone} for M-Pesa prompt`,
      });
      setMpesaModal(false);
    },
    onError: () => Toast.show({ type: 'error', text1: 'STK Push Failed' }),
  });

  const { mutate: delOrder, isPending: deletePending } = useMutation({
    mutationFn: () => deleteOrder(orderId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Order deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.back();
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'Delete failed', text2: err.message }),
  });

  const handleAddPayment = () => {
    if (!payAmount || isNaN(Number(payAmount))) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    addPay({
      order_id: orderId,
      amount: Number(payAmount),
      payment_method: payMethod,
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: payRef,
    });
  };

  const handleSTKPush = () => {
    if (!mpesaPhone || !mpesaAmount) {
      Toast.show({ type: 'error', text1: 'Enter phone and amount' });
      return;
    }
    stkPush({ order: orderId, phone_number: mpesaPhone, amount: Number(mpesaAmount) });
  };

  const handlePrintReceipt = async () => {
    try {
      Toast.show({ type: 'info', text1: 'Loading receipt...' });
      await downloadOrderReceipt(orderId);
      Toast.show({
        type: 'success',
        text1: 'Receipt Ready',
        text2: 'Use your device print or email options',
        duration: 3000,
      });
    } catch (error) {
      console.error('Receipt download error:', error);
      Toast.show({ type: 'error', text1: 'Failed to load receipt' });
    }
  };

  if (isLoading || !order) {
    return <LoadingSpinner fullScreen message="Loading order..." />;
  }

  const balance = parseFloat(order.total_amount) - parseFloat(order.amount_paid);

  const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
    { label: 'Cash', value: 'cash' },
    { label: 'M-Pesa', value: 'mpesa' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePrintReceipt} style={styles.backBtn}>
            <Ionicons name="print" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeliveryModal(true)} style={styles.backBtn}>
            <Ionicons name="bicycle-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteConfirmModal(true)} style={styles.backBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Row */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusBlock}>
              <Text style={styles.statusLabel}>Payment</Text>
              <Badge
                label={formatOrderStatus(order.paid_status)}
                variant={getOrderStatusVariant(order.paid_status)}
                dot
              />
            </View>
            <View style={styles.statusBlock}>
              <Text style={styles.statusLabel}>Delivery</Text>
              <Badge
                label={formatOrderStatus(order.delivery_status)}
                variant={getOrderStatusVariant(order.delivery_status)}
                dot
              />
            </View>
            <View style={styles.statusBlock}>
              <Text style={styles.statusLabel}>Store</Text>
              <Text style={styles.storeText}>{order.store.toUpperCase()}</Text>
            </View>
          </View>
        </Card>

        {/* Customer Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <InfoRow icon="person-outline" label="Name" value={order.customer_name ?? '-'} />
          <InfoRow icon="call-outline" label="Phone" value={order.phone} />
          <InfoRow icon="location-outline" label="Address" value={order.address} />
          <InfoRow icon="pricetag-outline" label="Category" value={order.customer_category} />
          <InfoRow
            icon="calendar-outline"
            label="Order Date"
            value={format(new Date(order.order_date), 'dd MMM yyyy')}
          />
          {order.vat_variation === 'with_vat' && (
            <InfoRow icon="receipt-outline" label="VAT" value="Included (16%)" />
          )}
        </Card>

        {/* Financial Summary */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.financialTable}>
            <FinRow label="Subtotal" value={`KSh ${parseFloat(order.total_amount).toLocaleString()}`} />
            <FinRow label="Delivery Fee" value={`KSh ${parseFloat(order.delivery_fee ?? '0').toLocaleString()}`} />
            <FinRow
              label="Amount Paid"
              value={`KSh ${parseFloat(order.amount_paid).toLocaleString()}`}
              color={Colors.success}
            />
            <View style={styles.divider} />
            <FinRow
              label="Balance Due"
              value={`KSh ${balance.toLocaleString()}`}
              color={balance > 0 ? Colors.error : Colors.success}
              bold
            />
          </View>
        </Card>

        {/* Order Items */}
        {items && items.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items ({items.length})</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.orderItemRow}>
                <View style={styles.orderItemLeft}>
                  <Text style={styles.orderItemName}>{item.product_name ?? `Product #${item.product}`}</Text>
                  <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                </View>
                <View style={styles.orderItemRight}>
                  <Text style={styles.orderItemPrice}>
                    KSh {parseFloat(item.unit_price).toLocaleString()}
                  </Text>
                  <Text style={styles.orderItemTotal}>
                    = KSh {parseFloat(item.line_total).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((pay) => (
              <View key={pay.id} style={styles.payHistRow}>
                <View>
                  <Text style={styles.payHistMethod}>
                    {pay.payment_method.toUpperCase()}
                  </Text>
                  <Text style={styles.payHistDate}>
                    {format(new Date(pay.payment_date), 'dd MMM yyyy')}
                  </Text>
                </View>
                <Text style={styles.payHistAmount}>
                  KSh {parseFloat(pay.amount).toLocaleString()}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        {balance > 0 && order.delivery_status !== 'delivered' && order.delivery_status !== 'cancelled' && (
          <View style={styles.actions}>
            <Button
              onPress={() => {
                setPayAmount(String(balance));
                setPaymentModal(true);
              }}
              label="Record Payment"
              variant="primary"
              fullWidth
              style={styles.actionBtn}
              disabled={balance <= 0 || order.paid_status === 'completed'}
            />
            <Button
              onPress={() => {
                setMpesaAmount(String(balance));
                setMpesaPhone(order.phone);
                setMpesaModal(true);
              }}
              label="M-Pesa STK Push"
              variant="secondary"
              fullWidth
              disabled={balance <= 0 || order.paid_status === 'completed'}
            />
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={paymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.modalLabel}>Amount (KSh)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
              placeholder="0.00"
            />
            <Text style={styles.modalLabel}>Payment Method</Text>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setPayMethod(m.value)}
                  style={[styles.methodBtn, payMethod === m.value && styles.methodBtnActive]}
                >
                  <Text style={[styles.methodText, payMethod === m.value && styles.methodTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Reference (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={payRef}
              onChangeText={setPayRef}
              placeholder="Reference number"
            />
            <View style={styles.modalActions}>
              <Button
                onPress={() => setPaymentModal(false)}
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                onPress={handleAddPayment}
                label="Save"
                variant="primary"
                loading={payPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery Status Modal */}
      <Modal visible={deliveryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Update Delivery Status</Text>
            <Text style={styles.modalLabel}>Current: {order.delivery_status.replace('_', ' ').toUpperCase()}</Text>
            {(['pending', 'in_transit', 'delivered', 'cancelled'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.deliveryOption,
                  order.delivery_status === s && styles.deliveryOptionActive,
                ]}
                onPress={() => updateDelivery(s)}
                disabled={deliveryPending || order.delivery_status === s}
              >
                <Ionicons
                  name={
                    s === 'pending' ? 'time-outline' :
                    s === 'in_transit' ? 'bicycle-outline' :
                    s === 'delivered' ? 'checkmark-circle-outline' :
                    'close-circle-outline'
                  }
                  size={20}
                  color={order.delivery_status === s ? Colors.white : Colors.primary}
                />
                <Text style={[
                  styles.deliveryOptionText,
                  order.delivery_status === s && styles.deliveryOptionTextActive,
                ]}>
                  {s === 'in_transit' ? 'In Transit' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
                {order.delivery_status === s && (
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                )}
              </TouchableOpacity>
            ))}
            <Button
              onPress={() => setDeliveryModal(false)}
              label="Cancel"
              variant="outline"
              fullWidth
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        </View>
      </Modal>

      {/* M-Pesa Modal */}
      <Modal visible={mpesaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>M-Pesa STK Push</Text>
            <Text style={styles.modalLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="phone-pad"
              value={mpesaPhone}
              onChangeText={setMpesaPhone}
              placeholder="e.g. 0712345678"
            />
            <Text style={styles.modalLabel}>Amount (KSh)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={mpesaAmount}
              onChangeText={setMpesaAmount}
            />
            <View style={styles.modalActions}>
              <Button
                onPress={() => setMpesaModal(false)}
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                onPress={handleSTKPush}
                label="Send Push"
                variant="primary"
                loading={stkPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.deleteWarningIcon}>
              <Ionicons name="warning" size={48} color={Colors.error} />
            </View>
            <Text style={styles.modalTitle}>Delete Order?</Text>
            <Text style={styles.deleteWarningText}>
              Are you sure you want to delete Order #{order.id}? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Button
                onPress={() => setDeleteConfirmModal(false)}
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                onPress={() => delOrder()}
                label="Delete"
                variant="primary"
                loading={deletePending}
                style={{ flex: 1, backgroundColor: Colors.error }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={Colors.primary} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function FinRow({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.finRow}>
      <Text style={[styles.finLabel, bold && styles.finBold]}>{label}</Text>
      <Text style={[styles.finValue, bold && styles.finBold, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  statusCard: { marginBottom: Spacing.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statusBlock: { alignItems: 'center', gap: 6 },
  statusLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  storeText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  infoIcon: { marginTop: 1 },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 80 },
  infoValue: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  financialTable: { gap: 6 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  finLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  finValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  finBold: { fontWeight: '700', fontSize: FontSize.md },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 4 },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  orderItemLeft: { flex: 1 },
  orderItemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  orderItemQty: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  orderItemRight: { alignItems: 'flex-end' },
  orderItemPrice: { fontSize: FontSize.xs, color: Colors.textSecondary },
  orderItemTotal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  payHistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  payHistMethod: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  payHistDate: { fontSize: FontSize.xs, color: Colors.textSecondary },
  payHistAmount: { fontSize: FontSize.md, fontWeight: '700', color: Colors.success },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: { marginBottom: 0 },
  // Modal
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
  modalInput: {
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  methodBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
  },
  methodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  methodText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  methodTextActive: { color: Colors.primary, fontWeight: '700' },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  deliveryOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deliveryOptionText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  deliveryOptionTextActive: {
    color: Colors.white,
  },
  deleteWarningIcon: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  deleteWarningText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
});
