// src/app/index.tsx
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

import { supabase } from '@/lib/supabase';

type Appointment = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  price: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  appointment_status: 'planned' | 'completed' | 'cancelled' | 'no_show';
  clients: { full_name: string } | null;
  treatments: { name: string } | null;
};

const STATUS_LABELS: Record<Appointment['appointment_status'], string> = {
  planned: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

const PAYMENT_LABELS: Record<Appointment['payment_status'], string> = {
  unpaid: 'לא שולם',
  partial: 'שולם חלקית',
  paid: 'שולם',
};

function todayString() {
  return new Date().toISOString().split('T')[0];
}

export default function HomeScreen() {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMonth = useCallback(async (dateInMonth: string) => {
    setLoading(true);
    const [year, month] = dateInMonth.split('-').map(Number);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${lastDayNum}`;

    const { data, error } = await supabase
      .from('appointments')
      .select(
        'id, appointment_date, appointment_time, price, payment_status, appointment_status, clients(full_name), treatments(name)'
      )
      .eq('is_active', true)
      .gte('appointment_date', firstDay)
      .lte('appointment_date', lastDay)
      .order('appointment_time', { ascending: true });

    if (!error && data) {
      setMonthAppointments(data as unknown as Appointment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMonth(selectedDate);
  }, [loadMonth, selectedDate]);

  // בניית סימוני נקודות ליומן - לכל תאריך שיש בו תור
  const markedDates = monthAppointments.reduce<Record<string, any>>((acc, appt) => {
    acc[appt.appointment_date] = {
      marked: true,
      dotColor: '#C8A96A',
    };
    return acc;
  }, {});

  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] || {}),
    selected: true,
    selectedColor: '#8FAF9D',
  };

  const dayAppointments = monthAppointments.filter(
    (a) => a.appointment_date === selectedDate
  );

  function onDayPress(day: DateData) {
    setSelectedDate(day.dateString);
  }

  function onMonthChange(month: DateData) {
    loadMonth(month.dateString);
  }

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={onDayPress}
        onMonthChange={onMonthChange}
        markedDates={markedDates}
        firstDay={0} // שבוע מתחיל בראשון
        theme={{
          backgroundColor: '#FAF9F7',
          calendarBackground: '#FFFFFF',
          textSectionTitleColor: '#777777',
          selectedDayBackgroundColor: '#8FAF9D',
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: '#8FAF9D',
          dayTextColor: '#2D2D2D',
          dotColor: '#C8A96A',
          arrowColor: '#8FAF9D',
          monthTextColor: '#2D2D2D',
        }}
      />

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          תורים ל-{selectedDate.split('-').reverse().join('/')}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#8FAF9D" />
      ) : dayAppointments.length === 0 ? (
        <Text style={styles.empty}>אין תורים ביום זה</Text>
      ) : (
        <FlatList
          data={dayAppointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTime}>{item.appointment_time.slice(0, 5)}</Text>
                <Text style={styles.cardClient}>{item.clients?.full_name ?? 'ללא לקוחה'}</Text>
              </View>
              <Text style={styles.cardTreatment}>{item.treatments?.name ?? ''}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>₪{item.price}</Text>
                <Text style={styles.cardStatus}>
                  {STATUS_LABELS[item.appointment_status]} · {PAYMENT_LABELS[item.payment_status]}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Pressable style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  listHeader: { paddingHorizontal: 16, paddingTop: 12 },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    textAlign: 'right',
  },
  empty: { textAlign: 'center', color: '#777777', marginTop: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: { color: '#8FAF9D', fontWeight: '700', fontSize: 16 },
  cardClient: { color: '#2D2D2D', fontWeight: '600', fontSize: 16 },
  cardTreatment: { color: '#777777', textAlign: 'right' },
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardPrice: { color: '#2D2D2D', fontWeight: '600' },
  cardStatus: { color: '#777777', fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8FAF9D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
});