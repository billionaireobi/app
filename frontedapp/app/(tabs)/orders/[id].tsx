import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import {
  getOrder,
  getOrderItems,
  updateOrderStatus,
  downloadReceiptToDevice,
  deleteOrder,
} from '../../../src/api/orders';
import {
  addPayment,
  getOrderPayments,
  initiateSTKPush,
  checkMPesaStatus,
  initiateBuniPayment,
  checkBuniStatus,
  type AddPaymentResponse,
} from '../../../src/api/payments';
import { getCacheConfig } from '../../../src/hooks/useCacheConfig';
import { usePrefetchItemDetail } from '../../../src/hooks/usePrefetch';
import { Card } from '../../../src/components/ui/Card';
import { Badge, getOrderStatusVariant, formatOrderStatus } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../src/constants/colors';
import type { PaymentMethod, MPesaTransaction, BuniTransaction } from '../../../src/types';

// ── Poll interval: 5 s, max 18 polls = 90 s ───────────────────────────────────
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 18;

type PendingTxn = {
  type: 'mpesa' | 'buni';
  id: number;
  phone: string;
  amount: number;
};
type TxnStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout';

// ── Payment method colour map ─────────────────────────────────────────────────
function methodColor(method: PaymentMethod): string {
  switch (method) {
    case 'mpesa':         return '#4CAF50';
    case 'buni':          return '#FF8C00';
    case 'cash':          return Colors.info;
    case 'cheque':        return Colors.secondary;
    case 'bank_transfer': return Colors.primary;
    default:              return Colors.gray400;
  }
}
function methodIcon(method: PaymentMethod): string {
  switch (method) {
    case 'mpesa':         return 'phone-portrait-outline';
    case 'buni':          return 'card-outline';
    case 'cash':          return 'cash-outline';
    case 'cheque':        return 'document-text-outline';
    case 'bank_transfer': return 'business-outline';
    default:              return 'wallet-outline';
  }
}
function methodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'mpesa':         return 'M-Pesa';
    case 'buni':          return 'KCB Buni';
    case 'cash':          return 'Cash';
    case 'cheque':        return 'Cheque';
    case 'bank_transfer': return 'Bank Transfer';
    default:              return (method as string).toUpperCase();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = Number(id);

  usePrefetchItemDetail('order', orderId);

  // ── Modal visibility ───────────────────────────────────────────────────────
  const [paymentModal,     setPaymentModal]     = useState(false);
  const [mpesaModal,       setMpesaModal]       = useState(false);
  const [buniModal,        setBuniModal]        = useState(false);
  const [deliveryModal,    setDeliveryModal]    = useState(false);
  const [deleteModal,      setDeleteModal]      = useState(false);

  // ── Manual payment form ────────────────────────────────────────────────────
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef,    setPayRef]    = useState('');

  // ── STK Push inputs ────────────────────────────────────────────────────────
  const [mpesaPhone,  setMpesaPhone]  = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [buniPhone,   setBuniPhone]   = useState('');
  const [buniAmount,  setBuniAmount]  = useState('');

  // ── Polling state ──────────────────────────────────────────────────────────
  const [pendingTxn, setPendingTxn] = useState<PendingTxn | null>(null);
  const [txnStatus,  setTxnStatus]  = useState<TxnStatus>('pending');
  const [txnReceipt, setTxnReceipt] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(MAX_POLLS * POLL_INTERVAL_MS / 1000);
  const pollCountRef = useRef(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Receipt download ───────────────────────────────────────────────────────
  const [receiptLoading, setReceiptLoading] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    ...getCacheConfig('orders'),
  });

  const { data: items } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => getOrderItems(orderId),
    ...getCacheConfig('orders'),
  });

  const { data: payments } = useQuery({
    queryKey: ['order-payments', orderId],
    queryFn: () => getOrderPayments(orderId),
    ...getCacheConfig('payments'),
  });

  // ── Polling effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingTxn) return;

    pollCountRef.current = 0;
    setSecondsLeft(MAX_POLLS * POLL_INTERVAL_MS / 1000);

    const tick = setInterval(async () => {
      pollCountRef.current += 1;
      setSecondsLeft((s) => Math.max(0, s - POLL_INTERVAL_MS / 1000));

      if (pollCountRef.current > MAX_POLLS) {
        clearInterval(tick);
        setTxnStatus('timeout');
        return;
      }

      try {
        let result: MPesaTransaction | BuniTransaction;
        if (pendingTxn.type === 'mpesa') {
          result = await checkMPesaStatus(pendingTxn.id);
        } else {
          result = await checkBuniStatus(pendingTxn.id);
        }

        const s = result.status;
        if (s === 'success') {
          clearInterval(tick);
          setTxnStatus('success');
          setTxnReceipt(
            pendingTxn.type === 'mpesa'
              ? (result as MPesaTransaction).mpesa_receipt_number ?? ''
              : (result as BuniTransaction).transaction_id,
          );
          // Refresh order data
          queryClient.invalidateQueries({ queryKey: ['order', orderId] });
          queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        } else if (s === 'failed' || s === 'cancelled') {
          clearInterval(tick);
          setTxnStatus(s);
        }
        // pending → keep polling
      } catch {
        // network error — keep polling silently
      }
    }, POLL_INTERVAL_MS);

    intervalRef.current = tick;
    return () => clearInterval(tick);
  }, [pendingTxn]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: addPay, isPending: payPending } = useMutation({
    mutationFn: addPayment,
    onSuccess: (res: AddPaymentResponse) => {
      queryClient.setQueryData(['order', orderId], (old: any) => ({
        ...old,
        paid_status: res.order_update.paid_status,
        amount_paid: String(res.order_update.amount_paid),
      }));
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Toast.show({ type: 'success', text1: 'Payment recorded!' });
      setPaymentModal(false);
      setPayAmount('');
      setPayRef('');
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'Failed to record payment', text2: err.message }),
  });

  const { mutate: stkPush, isPending: stkPending } = useMutation({
    mutationFn: initiateSTKPush,
    onSuccess: (txn: MPesaTransaction) => {
      setMpesaModal(false);
      setPendingTxn({ type: 'mpesa', id: txn.id, phone: mpesaPhone, amount: Number(mpesaAmount) });
      setTxnStatus('pending');
      setTxnReceipt('');
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'STK Push failed', text2: err.message }),
  });

  const { mutate: buniPush, isPending: buniPending } = useMutation({
    mutationFn: initiateBuniPayment,
    onSuccess: (txn: BuniTransaction) => {
      setBuniModal(false);
      setPendingTxn({ type: 'buni', id: txn.id, phone: buniPhone, amount: Number(buniAmount) });
      setTxnStatus('pending');
      setTxnReceipt('');
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'Buni payment failed', text2: err.message }),
  });

  const { mutate: updateDelivery, isPending: deliveryPending } = useMutation({
    mutationFn: (s: string) => updateOrderStatus(orderId, { delivery_status: s as any }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Delivery status updated!' });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDeliveryModal(false);
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'Update failed', text2: err.message }),
  });

  const { mutate: delOrder, isPending: deletePending } = useMutation({
    mutationFn: () => deleteOrder(orderId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Order deleted' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.back();
    },
    onError: (err: Error) =>
      Toast.show({ type: 'error', text1: 'Delete failed', text2: err.message }),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddPayment = () => {
    const amt = Number(payAmount);
    if (!payAmount || isNaN(amt) || amt <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    addPay({
      order_id: orderId,
      amount: amt,
      payment_method: payMethod,
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: payRef || undefined,
    });
  };

  const handleMpesaPush = () => {
    const amt = Number(mpesaAmount);
    if (!mpesaPhone.trim() || !mpesaAmount || isNaN(amt) || amt < 1) {
      Toast.show({ type: 'error', text1: 'Enter valid phone and amount' });
      return;
    }
    stkPush({ order_id: orderId, phone_number: mpesaPhone.trim(), amount: amt });
  };

  const handleBuniPush = () => {
    const amt = Number(buniAmount);
    if (!buniPhone.trim() || !buniAmount || isNaN(amt) || amt < 1) {
      Toast.show({ type: 'error', text1: 'Enter valid phone and amount' });
      return;
    }
    buniPush({ order_id: orderId, phone_number: buniPhone.trim(), amount: amt });
  };

  const handleDownloadReceipt = async () => {
    setReceiptLoading(true);
    try {
      Toast.show({ type: 'info', text1: 'Preparing receipt…' });
      await downloadReceiptToDevice(orderId);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Download failed', text2: e?.message });
    } finally {
      setReceiptLoading(false);
    }
  };

  const closeTxnModal = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPendingTxn(null);
    setTxnStatus('pending');
    setTxnReceipt('');
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (isLoading || !order) {
    return <LoadingSpinner fullScreen message="Loading order…" />;
  }

  const displayTotal      = (() => {
    const t = parseFloat(order.total_amount || '0');
    if (t === 0 && items?.length) {
      return items.reduce((s, i) => s + parseFloat(i.line_total || '0'), 0)
           + parseFloat(order.delivery_fee || '0');
    }
    return t;
  })();
  const amountPaid   = parseFloat(order.amount_paid || '0');
  const deliveryFee  = parseFloat(order.delivery_fee || '0');
  const balance      = displayTotal - amountPaid;
  const canPay       = balance > 0 && order.paid_status !== 'completed';

  const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
    { label: 'Cash',          value: 'cash' },
    { label: 'M-Pesa',        value: 'mpesa' },
    { label: 'KCB Buni',      value: 'buni' },
    { label: 'Cheque',        value: 'cheque' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleDownloadReceipt} style={styles.iconBtn} disabled={receiptLoading}>
            <Ionicons
              name={receiptLoading ? 'hourglass-outline' : 'download-outline'}
              size={20}
              color={Colors.white}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeliveryModal(true)} style={styles.iconBtn}>
            <Ionicons name="bicycle-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteModal(true)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.errorLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Status Row ── */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusBlock}>
              <Text style={styles.statusLabel}>Payment</Text>
              <Badge label={formatOrderStatus(order.paid_status)} variant={getOrderStatusVariant(order.paid_status)} dot />
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusBlock}>
              <Text style={styles.statusLabel}>Delivery</Text>
              <Badge label={formatOrderStatus(order.delivery_status)} variant={getOrderStatusVariant(order.delivery_status)} dot />
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusBlock}>
              <Text style={styles.statusLabel}>Store</Text>
              <Text style={styles.storeChip}>{order.store.toUpperCase()}</Text>
            </View>
          </View>
        </Card>

        {/* ── Customer Info ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <InfoRow icon="person-outline"    label="Name"     value={order.customer_name ?? '-'} />
          <InfoRow icon="call-outline"      label="Phone"    value={order.phone} />
          <InfoRow icon="location-outline"  label="Address"  value={order.address} />
          <InfoRow icon="pricetag-outline"  label="Category" value={order.customer_category} />
          <InfoRow icon="calendar-outline"  label="Date"     value={format(new Date(order.order_date), 'dd MMM yyyy')} />
          {order.vat_variation === 'with_vat' && (
            <InfoRow icon="receipt-outline" label="VAT" value="Included (16%)" />
          )}
        </Card>

        {/* ── Financial Summary ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <FinRow label="Subtotal"     value={`KSh ${fmt(displayTotal)}`} />
          <FinRow label="Delivery Fee" value={`KSh ${fmt(deliveryFee)}`} />
          <FinRow label="Amount Paid"  value={`KSh ${fmt(amountPaid)}`} color={Colors.success} />
          <View style={styles.finDivider} />
          {balance > 0 ? (
            <FinRow label="Balance Due" value={`KSh ${fmt(balance)}`} color={Colors.error} bold />
          ) : (
            <View style={styles.paidBadgeRow}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.paidBadgeText}>Fully Paid</Text>
            </View>
          )}
        </Card>

        {/* ── Order Items ── */}
        {items && items.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({items.length})</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.product_name ?? `Product #${item.product}`}</Text>
                  <Text style={styles.itemQty}>× {item.quantity} @ KSh {fmt(parseFloat(item.unit_price))}</Text>
                </View>
                <Text style={styles.itemTotal}>KSh {fmt(parseFloat(item.line_total))}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ── Payment History ── */}
        {payments && payments.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((pay) => (
              <View
                key={pay.id}
                style={[styles.payCard, { borderLeftColor: methodColor(pay.payment_method) }]}
              >
                <View style={[styles.payMethodIcon, { backgroundColor: methodColor(pay.payment_method) + '18' }]}>
                  <Ionicons name={methodIcon(pay.payment_method) as any} size={17} color={methodColor(pay.payment_method)} />
                </View>
                <View style={styles.payInfo}>
                  <Text style={styles.payMethod}>{methodLabel(pay.payment_method)}</Text>
                  <Text style={styles.payDate}>
                    {format(new Date(pay.payment_date), 'dd MMM yyyy')}
                    {pay.reference_number ? ` · ${pay.reference_number}` : ''}
                  </Text>
                  {pay.recorded_by_name ? (
                    <Text style={styles.payBy}>By {pay.recorded_by_name}</Text>
                  ) : null}
                </View>
                <Text style={styles.payAmount}>KSh {fmt(parseFloat(pay.amount))}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ── Payment Action Buttons ── */}
        {canPay && (
          <View style={styles.actions}>
            <Text style={styles.actionsHint}>Balance: KSh {fmt(balance)}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { setPayAmount(String(Math.ceil(balance))); setPaymentModal(true); }}
              >
                <Ionicons name="cash-outline" size={20} color={Colors.primary} />
                <Text style={styles.actionBtnText}>Record{'\n'}Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnMpesa]}
                onPress={() => { setMpesaAmount(String(Math.ceil(balance))); setMpesaPhone(order.phone); setMpesaModal(true); }}
              >
                <Ionicons name="phone-portrait-outline" size={20} color={Colors.white} />
                <Text style={[styles.actionBtnText, { color: Colors.white }]}>M-Pesa{'\n'}STK Push</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnBuni]}
                onPress={() => { setBuniAmount(String(Math.ceil(balance))); setBuniPhone(order.phone); setBuniModal(true); }}
              >
                <Ionicons name="card-outline" size={20} color={Colors.white} />
                <Text style={[styles.actionBtnText, { color: Colors.white }]}>KCB Buni{'\n'}STK Push</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* ── Record Payment Modal ── */}
      <Modal visible={paymentModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Record Payment</Text>

            <Text style={styles.fieldLabel}>Amount (KSh)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
              placeholder="0.00"
            />

            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setPayMethod(m.value)}
                  style={[
                    styles.methodChip,
                    payMethod === m.value && { borderColor: methodColor(m.value), backgroundColor: methodColor(m.value) + '15' },
                  ]}
                >
                  <Ionicons name={methodIcon(m.value) as any} size={14} color={payMethod === m.value ? methodColor(m.value) : Colors.gray500} />
                  <Text style={[styles.methodChipText, payMethod === m.value && { color: methodColor(m.value), fontWeight: '700' }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Reference (optional)</Text>
            <TextInput
              style={styles.input}
              value={payRef}
              onChangeText={setPayRef}
              placeholder="e.g. receipt no."
            />

            <View style={styles.sheetActions}>
              <Button onPress={() => setPaymentModal(false)} label="Cancel" variant="outline" style={{ flex: 1 }} />
              <Button onPress={handleAddPayment} label="Save" variant="primary" loading={payPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── M-Pesa STK Push Modal ── */}
      <Modal visible={mpesaModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.stkHeader}>
              <View style={[styles.stkBrand, { backgroundColor: '#4CAF5018' }]}>
                <Ionicons name="phone-portrait-outline" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.sheetTitle}>M-Pesa STK Push</Text>
            </View>
            <Text style={styles.stkHint}>
              The customer will receive a prompt on their phone to enter their M-Pesa PIN.
            </Text>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={mpesaPhone}
              onChangeText={setMpesaPhone}
              placeholder="e.g. 0712345678"
            />

            <Text style={styles.fieldLabel}>Amount (KSh)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={mpesaAmount}
              onChangeText={setMpesaAmount}
            />

            <View style={styles.sheetActions}>
              <Button onPress={() => setMpesaModal(false)} label="Cancel" variant="outline" style={{ flex: 1 }} />
              <Button onPress={handleMpesaPush} label="Send Push" variant="primary" loading={stkPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Buni STK Push Modal ── */}
      <Modal visible={buniModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.stkHeader}>
              <View style={[styles.stkBrand, { backgroundColor: '#FF8C0018' }]}>
                <Ionicons name="card-outline" size={22} color="#FF8C00" />
              </View>
              <Text style={styles.sheetTitle}>KCB Buni STK Push</Text>
            </View>
            <Text style={styles.stkHint}>
              The customer will receive a KCB Buni payment prompt on their phone.
            </Text>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={buniPhone}
              onChangeText={setBuniPhone}
              placeholder="e.g. 0712345678"
            />

            <Text style={styles.fieldLabel}>Amount (KSh)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={buniAmount}
              onChangeText={setBuniAmount}
            />

            <View style={styles.sheetActions}>
              <Button onPress={() => setBuniModal(false)} label="Cancel" variant="outline" style={{ flex: 1 }} />
              <Button onPress={handleBuniPush} label="Send Push" variant="primary" loading={buniPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment Status Modal (polling) ── */}
      <Modal visible={pendingTxn !== null} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.statusSheet}>
            <View style={[
              styles.txnIconRing,
              txnStatus === 'success'  ? styles.txnRingSuccess :
              txnStatus === 'failed' || txnStatus === 'cancelled' || txnStatus === 'timeout'
                                       ? styles.txnRingError
                                       : styles.txnRingPending,
            ]}>
              {txnStatus === 'pending' ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : txnStatus === 'success' ? (
                <Ionicons name="checkmark-circle" size={52} color={Colors.success} />
              ) : (
                <Ionicons name="close-circle" size={52} color={Colors.error} />
              )}
            </View>

            <Text style={styles.txnTitle}>
              {pendingTxn?.type === 'mpesa' ? 'M-Pesa Payment' : 'KCB Buni Payment'}
            </Text>

            {txnStatus === 'pending' && (
              <>
                <Text style={styles.txnBody}>
                  Waiting for KSh {fmt(pendingTxn?.amount ?? 0)} on
                </Text>
                <Text style={styles.txnPhone}>{pendingTxn?.phone}</Text>
                <Text style={styles.txnHint}>Ask the customer to enter their PIN</Text>
                <View style={styles.countdownBar}>
                  <View style={[styles.countdownFill, { width: `${(secondsLeft / (MAX_POLLS * POLL_INTERVAL_MS / 1000)) * 100}%` as any }]} />
                </View>
                <Text style={styles.countdownText}>{secondsLeft}s remaining</Text>
              </>
            )}

            {txnStatus === 'success' && (
              <>
                <Text style={styles.txnBodySuccess}>
                  KSh {fmt(pendingTxn?.amount ?? 0)} confirmed!
                </Text>
                {txnReceipt ? (
                  <View style={styles.receiptChip}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.success} />
                    <Text style={styles.receiptText}>{txnReceipt}</Text>
                  </View>
                ) : null}
              </>
            )}

            {(txnStatus === 'failed' || txnStatus === 'cancelled') && (
              <Text style={styles.txnBodyError}>
                {txnStatus === 'cancelled' ? 'Payment was cancelled by the customer.' : 'Payment failed. Please try again.'}
              </Text>
            )}

            {txnStatus === 'timeout' && (
              <Text style={styles.txnBodyError}>
                Payment confirmation timed out. Check your M-Pesa messages to confirm.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.txnCloseBtn, txnStatus === 'success' && styles.txnCloseBtnSuccess]}
              onPress={closeTxnModal}
            >
              <Text style={styles.txnCloseBtnText}>
                {txnStatus === 'pending' ? 'Cancel' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Delivery Modal ── */}
      <Modal visible={deliveryModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Update Delivery Status</Text>
            {(['pending', 'in_transit', 'delivered', 'cancelled'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.deliveryOption, order.delivery_status === s && styles.deliveryOptionActive]}
                onPress={() => updateDelivery(s)}
                disabled={deliveryPending || order.delivery_status === s}
              >
                <Ionicons
                  name={
                    s === 'pending'     ? 'time-outline' :
                    s === 'in_transit'  ? 'bicycle-outline' :
                    s === 'delivered'   ? 'checkmark-circle-outline' :
                                         'close-circle-outline'
                  }
                  size={20}
                  color={order.delivery_status === s ? Colors.white : Colors.primary}
                />
                <Text style={[styles.deliveryOptionText, order.delivery_status === s && { color: Colors.white }]}>
                  {s === 'in_transit' ? 'In Transit' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
                {order.delivery_status === s && <Ionicons name="checkmark" size={18} color={Colors.white} />}
              </TouchableOpacity>
            ))}
            <Button onPress={() => setDeliveryModal(false)} label="Cancel" variant="outline" fullWidth style={{ marginTop: Spacing.lg }} />
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal visible={deleteModal} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={{ alignSelf: 'center', marginBottom: Spacing.md }}>
              <Ionicons name="warning" size={48} color={Colors.error} />
            </View>
            <Text style={styles.sheetTitle}>Delete Order?</Text>
            <Text style={styles.deleteText}>
              Are you sure you want to delete Order #{order.id}? This action cannot be undone.
            </Text>
            <View style={styles.sheetActions}>
              <Button onPress={() => setDeleteModal(false)} label="Cancel" variant="outline" style={{ flex: 1 }} />
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={Colors.primary} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function FinRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={styles.finRow}>
      <Text style={[styles.finLabel, bold && styles.finBold]}>{label}</Text>
      <Text style={[styles.finValue, bold && styles.finBold, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 120 },

  // Header
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  iconBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  headerRight: { flexDirection: 'row', gap: 2 },

  // Status card
  statusCard: { marginBottom: Spacing.md },
  statusRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  statusBlock:   { alignItems: 'center', gap: 6, flex: 1 },
  statusDivider: { width: 1, height: 36, backgroundColor: Colors.gray100 },
  statusLabel:   { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
  storeChip: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary,
    backgroundColor: Colors.primarySurface, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },

  // Section
  section:      { marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },

  // InfoRow
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  infoIcon:  { marginTop: 1 },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 72 },
  infoValue: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },

  // Financial
  finRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  finLabel:    { fontSize: FontSize.sm, color: Colors.textSecondary },
  finValue:    { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  finBold:     { fontWeight: '800', fontSize: FontSize.md },
  finDivider:  { height: 1, backgroundColor: Colors.gray100, marginVertical: Spacing.xs },
  paidBadgeRow:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: 5 },
  paidBadgeText:{ fontSize: FontSize.md, fontWeight: '700', color: Colors.success },

  // Items
  itemRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  itemLeft:  { flex: 1 },
  itemName:  { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  itemQty:   { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },

  // Payment history cards
  payCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingLeft: Spacing.sm,
    borderLeftWidth: 4, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    marginBottom: 2,
  },
  payMethodIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  payInfo:       { flex: 1 },
  payMethod:     { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  payDate:       { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  payBy:         { fontSize: FontSize.xs, color: Colors.textSecondary },
  payAmount:     { fontSize: FontSize.md, fontWeight: '800', color: Colors.success },

  // Action buttons
  actions:      { marginTop: Spacing.md, marginBottom: Spacing.md },
  actionsHint:  { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm, textAlign: 'center' },
  actionRow:    { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.primary,
    paddingVertical: Spacing.md, alignItems: 'center', gap: 4,
  },
  actionBtnMpesa: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  actionBtnBuni:  { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  actionBtnText:  { fontSize: 11, fontWeight: '700', color: Colors.primary, textAlign: 'center' },

  // ── Modals / Sheet ───────────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: Spacing.xxl,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.gray200, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetTitle:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  sheetActions:{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  fieldLabel:  { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    borderWidth: 1.5, borderColor: Colors.gray300, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.md, color: Colors.textPrimary,
  },

  // Method chips in payment modal
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.gray300,
    backgroundColor: Colors.white,
  },
  methodChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },

  // STK Push modal extras
  stkHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 4 },
  stkBrand:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stkHint:   { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },

  // Payment Status Modal
  statusSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingBottom: Spacing.xxl, alignItems: 'center',
  },
  txnIconRing: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  txnRingPending: { borderColor: Colors.primary, backgroundColor: Colors.primarySurface },
  txnRingSuccess: { borderColor: Colors.success, backgroundColor: Colors.successSurface },
  txnRingError:   { borderColor: Colors.error,   backgroundColor: Colors.errorSurface },
  txnTitle:       { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  txnBody:        { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  txnBodySuccess: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.success, textAlign: 'center', marginBottom: Spacing.sm },
  txnBodyError:   { fontSize: FontSize.md, color: Colors.error, textAlign: 'center', marginVertical: Spacing.sm, lineHeight: 22 },
  txnPhone:       { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginVertical: 4 },
  txnHint:        { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  countdownBar: { width: '100%', height: 5, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden', marginVertical: Spacing.sm },
  countdownFill:{ height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  countdownText:{ fontSize: FontSize.xs, color: Colors.textSecondary },
  receiptChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.successSurface, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.full, marginTop: Spacing.sm,
  },
  receiptText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.success },
  txnCloseBtn: {
    marginTop: Spacing.xl, width: '100%', backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center',
  },
  txnCloseBtnSuccess: { backgroundColor: Colors.success },
  txnCloseBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },

  // Delivery options
  deliveryOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.primary,
    marginBottom: Spacing.sm, backgroundColor: Colors.white,
  },
  deliveryOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  deliveryOptionText: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },

  // Delete modal
  deleteText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 24 },

  // errorLight used in trash icon
  errorLight: { color: Colors.error },
});
