import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import type { DashboardStats } from '../types';

interface DashboardStatsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const DashboardStatsComponent: React.FC<DashboardStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load dashboard data</Text>
      </View>
    );
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `Ksh ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const PercentageChange: React.FC<{ value: number }> = ({ value }) => (
    <Text style={[styles.percentageText, { color: value >= 0 ? '#10b981' : '#ef4444' }]}>
      {formatPercentage(value)}
    </Text>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Customer Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Metrics</Text>
        <View style={styles.metricsGrid}>
          <StatCard
            icon="people"
            label="Total Customers"
            value={stats.total_customers.toString()}
            subtitle={`${stats.customers_this_month} this month`}
          />
          <StatCard
            icon="trending-up"
            label="Growth"
            value={formatPercentage(stats.customer_percentage_change)}
            valueColor={stats.customer_percentage_change >= 0 ? '#10b981' : '#ef4444'}
          />
        </View>
      </View>

      {/* Revenue Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Metrics</Text>
        <View style={styles.metricsGrid}>
          <StatCard
            icon="attach-money"
            label="Total Revenue"
            value={formatCurrency(stats.total_revenue)}
            subtitle="All time"
          />
          <StatCard
            icon="calendar-today"
            label="This Month"
            value={formatCurrency(stats.revenue_this_month)}
            subtitle={`${formatPercentage(stats.revenue_percentage_change)}`}
          />
          <StatCard
            icon="schedule"
            label="Pending"
            value={formatCurrency(stats.pending_revenue)}
            subtitle="Awaiting payment"
          />
        </View>
      </View>

      {/* Order Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Metrics</Text>
        <View style={styles.metricsGrid}>
          <StatCard
            icon="receipt"
            label="Total Orders"
            value={stats.total_orders.toString()}
          />
          <StatCard
            icon="today"
            label="Today"
            value={stats.orders_today.toString()}
            subtitle={`${formatPercentage(stats.orders_percentage_change)}`}
          />
          <StatCard
            icon="check-circle"
            label="Completed"
            value={stats.completed_orders.toString()}
          />
          <StatCard
            icon="pending-actions"
            label="Pending"
            value={stats.pending_orders.toString()}
          />
        </View>
      </View>

      {/* Deals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deals (Completed Orders)</Text>
        <View style={styles.metricsGrid}>
          <StatCard
            icon="local-offer"
            label="Total Deals"
            value={stats.total_deals.toString()}
          />
          <StatCard
            icon="trending-up"
            label="Growth"
            value={formatPercentage(stats.deals_percentage_change)}
            valueColor={stats.deals_percentage_change >= 0 ? '#10b981' : '#ef4444'}
          />
        </View>
      </View>

      {/* Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory</Text>
        <View style={styles.metricsGrid}>
          <StatCard
            icon="inventory"
            label="Total Products"
            value={stats.total_products.toString()}
          />
          <StatCard
            icon="warning"
            label="Low Stock Alerts"
            value={stats.low_stock_alerts.toString()}
            valueColor={stats.low_stock_alerts > 0 ? '#f59e0b' : '#10b981'}
          />
        </View>
      </View>

      {/* Top Products */}
      {stats.top_products && stats.top_products.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Products</Text>
          {stats.top_products.map((product, index) => (
            <View key={index} style={styles.productItem}>
              <Text style={styles.productName}>{product.product__name}</Text>
              <View style={styles.productStats}>
                <Text style={styles.productQty}>{product.total_units} units</Text>
                <Text style={styles.productPercent}>{product.percent.toFixed(1)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(product.percent, 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Orders */}
      {stats.recent_orders && stats.recent_orders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {stats.recent_orders.map((order) => (
            <View key={order.id} style={styles.orderItem}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderCustomer}>
                  {order.customer?.first_name} {order.customer?.last_name}
                </Text>
                <Text style={styles.orderAmount}>
                  {formatCurrency(order.total_amount)}
                </Text>
              </View>
              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>
                  {new Date(order.order_date).toLocaleDateString()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    order.paid_status === 'completed'
                      ? styles.statusCompleted
                      : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>{order.paid_status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtitle, valueColor }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <MaterialIcons name={icon as any} size={20} color={Colors.primary} />
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
    <Text style={[styles.cardValue, valueColor && { color: valueColor }]}>{value}</Text>
    {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  productItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productQty: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  productPercent: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  orderItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
});
