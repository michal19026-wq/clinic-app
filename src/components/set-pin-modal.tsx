import { useState } from 'react';
import { Modal, View, Text, Pressable, Alert, StyleSheet } from 'react-native';

import { setPin, clearPin, getPin } from '@/lib/pin-storage';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function SetPinModal(props: Props) {
  const { visible, onClose } = props;
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [currentInput, setCurrentInput] = useState('');

  function reset() {
    setStep('enter');
    setFirstPin('');
    setCurrentInput('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleDigit(digit: string) {
    const next = currentInput + digit;
    if (next.length > 4) return;
    setCurrentInput(next);

    if (next.length === 4) {
      if (step === 'enter') {
        setFirstPin(next);
        setStep('confirm');
        setCurrentInput('');
      } else {
        if (next === firstPin) {
          await setPin(next);
          Alert.alert('נשמר', 'קוד הנעילה נקבע בהצלחה');
          handleClose();
        } else {
          Alert.alert('שגיאה', 'הקודים לא תואמים, נסי שוב');
          reset();
        }
      }
    }
  }

  function handleBackspace() {
    setCurrentInput(currentInput.slice(0, -1));
  }

  async function handleRemovePin() {
    Alert.alert('הסרת קוד נעילה', 'להסיר את קוד הנעילה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסרה',
        style: 'destructive',
        onPress: async function () {
          await clearPin();
          Alert.alert('הוסר', 'קוד הנעילה הוסר');
          handleClose();
        },
      },
    ]);
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={handleClose}>
              <Text style={styles.close}>סגירה</Text>
            </Pressable>
            <Text style={styles.title}>{step === 'enter' ? 'קביעת קוד נעילה' : 'אימות קוד'}</Text>
          </View>

          <Text style={styles.subtitle}>
            {step === 'enter' ? 'הזיני קוד בן 4 ספרות' : 'הזיני שוב לאימות'}
          </Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(function (i) {
              return (
                <View key={i} style={i < currentInput.length ? [styles.dot, styles.dotFilled] : styles.dot} />
              );
            })}
          </View>

          <View style={styles.keypad}>
            {digits.map(function (d, i) {
              if (d === '') return <View key={i} style={styles.key} />;
              return (
                <Pressable
                  key={i}
                  style={styles.key}
                  onPress={function () {
                    if (d === '⌫') handleBackspace();
                    else handleDigit(d);
                  }}>
                  <Text style={styles.keyText}>{d}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.removeLink} onPress={handleRemovePin}>
            <Text style={styles.removeLinkText}>הסרת קוד נעילה קיים</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FAF9F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12, alignItems: 'center' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  close: { color: '#C0504D', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  subtitle: { color: '#777777' },
  dotsRow: { flexDirection: 'row', gap: 12, marginVertical: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#8FAF9D' },
  dotFilled: { backgroundColor: '#8FAF9D' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' },
  key: { width: 80, height: 60, justifyContent: 'center', alignItems: 'center' },
  keyText: { fontSize: 24, color: '#2D2D2D' },
  removeLink: { marginTop: 8 },
  removeLinkText: { color: '#C0504D' },
});

export default SetPinModal;