// src/app/onboarding.tsx
import { useState } from 'react';
import {
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

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const PAYMENT_OPTIONS = ['מזומן', 'אשראי', 'העברה בנקאית', 'ביט', 'פייבוקס'];

type Treatment = { name: string; price: string };

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // שלב 1: פרטי קליניקה
  const [clinicName, setClinicName] = useState('');

  // שלב 2: טיפולים
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [newTreatmentName, setNewTreatmentName] = useState('');
  const [newTreatmentPrice, setNewTreatmentPrice] = useState('');

  // שלב 3: אמצעי תשלום
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  // שלב 4: ימי פעילות ושעות
  const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');

  function addTreatment() {
    if (!newTreatmentName.trim()) return;
    setTreatments((prev) => [
      ...prev,
      { name: newTreatmentName.trim(), price: newTreatmentPrice || '0' },
    ]);
    setNewTreatmentName('');
    setNewTreatmentPrice('');
  }

  function removeTreatment(index: number) {
    setTreatments((prev) => prev.filter((_, i) => i !== index));
  }

  function togglePaymentMethod(method: string) {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  }

  function toggleDay(dayIndex: number) {
    setWorkingDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('לא נמצא משתמש מחובר');

      // עדכון הגדרות הקליניקה
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          clinic_name: clinicName || null,
          accepted_payment_methods: paymentMethods,
          working_days: workingDays,
          working_hours_start: startTime,
          working_hours_end: endTime,
          onboarding_completed: true,
        })
        .eq('user_id', user.id);

      if (settingsError) throw settingsError;

      // הוספת הטיפולים שהוגדרו
      if (treatments.length > 0) {
        const { error: treatmentsError } = await supabase.from('treatments').insert(
          treatments.map((t) => ({
            user_id: user.id,
            name: t.name,
            default_price: parseFloat(t.price) || 0,
          }))
        );
        if (treatmentsError) throw treatmentsError;
      }

      onComplete();
    } catch (err: any) {
      Alert.alert('שגיאה', err.message ?? 'משהו השתבש, נסי שוב');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>שלב {step + 1} מתוך 4</Text>

      {step === 0 && (
        <View>
          <Text style={styles.title}>פרטי הקליניקה</Text>
          <TextInput
            style={styles.input}
            placeholder="שם הקליניקה"
            value={clinicName}
            onChangeText={setClinicName}
          />
          <Text style={styles.hint}>אפשר להוסיף לוגו מאוחר יותר במסך ההגדרות</Text>
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={styles.title}>טיפולים ומחירים</Text>
          {treatments.map((t, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowText}>
                {t.name} — ₪{t.price}
              </Text>
              <Pressable onPress={() => removeTreatment(i)}>
                <Text style={styles.remove}>הסר</Text>
              </Pressable>
            </View>
          ))}
          <TextInput
            style={styles.input}
            placeholder="שם טיפול"
            value={newTreatmentName}
            onChangeText={setNewTreatmentName}
          />
          <TextInput
            style={styles.input}
            placeholder="מחיר ברירת מחדל"
            keyboardType="numeric"
            value={newTreatmentPrice}
            onChangeText={setNewTreatmentPrice}
          />
          <Pressable style={styles.secondaryButton} onPress={addTreatment}>
            <Text style={styles.secondaryButtonText}>+ הוסיפי טיפול</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.title}>אמצעי תשלום מקובלים</Text>
          <View style={styles.chipsWrap}>
            {PAYMENT_OPTIONS.map((method) => {
              const selected = paymentMethods.includes(method);
              return (
                <Pressable
                  key={method}
                  onPress={() => togglePaymentMethod(method)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                    {method}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.title}>ימי פעילות ושעות עבודה</Text>
          <View style={styles.chipsWrap}>
            {DAYS.map((day, i) => {
              const selected = workingDays.includes(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => toggleDay(i)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={selected ? styles.chipTextSelected : styles.chipText}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={styles.input}
            placeholder="שעת התחלה (HH:mm)"
            value={startTime}
            onChangeText={setStartTime}
          />
          <TextInput
            style={styles.input}
            placeholder="שעת סיום (HH:mm)"
            value={endTime}
            onChangeText={setEndTime}
          />
        </View>
      )}

      <View style={styles.nav}>
        {step > 0 && (
          <Pressable style={styles.secondaryButton} onPress={() => setStep((s) => s - 1)}>
            <Text style={styles.secondaryButtonText}>הקודם</Text>
          </Pressable>
        )}

        {step < 3 && (
          <Pressable style={styles.primaryButton} onPress={() => setStep((s) => s + 1)}>
            <Text style={styles.primaryButtonText}>הבא</Text>
          </Pressable>
        )}

        {step === 3 && (
          <Pressable style={styles.primaryButton} onPress={handleFinish} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>סיום</Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, backgroundColor: '#FAF9F7', flexGrow: 1 },
  progress: { textAlign: 'right', color: '#777777', fontSize: 14 },
  title: { fontSize: 20, fontWeight: '600', color: '#2D2D2D', textAlign: 'right', marginBottom: 12 },
  hint: { color: '#777777', fontSize: 13, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    textAlign: 'right',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  rowText: { color: '#2D2D2D' },
  remove: { color: '#C0504D' },
  chipsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8FAF9D',
  },
  chipSelected: { backgroundColor: '#8FAF9D' },
  chipText: { color: '#8FAF9D' },
  chipTextSelected: { color: '#FFFFFF' },
  nav: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 24 },
  primaryButton: {
    backgroundColor: '#8FAF9D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8FAF9D',
  },
  secondaryButtonText: { color: '#8FAF9D', fontWeight: '600' },
});