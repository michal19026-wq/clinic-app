import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { getPin } from '@/lib/pin-storage';

type Props = {
  onUnlock: () => void;
  onBiometric: () => void;
  authenticating: boolean;
  hasPinSet: boolean;
};

function LockScreen(props: Props) {
  const { onUnlock, onBiometric, authenticating, hasPinSet } = props;
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  async function handleDigit(digit: string) {
    const next = input + digit;
    if (next.length > 4) return;
    setInput(next);
    setError(false);

    if (next.length === 4) {
      const storedPin = await getPin();
      if (next === storedPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(function () {
          setInput('');
        }, 500);
      }
    }
  }

  function handleBackspace() {
    setInput(input.slice(0, -1));
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>האפליקציה נעולה</Text>

      {hasPinSet ? (
        <>
          <Text style={styles.subtitle}>{error ? 'קוד שגוי, נסי שוב' : 'הזיני קוד נעילה'}</Text>
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(function (i) {
              return (
                <View key={i} style={i < input.length ? [styles.dot, styles.dotFilled] : styles.dot} />
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
        </>
      ) : (
        <Text style={styles.subtitle}>יש לאמת זהות כדי להמשיך</Text>
      )}

      <Pressable style={styles.button} onPress={onBiometric} disabled={authenticating}>
        <Text style={styles.buttonText}>
          {authenticating ? 'מאמת...' : 'פתיחה עם Face ID / טביעת אצבע'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '700', color: '#2D2D2D' },
  subtitle: { fontSize: 14, color: '#777777' },
  dotsRow: { flexDirection: 'row', gap: 12, marginVertical: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#8FAF9D' },
  dotFilled: { backgroundColor: '#8FAF9D' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' },
  key: { width: 80, height: 60, justifyContent: 'center', alignItems: 'center' },
  keyText: { fontSize: 24, color: '#2D2D2D' },
  button: {
    backgroundColor: '#8FAF9D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});

export default LockScreen;