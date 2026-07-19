import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { supabase } from '@/lib/supabase';

type Client = { id: string; full_name: string; phone: string | null };
type Treatment = { id: string; name: string; default_price: number };

type Props = {
  visible: boolean;
  date: string;
  onClose: () => void;
  onSaved: () => void;
};

const PAYMENT_OPTIONS = ['מזומן', 'אשראי', 'העברה בנקאית', 'ביט', 'פייבוקס'];

function NewAppointmentModal(props: Props) {
  const { visible, date, onClose, onSaved } = props;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [time, setTime] = useState('10:00');
  const [price, setPrice] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!visible) return;
    resetForm();
    loadData();
  }, [visible]);

  function resetForm() {
    setClientSearch('');
    setSelectedClient(null);
    setShowNewClientForm(false);
    setNewClientName('');
    setNewClientPhone('');
    setSelectedTreatment(null);
    setTime('10:00');
    setPrice('0');
    setPaidAmount('0');
    setPaymentMethod(null);
    setNotes('');
  }

  async function loadData() {
    setLoading(true);
    const [clientsResult, treatmentsResult] = await Promise.all([
      supabase.from('clients').select('id, full_name, phone').eq('is_active', true).order('full_name'),
      supabase.from('treatments').select('id, name, default_price').eq('is_active', true).order('name'),
    ]);
    setClients(clientsResult.data ?? []);
    setTreatments(treatmentsResult.data ?? []);
    setLoading(false);
  }

  const filteredClients = clientSearch.trim()
    ? clients.filter(function (c) {
        return c.full_name.includes(clientSearch.trim());
      })
    : clients;

  function selectTreatment(t: Treatment) {
    setSelectedTreatment(t);
    setPrice(String(t.default_price));
  }

  async function createInlineClient() {
    if (!newClientName.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם לקוחה');
      return;
    }
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) return;

    const insertResult = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        full_name: newClientName.trim(),
        phone: newClientPhone.trim() || null,
      })
      .select()
      .single();

    if (insertResult.error) {
      Alert.alert('שגיאה ביצירת לקוחה', insertResult.error.message);
      return;
    }

    const newClient = insertResult.data;
    setClients(function (prev) {
      return prev.concat([newClient]);
    });
    setSelectedClient(newClient);
    setShowNewClientForm(false);
    setClientSearch('');
  }

  async function checkDoubleBooking(userId: string) {
    const result = await supabase
      .from('appointments')
      .select('id, clients(full_name)')
      .eq('user_id', userId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .eq('is_active', true);

    const rows = result.data;
    if (rows && rows.length > 0) {
      const existingName = (rows[0] as any).clients?.full_name ?? 'לקוחה אחרת';
      return await new Promise(function (resolve) {
        Alert.alert(
          'קיים כבר תור בשעה זו',
          'יש כבר תור עם ' + existingName + ' בשעה ' + time + '. להמשיך בכל זאת?',
          [
            { text: 'ביטול', style: 'cancel', onPress: function () { resolve(false); } },
            { text: 'המשך', onPress: function () { resolve(true); } },
          ]
        );
      });
    }
    return true;
  }

  async function handleSave() {
    if (!selectedClient) {
      Alert.alert('שגיאה', 'יש לבחור או ליצור לקוחה');
      return;
    }
    const priceNum = parseFloat(price) || 0;
    const paidNum = parseFloat(paidAmount) || 0;
    if (paidNum > priceNum) {
      Alert.alert('שגיאה', 'הסכום ששולם לא יכול לעלות על המחיר הכולל');
      return;
    }

    setSaving(true);
    try {
      const userResult = await supabase.auth.getUser();
      const user = userResult.data.user;
      if (!user) throw new Error('לא נמצא משתמש מחובר');

      const canProceed = await checkDoubleBooking(user.id);
      if (!canProceed) {
        setSaving(false);
        return;
      }

      const apptResult = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          client_id: selectedClient.id,
          treatment_id: selectedTreatment ? selectedTreatment.id : null,
          appointment_date: date,
          appointment_time: time,
          price: priceNum,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (apptResult.error) throw apptResult.error;

      if (paidNum > 0) {
        const paymentResult = await supabase.from('payments').insert({
          appointment_id: apptResult.data.id,
          user_id: user.id,
          amount: paidNum,
          payment_method: paymentMethod,
        });
        if (paymentResult.error) throw paymentResult.error;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('שגיאה בשמירת התור', err.message ?? 'נסי שוב');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>סגירה</Text>
          </Pressable>
          <Text style={styles.title}>תור חדש</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#8FAF9D" style={{ marginTop: 20 }} />
        ) : (
          <View>
            <Text style={styles.label}>שעה</Text>
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="HH:mm" />

            <Text style={styles.label}>לקוחה</Text>
            {selectedClient ? (
              <View style={styles.selectedRow}>
                <Text style={styles.selectedText}>{selectedClient.full_name}</Text>
                <Pressable onPress={function () { setSelectedClient(null); }}>
                  <Text style={styles.remove}>שינוי</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="חיפוש לקוחה..."
                  value={clientSearch}
                  onChangeText={setClientSearch}
                />
                {filteredClients.map(function (c) {
                  return (
                    <Pressable key={c.id} style={styles.optionRow} onPress={function () { setSelectedClient(c); }}>
                      <Text style={styles.optionText}>{c.full_name}</Text>
                    </Pressable>
                  );
                })}

                {!showNewClientForm ? (
                  <Pressable style={styles.secondaryButton} onPress={function () { setShowNewClientForm(true); }}>
                    <Text style={styles.secondaryButtonText}>+ צור לקוחה חדשה</Text>
                  </Pressable>
                ) : (
                  <View style={styles.newClientBox}>
                    <TextInput
                      style={styles.input}
                      placeholder="שם מלא"
                      value={newClientName}
                      onChangeText={setNewClientName}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="טלפון (אופציונלי)"
                      keyboardType="phone-pad"
                      value={newClientPhone}
                      onChangeText={setNewClientPhone}
                    />
                    <Pressable style={styles.primaryButton} onPress={createInlineClient}>
                      <Text style={styles.primaryButtonText}>שמירת לקוחה</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.label}>סוג טיפול</Text>
            <View style={styles.chipsWrap}>
              {treatments.map(function (t) {
                const selected = selectedTreatment !== null && selectedTreatment.id === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={function () { selectTreatment(t); }}
                    style={selected ? [styles.chip, styles.chipSelected] : styles.chip}>
                    <Text style={selected ? styles.chipTextSelected : styles.chipText}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>מחיר (₪)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />

            <Text style={styles.label}>סכום ששולם (₪)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={paidAmount} onChangeText={setPaidAmount} />

            <Text style={styles.label}>אמצעי תשלום</Text>
            <View style={styles.chipsWrap}>
              {PAYMENT_OPTIONS.map(function (method) {
                const selected = paymentMethod === method;
                return (
                  <Pressable
                    key={method}
                    onPress={function () { setPaymentMethod(method); }}
                    style={selected ? [styles.chip, styles.chipSelected] : styles.chip}>
                    <Text style={selected ? styles.chipTextSelected : styles.chipText}>{method}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>הערות</Text>
            <TextInput style={[styles.input, { height: 80 }]} multiline value={notes} onChangeText={setNotes} />

            <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>שמירת תור</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, backgroundColor: '#FAF9F7', flexGrow: 1 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  close: { color: '#C0504D', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#2D2D2D' },
  label: { fontSize: 14, color: '#777777', textAlign: 'right', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, textAlign: 'right', backgroundColor: '#FFFFFF' },
  selectedRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10 },
  selectedText: { color: '#2D2D2D', fontWeight: '600' },
  remove: { color: '#8FAF9D' },
  optionRow: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  optionText: { textAlign: 'right', color: '#2D2D2D' },
  newClientBox: { gap: 8, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10 },
  chipsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#8FAF9D' },
  chipSelected: { backgroundColor: '#8FAF9D' },
  chipText: { color: '#8FAF9D' },
  chipTextSelected: { color: '#FFFFFF' },
  primaryButton: { backgroundColor: '#8FAF9D', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  secondaryButton: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#8FAF9D', alignItems: 'center' },
  secondaryButtonText: { color: '#8FAF9D', fontWeight: '600' },
});

export default NewAppointmentModal;