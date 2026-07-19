// src/app/explore.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import SetPinModal from '@/components/set-pin-modal';
import ClinicSettingsModal from '@/components/clinic-settings-modal';

type Treatment = {
  id: string;
  name: string;
  default_price: number;
};

export default function SettingsScreen() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showClinicModal, setShowClinicModal] = useState(false);

  useEffect(function () {
    loadTreatments();
  }, []);

  async function loadTreatments() {
    setLoading(true);
    const result = await supabase
      .from('treatments')
      .select('id, name, default_price')
      .eq('is_active', true)
      .order('name');
    setTreatments(result.data ?? []);
    setLoading(false);
  }

  async function addTreatment() {
    if (!newName.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם טיפול');
      return;
    }
    const priceNum = parseFloat(newPrice) || 0;
    if (priceNum < 0) {
      Alert.alert('שגיאה', 'מחיר לא יכול להיות שלילי');
      return;
    }

    setSaving(true);
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      setSaving(false);
      return;
    }

    const insertResult = await supabase
      .from('treatments')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        default_price: priceNum,
      })
      .select()
      .single();

    setSaving(false);

    if (insertResult.error) {
      Alert.alert('שגיאה בהוספת טיפול', insertResult.error.message);
      return;
    }

    setTreatments(function (prev) {
      return prev.concat([insertResult.data]).sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    });
    setNewName('');
    setNewPrice('');
  }

  function confirmDelete(treatment: Treatment) {
    Alert.alert(
      'מחיקת טיפול',
      'למחוק את "' + treatment.name + '"? הטיפול יוסתר, אך היסטוריית תורים קיימת תישמר.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחיקה', style: 'destructive', onPress: function () { deleteTreatment(treatment.id); } },
      ]
    );
  }

  async function deleteTreatment(id: string) {
    const result = await supabase.from('treatments').update({ is_active: false }).eq('id', id);
    if (result.error) {
      Alert.alert('שגיאה', result.error.message);
      return;
    }
    setTreatments(function (prev) {
      return prev.filter(function (t) {
        return t.id !== id;
      });
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>הגדרות</Text>

      <Pressable style={styles.secondaryButton} onPress={function () { setShowClinicModal(true); }}>
        <Text style={styles.secondaryButtonText}>הגדרות קליניקה (שם, ימי עבודה, תשלום, תזכורות)</Text>
      </Pressable>

      <Pressable style={[styles.secondaryButton, { marginTop: 8 }]} onPress={function () { setShowPinModal(true); }}>
        <Text style={styles.secondaryButtonText}>הגדרת קוד נעילה</Text>
      </Pressable>

      <Text style={[styles.header, { fontSize: 17, marginTop: 20 }]}>ניהול טיפולים</Text>

      {loading ? (
        <ActivityIndicator color="#8FAF9D" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={treatments}
          keyExtractor={function (item) {
            return item.id;
          }}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>עדיין אין טיפולים. הוסיפי אחד למטה.</Text>}
          renderItem={function ({ item }) {
            return (
              <View style={styles.row}>
                <Pressable onPress={function () { confirmDelete(item); }}>
                  <Text style={styles.delete}>מחיקה</Text>
                </Pressable>
                <Text style={styles.rowText}>
                  {item.name} · ₪{item.default_price}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View style={styles.addBox}>
        <Text style={styles.subHeader}>הוספת טיפול חדש</Text>
        <TextInput
          style={styles.input}
          placeholder="שם טיפול"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="מחיר ברירת מחדל"
          keyboardType="numeric"
          value={newPrice}
          onChangeText={setNewPrice}
        />
        <Pressable style={styles.addButton} onPress={addTreatment} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>+ הוספת טיפול</Text>
          )}
        </Pressable>
      </View>

      <SetPinModal visible={showPinModal} onClose={function () { setShowPinModal(false); }} />
      <ClinicSettingsModal visible={showClinicModal} onClose={function () { setShowClinicModal(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7', padding: 16 },
  header: { fontSize: 20, fontWeight: '700', color: '#2D2D2D', textAlign: 'right', marginBottom: 12 },
  subHeader: { fontSize: 15, fontWeight: '600', color: '#2D2D2D', textAlign: 'right', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#777777', marginTop: 20 },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
  },
  rowText: { color: '#2D2D2D', fontWeight: '600' },
  delete: { color: '#C0504D' },
  addBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    textAlign: 'right',
    backgroundColor: '#FAF9F7',
  },
  addButton: {
    backgroundColor: '#8FAF9D',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8FAF9D',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#8FAF9D', fontWeight: '600' },
});