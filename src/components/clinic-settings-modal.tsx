import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';

import { supabase } from '@/lib/supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const PAYMENT_OPTIONS = ['מזומן', 'אשראי', 'העברה בנקאית', 'ביט', 'פייבוקס'];

function ClinicSettingsModal(props: Props) {
  const { visible, onClose } = props;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clinicName, setClinicName] = useState('');
  const [workingDays, setWorkingDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderDayBefore, setReminderDayBefore] = useState(false);
  const [reminderTwoHours, setReminderTwoHours] = useState(false);

  useEffect(function () {
    if (!visible) return;
    loadSettings();
  }, [visible]);

  async function loadSettings() {
    setLoading(true);
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const result = await supabase
      .from('user_settings')
      .select('clinic_name, working_days, working_hours_start, working_hours_end, accepted_payment_methods, reminders_enabled, reminder_offsets_hours')
      .eq('user_id', user.id)
      .single();

    if (result.data) {
      setClinicName(result.data.clinic_name ?? '');
      setWorkingDays(result.data.working_days ?? []);
      setStartTime((result.data.working_hours_start ?? '09:00').slice(0, 5));
      setEndTime((result.data.working_hours_end ?? '19:00').slice(0, 5));
      setPaymentMethods(result.data.accepted_payment_methods ?? []);
      setRemindersEnabled(result.data.reminders_enabled ?? false);
      const offsets: number[] = result.data.reminder_offsets_hours ?? [];
      setReminderDayBefore(offsets.includes(24));
      setReminderTwoHours(offsets.includes(2));
    }
    setLoading(false);
  }

  function toggleDay(dayIndex: number) {
    setWorkingDays(function (prev) {
      if (prev.includes(dayIndex)) {
        return prev.filter(function (d) { return d !== dayIndex; });
      }
      return prev.concat([dayIndex]).sort();
    });
  }

  function togglePaymentMethod(method: string) {
    setPaymentMethods(function (prev) {
      if (prev.includes(method)) {
        return prev.filter(function (m) { return m !== method; });
      }
      return prev.concat([method]);
    });
  }

  async function handleSave() {
    setSaving(true);
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      setSaving(false);
      return;
    }

    const offsets: number[] = [];
    if (reminderDayBefore) offsets.push(24);
    if (reminderTwoHours) offsets.push(2);

    const result = await supabase
      .from('user_settings')
      .update({
        clinic_name: clinicName.trim() || null,
        working_days: workingDays,
        working_hours_start: startTime,
        working_hours_end: endTime,
        accepted_payment_methods: paymentMethods,
        reminders_enabled: remindersEnabled,
        reminder_offsets_hours: offsets,
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (result.error) {
      Alert.alert('שגיאה בשמירה', result.error.message);
      return;
    }

    Alert.alert('נשמר', 'ההגדרות עודכנו בהצלחה');
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
              <Text style={styles.title}>הגדרות קליניקה</Text>
            </View>

            {loading ? (
              <ActivityIndicator color="#8FAF9D" style={{ marginTop: 20 }} />
            ) : (
              <>
                <Text style={styles.label}>שם הקליניקה</Text>
                <TextInput style={styles.input} value={clinicName} onChangeText={setClinicName} />

                <Text style={styles.label}>ימי פעילות</Text>
                <View style={styles.chipsWrap}>
                  {DAYS.map(function (day, i) {
                    const selected = workingDays.includes(i);
                    return (
                      <Pressable
                        key={i}
                        onPress={function () { toggleDay(i); }}
                        style={selected ? [styles.chip, styles.chipSelected] : styles.chip}>
                        <Text style={selected ? styles.chipTextSelected : styles.chipText}>{day}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>שעת התחלה</Text>
                <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="HH:mm" />

                <Text style={styles.label}>שעת סיום</Text>
                <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="HH:mm" />

                <Text style={styles.label}>אמצעי תשלום מקובלים</Text>
                <View style={styles.chipsWrap}>
                  {PAYMENT_OPTIONS.map(function (method) {
                    const selected = paymentMethods.includes(method);
                    return (
                      <Pressable
                        key={method}
                        onPress={function () { togglePaymentMethod(method); }}
                        style={selected ? [styles.chip, styles.chipSelected] : styles.chip}>
                        <Text style={selected ? styles.chipTextSelected : styles.chipText}>{method}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>תזכורות ללקוחות</Text>
                <Pressable
                  style={styles.toggleRow}
                  onPress={function () { setRemindersEnabled(!remindersEnabled); }}>
                  <View style={remindersEnabled ? [styles.toggleBox, styles.toggleBoxOn] : styles.toggleBox} />
                  <Text style={styles.toggleLabel}>הפעלת תזכורות</Text>
                </Pressable>

                {remindersEnabled ? (
                  <>
                    <Pressable
                      style={styles.toggleRow}
                      onPress={function () { setReminderDayBefore(!reminderDayBefore); }}>
                      <View style={reminderDayBefore ? [styles.toggleBox, styles.toggleBoxOn] : styles.toggleBox} />
                      <Text style={styles.toggleLabel}>יום לפני התור</Text>
                    </Pressable>
                    <Pressable
                      style={styles.toggleRow}
                      onPress={function () { setReminderTwoHours(!reminderTwoHours); }}>
                      <View style={reminderTwoHours ? [styles.toggleBox, styles.toggleBoxOn] : styles.toggleBox} />
                      <Text style={styles.toggleLabel}>שעתיים לפני התור</Text>
                    </Pressable>
                  </>
                ) : null}

                <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>שמירה</Text>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FAF9F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  close: { color: '#C0504D', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  label: { fontSize: 14, color: '#777777', textAlign: 'right', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    textAlign: 'right',
    backgroundColor: '#FFFFFF',
  },
  chipsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#8FAF9D' },
  chipSelected: { backgroundColor: '#8FAF9D' },
  chipText: { color: '#8FAF9D' },
  chipTextSelected: { color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  toggleBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#8FAF9D' },
  toggleBoxOn: { backgroundColor: '#8FAF9D' },
  toggleLabel: { color: '#2D2D2D' },
  primaryButton: {
    backgroundColor: '#8FAF9D',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});

export default ClinicSettingsModal;