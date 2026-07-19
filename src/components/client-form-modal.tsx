import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';

import { supabase } from '@/lib/supabase';

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
};

type Props = {
  visible: boolean;
  client: Client | null; // null = לקוחה חדשה, אחרת עריכה
  onClose: () => void;
  onSaved: () => void;
};

function ClientFormModal(props: Props) {
  const { visible, client, onClose, onSaved } = props;
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFullName(client ? client.full_name : '');
    setPhone(client && client.phone ? client.phone : '');
    setNotes(client && client.notes ? client.notes : '');
  }, [visible, client]);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם מלא');
      return;
    }
    if (phone.trim() && !/^[0-9]{9,10}$/.test(phone.trim())) {
      Alert.alert('שגיאה', 'מספר טלפון צריך להכיל 9-10 ספרות בלבד');
      return;
    }

    setSaving(true);

    if (client) {
      const result = await supabase
        .from('clients')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        })
        .eq('id', client.id);

      setSaving(false);
      if (result.error) {
        Alert.alert('שגיאה בעדכון לקוחה', result.error.message);
        return;
      }
    } else {
      const userResult = await supabase.auth.getUser();
      const user = userResult.data.user;
      if (!user) {
        setSaving(false);
        return;
      }

      const result = await supabase.from('clients').insert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });

      setSaving(false);
      if (result.error) {
        Alert.alert('שגיאה ביצירת לקוחה', result.error.message);
        return;
      }
    }

    onSaved();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>סגירה</Text>
            </Pressable>
            <Text style={styles.title}>{client ? 'עריכת לקוחה' : 'לקוחה חדשה'}</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="שם מלא"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="טלפון (אופציונלי)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="הערות"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>שמירה</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FAF9F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  close: { color: '#C0504D', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    textAlign: 'right',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#8FAF9D',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});

export default ClientFormModal;