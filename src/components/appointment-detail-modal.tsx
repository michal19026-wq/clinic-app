import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { supabase } from '@/lib/supabase';

type AppointmentDetail = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  price: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  appointment_status: 'planned' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  clients: { full_name: string } | null;
  treatments: { name: string } | null;
};

type Props = {
  visible: boolean;
  appointment: AppointmentDetail | null;
  onClose: () => void;
  onChanged: () => void;
};

const STATUS_OPTIONS: { value: AppointmentDetail['appointment_status']; label: string }[] = [
  { value: 'planned', label: 'מתוכנן' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
  { value: 'no_show', label: 'לא הגיע' },
];

const PAYMENT_METHODS = ['מזומן', 'אשראי', 'העברה בנקאית', 'ביט', 'פייבוקס'];

function AppointmentDetailModal(props: Props) {
  const { visible, appointment, onClose, onChanged } = props;
  const [saving, setSaving] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraMethod, setExtraMethod] = useState<string | null>(null);

  if (!appointment) return null;

  const isPastDate = appointment.appointment_date < new Date().toISOString().split('T')[0];

  async function updateStatus(newStatus: AppointmentDetail['appointment_status']) {
    setSaving(true);
    const result = await supabase
      .from('appointments')
      .update({ appointment_status: newStatus })
      .eq('id', appointment!.id);
    setSaving(false);

    if (result.error) {
      Alert.alert('שגיאה', result.error.message);
      return;
    }
    onChanged();
  }

  async function addPayment() {
    const amount = parseFloat(extraAmount) || 0;
    if (amount <= 0) {
      Alert.alert('שגיאה', 'יש להזין סכום תקין');
      return;
    }

    setSaving(true);
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      setSaving(false);
      return;
    }

    const result = await supabase.from('payments').insert({
      appointment_id: appointment!.id,
      user_id: user.id,
      amount: amount,
      payment_method: extraMethod,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('שגיאה בהוספת תשלום', result.error.message);
      return;
    }

    setExtraAmount('');
    setExtraMethod(null);
    onChanged();
    Alert.alert('נשמר', 'התשלום נוסף בהצלחה');
  }

  function confirmDelete() {
    Alert.alert(
      'מחיקת תור',
      appointment!.payment_status !== 'unpaid'
        ? 'לתור זה שולם סכום כלשהו. מחיקה תסתיר את התור מהרשימות הפעילות, אך היסטוריית התשלום תישמר.'
        : 'למחוק את התור?',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחיקה', style: 'destructive', onPress: deleteAppointment },
      ]
    );
  }

  async function deleteAppointment() {
    setSaving(true);
    const result = await supabase
      .from('appointments')
      .update({ is_active: false })
      .eq('id', appointment!.id);
    setSaving(false);

    if (result.error) {
      Alert.alert('שגיאה', result.error.message);
      return;
    }
    onChanged();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            <View style={styles.header}>
              <Pressable onPress={onClose}>
                <Text style={styles.close}>סגירה</Text>
              </Pressable>
              <Text style={styles.title}>{appointment.clients?.full_name ?? 'ללא לקוחה'}</Text>
            </View>

            <Text style={styles.subtitle}>
              {appointment.appointment_date.split('-').reverse().join('/')} ·{' '}
              {appointment.appointment_time.slice(0, 5)}
            </Text>
            {appointment.treatments ? (
              <Text style={styles.treatment}>{appointment.treatments.name}</Text>
            ) : null}

            {isPastDate ? (
              <Text style={styles.warning}>תור זה כבר עבר. שינוי בו עלול להשפיע על דוחות הכנסה.</Text>
            ) : null}

            <Text style={styles.label}>סטטוס תור</Text>
            <View style={styles.chipsWrap}>
              {STATUS_OPTIONS.map(function (opt) {
                const selected = appointment.appointment_status === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={function () { updateStatus(opt.value); }}
                    disabled={saving}
                    style={selected ? [styles.chip, styles.chipSelected] : styles.chip}>
                    <Text style={selected ? styles.chipTextSelected : styles.chipText}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryRow}>מחיר כולל: ₪{appointment.price}</Text>
              <Text style={styles.summaryRow}>
                סטטוס תשלום:{' '}
                {appointment.payment_status === 'paid'
                  ? 'שולם'
                  : appointment.payment_status === 'partial'
                  ? 'שולם חלקית'
                  : 'לא שולם'}
              </Text>
            </View>

            {appointment.payment_status !== 'paid' ? (
              <View style={styles.addPaymentBox}>
                <Text style={styles.label}>הוספת תשלום</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="סכום"
                  value={extraAmount}
                  onChangeText={setExtraAmount}
                />
                <View style={styles.chipsWrap}>
                  {PAYMENT_METHODS.map(function (m) {
                    const selected = extraMethod === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={function () { setExtraMethod(m); }}
                        style={selected ? [styles.chip, styles.chipSelected] : styles.chip}>
                        <Text style={selected ? styles.chipTextSelected : styles.chipText}>{m}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable style={styles.primaryButton} onPress={addPayment} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>הוספת תשלום</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {appointment.notes ? (
              <View>
                <Text style={styles.label}>הערות</Text>
                <Text style={styles.notesText}>{appointment.notes}</Text>
              </View>
            ) : null}

            <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={saving}>
              <Text style={styles.deleteButtonText}>מחיקת תור</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FAF9F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  close: { color: '#C0504D', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  subtitle: { color: '#777777', textAlign: 'right' },
  treatment: { color: '#2D2D2D', textAlign: 'right', fontWeight: '600' },
  warning: { color: '#C8A96A', textAlign: 'right', fontSize: 13, backgroundColor: '#FFF7E8', padding: 8, borderRadius: 8 },
  label: { fontSize: 14, color: '#777777', textAlign: 'right', marginTop: 8 },
  chipsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#8FAF9D' },
  chipSelected: { backgroundColor: '#8FAF9D' },
  chipText: { color: '#8FAF9D' },
  chipTextSelected: { color: '#FFFFFF' },
  summaryBox: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 4 },
  summaryRow: { textAlign: 'right', color: '#2D2D2D' },
  addPaymentBox: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 10, textAlign: 'right', backgroundColor: '#FAF9F7' },
  primaryButton: { backgroundColor: '#8FAF9D', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  notesText: { color: '#2D2D2D', textAlign: 'right', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8 },
  deleteButton: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteButtonText: { color: '#C0504D', fontWeight: '600' },
});

export default AppointmentDetailModal;