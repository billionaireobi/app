import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { createCustomer } from '../../../src/api/customers';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../src/constants/colors';
import type { CustomerCategory } from '../../../src/types';

const CATEGORIES: CustomerCategory[] = ['factory', 'distributor', 'wholesale', 'Towns', 'Retail customer'];

export default function AddCustomerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<CustomerCategory>('wholesale');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate, isPending } = useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      Toast.show({ type: 'success', text1: 'Customer added successfully!' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.replace(`/(tabs)/customers/${customer.id}` as any);
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to add customer' }),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (!address.trim()) e.address = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      default_category: category,
      sales_person: null,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Customer</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            leftIcon="person-outline"
            placeholder="John"
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            leftIcon="person-outline"
            placeholder="Doe"
            error={errors.lastName}
            required
          />
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            leftIcon="call-outline"
            keyboardType="phone-pad"
            placeholder="0700000000"
            error={errors.phone}
            required
          />
          <Input
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="john@example.com"
          />
          <Input
            label="Address / Location"
            value={address}
            onChangeText={setAddress}
            leftIcon="location-outline"
            placeholder="Nairobi, Kenya"
            error={errors.address}
            required
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Category</Text>
          <View style={styles.pillRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.pill, category === cat && styles.pillActive]}
              >
                <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.categoryHint}>
            {category === 'factory' && 'Factory pricing — lowest tier.'}
            {category === 'distributor' && 'Distributor pricing.'}
            {category === 'wholesale' && 'Wholesale pricing.'}
            {category === 'Towns' && 'Towns / offshore pricing.'}
            {category === 'Retail customer' && 'Retail pricing — highest tier.'}
          </Text>
        </Card>

        <Button
          onPress={handleSubmit}
          label="Add Customer"
          variant="primary"
          size="lg"
          loading={isPending}
          fullWidth
          style={styles.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
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
  categoryHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  submitBtn: { marginTop: Spacing.md },
});
