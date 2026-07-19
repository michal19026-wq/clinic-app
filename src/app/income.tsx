import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';

import { supabase } from '@/lib/supabase';

type Period = 'day' | 'month' | 'year';

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getRange(period: Period, anchor: Date) {
  if (period === 'day') {
    const s = formatDate(anchor);
    return { start: s, end: s, label: anchor.toLocaleDateString('he-IL') };
  }
  if (period === 'month') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const label = anchor.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    return { start: formatDate(start), end: formatDate(end), label };
  }
  const start = new Date(anchor.getFullYear(), 0, 1);
  const end = new Date(anchor.getFullYear(), 11, 31);
  return { start: formatDate(start), end: formatDate(end), label: String(anchor.getFullYear()) };
}

function shiftAnchor(period: Period, anchor: Date, direction: number) {
  const next = new Date(anchor);
  if (period === 'day') next.setDate(next.getDate() + direction);
  else if (period === 'month') next.setMonth(next.getMonth() + direction);
  else next.setFullYear(next.getFullYear() + direction);
  return next;
}

export default function IncomeScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [anchor, setAnchor] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [actualIncome, setActualIncome] = useState(0);
  const [openBalance, setOpenBalance] = useState(0);
  const [methodBreakdown, setMethodBreakdown] = useState<Record<string, number>>({});

  const range = getRange(period, anchor);

  const loadData = useCallback(async function () {
    setLoading(true);

    const apptResult = await supabase
      .from('appointments')
      .select('id, price, appointment_status')
      .eq('is_active', true)
      .gte('appointment_date', range.start)
      .lte('appointment_date', range.end);

    const appointments = (apptResult.data ?? []).filter(function (a) {
      return a.appointment_status !== 'cancelled';
    });

    const totalPrice = appointments.reduce(function (sum, a) {
      return sum + Number(a.price);
    }, 0);

    const appointmentIds = appointments.map(function (a) {
      return a.id;
    });

    let totalPaid = 0;
    const breakdown: Record<string, number> = {};

    if (appointmentIds.length > 0) {
      const paymentsResult = await supabase
        .from('payments')
        .select('amount, payment_method')
        .in('appointment_id', appointmentIds);

      const payments = paymentsResult.data ?? [];
      payments.forEach(function (p) {
        const amount = Number(p.amount);
        totalPaid += amount;
        const method = p.payment_method ?? 'לא צוין';
        breakdown[method] = (breakdown[method] ?? 0) + amount;
      });
    }

    setActualIncome(totalPaid);
    setOpenBalance(totalPrice - totalPaid);
    setMethodBreakdown(breakdown);
    setLoading(false);
  }, [range.start, range.end]);

  useEffect(function () {
    loadData();
  }, [loadData]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>הכנסות</Text>

      <View style={styles.periodRow}>
        {(['day', 'month', 'year'] as Period[]).map(function (p) {
          const selected = period === p;
          const label = p === 'day' ? 'יומי' : p === 'month' ? 'חודשי' : 'שנתי';
          return (
            <Pressable
              key={p}
              onPress={function () { setPeriod(p); }}
              style={selected ? [styles.periodChip, styles.periodChipSelected] : styles.periodChip}>
              <Text style={selected ? styles.periodTextSelected : styles.periodText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={function () { setAnchor(shiftAnchor(period, anchor, -1)); }}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.rangeLabel}>{range.label}</Text>
        <Pressable onPress={function () { setAnchor(shiftAnchor(period, anchor, 1)); }}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#8FAF9D" style={{ marginTop: 24 }} />
      ) : (
        <View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>הכנסה בפועל</Text>
            <Text style={styles.summaryValueGreen}>₪{actualIncome.toLocaleString()}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>יתרה פתוחה לגבייה</Text>
            <Text style={styles.summaryValueGold}>₪{openBalance.toLocaleString()}</Text>
          </View>

          <Text style={styles.sectionTitle}>פילוח לפי אמצעי תשלום</Text>
          {Object.keys(methodBreakdown).length === 0 ? (
            <Text style={styles.empty}>אין תשלומים בתקופה זו</Text>
          ) : (
            Object.entries(methodBreakdown).map(function ([method, amount]) {
              return (
                <View key={method} style={styles.breakdownRow}>
                  <Text style={styles.breakdownAmount}>₪{amount.toLocaleString()}</Text>
                  <Text style={styles.breakdownMethod}>{method}</Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FAF9F7', flexGrow: 1 },
  header: { fontSize: 20, fontWeight: '700', color: '#2D2D2D', textAlign: 'right', marginBottom: 12 },
  periodRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12 },
  periodChip: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#8FAF9D', alignItems: 'center' },
  periodChipSelected: { backgroundColor: '#8FAF9D' },
  periodText: { color: '#8FAF9D', fontWeight: '600' },
  periodTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  navRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 16 },
  navArrow: { fontSize: 24, color: '#8FAF9D', paddingHorizontal: 12 },
  rangeLabel: { fontSize: 16, fontWeight: '600', color: '#2D2D2D' },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, alignItems: 'flex-end' },
  summaryLabel: { color: '#777777', marginBottom: 4 },
  summaryValueGreen: { fontSize: 24, fontWeight: '700', color: '#8FAF9D' },
  summaryValueGold: { fontSize: 24, fontWeight: '700', color: '#C8A96A' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', textAlign: 'right', marginTop: 12, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#777777' },
  breakdownRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  breakdownMethod: { color: '#2D2D2D' },
  breakdownAmount: { color: '#2D2D2D', fontWeight: '600' },
});