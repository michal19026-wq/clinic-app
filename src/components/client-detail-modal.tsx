import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';

import { supabase } from '@/lib/supabase';

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
};

type HistoryAppointment = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  price: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  appointment_status: 'planned' | 'completed' | 'cancelled' | 'no_show';
  is_active: boolean;
  treatments: { name: string } | null;
};

type Props = {
  visible: boolean;
  client: Client | null;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
};

const STATUS_LABELS: Record<HistoryAppointment['appointment_status'], string> = {
  planned: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

function ClientDetailModal(props: Props) {
  const { visible, client, onClose, onEdit, onDeleted } = props;
  const [history, setHistory] = useState<HistoryAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    if (!visible || !client) return;
    loadHistory(client.id);
  }, [visible, client]);

  async function loadHistory(clientId: string) {
    setLoading(true);
    const result = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, price, payment_status, appointment_status, is_active, treatments(name)')
      .eq('client_id', clientId)
      .order('appointment_date', { ascending: false });

    setHistory((result.data as unknown as HistoryAppointment[]) ?? []);
    setLoading(false);
  }

  function confirmDelete() {
    if (!client) return;
    Alert.alert(
      'מחיקת לקוחה',
      'למחוק את "' + client.full_name + '"? ההיסטוריה תישמר לצורכי דוחות, אך הלקוחה תוסתר מהרשימות הפעילות.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחיקה', style: 'destructive', onPress: deleteClient },
      ]
    );
  }

  async function deleteClient() {
    if (!client) return;
    const result = await supabase.from('clients').update({ is_active: false }).eq('id', client.id);
    if (result.error) {
      Alert.alert('שגיאה', result.error.message);
      return;
    }
    onDeleted();
    onClose();
  }

  if (!client) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>סגירה</Text>
            </Pressable>
            <Text style={styles.title}>{client.full_name}</Text>
          </View>

          {client.phone ? <Text style={styles.detailText}>טלפון: {client.phone}</Text> : null}
          {client.notes ? <Text style={styles.detailText}>הערות: {client.notes}</Text> : null}

          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryButton} onPress={onEdit}>
              <Text style={styles.secondaryButtonText}>עריכה</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={confirmDelete}>
              <Text style={styles.deleteButtonText}>מחיקת לקוחה</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>היסטוריית תורים</Text>

          {loading ? (
            <ActivityIndicator color="#8FAF9D" style={{ marginTop: 12 }} />
          ) : (
            <FlatList
              data={history}
              keyExtractor={function (item) { return item.id; }}
              style={{ maxHeight: 260 }}
              contentContainerStyle={{ gap: 6 }}
              ListEmptyComponent={<Text style={styles.empty}>אין עדיין תורים ללקוחה זו</Text>}
              renderItem={function ({ item }) {
                return (
                  <View style={item.is_active ? styles.historyRow : [styles.historyRow, styles.historyRowInactive]}>
                    <Text style={styles.historyDate}>
                      {item.appointment_date.split('-').reverse().join('/')} · {item.appointment_time.slice(0, 5)}
                    </Text>
                    <Text style={styles.historyDetails}>
                      {item.treatments ? item.treatments.name + ' · ' : ''}₪{item.price} · {STATUS_LABELS[item.appointment_status]}
                      {!item.is_active ? ' · נמחק' : ''}
                    </Text>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FAF9F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10, maxHeight: '85%' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  close: { color: '#C0504D', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  detailText: { color: '#2D2D2D', textAlign: 'right' },
  actionsRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  secondaryButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#8FAF9D', alignItems: 'center' },
  secondaryButtonText: { color: '#8FAF9D', fontWeight: '600' },
  deleteButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#C0504D', alignItems: 'center' },
  deleteButtonText: { color: '#C0504D', fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', textAlign: 'right', marginTop: 10 },
  empty: { textAlign: 'center', color: '#777777', marginTop: 10 },
  historyRow: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, gap: 2 },
  historyRowInactive: { opacity: 0.5 },
  historyDate: { textAlign: 'right', color: '#8FAF9D', fontWeight: '600' },
  historyDetails: { textAlign: 'right', color: '#2D2D2D', fontSize: 13 },
});

export default ClientDetailModal;