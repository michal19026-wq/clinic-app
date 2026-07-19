import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

import { supabase } from '@/lib/supabase';
import ClientFormModal from '@/components/client-form-modal';
import ClientDetailModal from '@/components/client-detail-modal';

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
};

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  const loadClients = useCallback(async function () {
    setLoading(true);
    const result = await supabase
      .from('clients')
      .select('id, full_name, phone, notes')
      .eq('is_active', true)
      .order('full_name');
    setClients(result.data ?? []);
    setLoading(false);
  }, []);

  useEffect(function () {
    loadClients();
  }, [loadClients]);

  const filteredClients = search.trim()
    ? clients.filter(function (c) {
        return c.full_name.includes(search.trim()) || (c.phone && c.phone.includes(search.trim()));
      })
    : clients;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>לקוחות</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="חיפוש לפי שם או טלפון..."
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator color="#8FAF9D" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={function (item) { return item.id; }}
          contentContainerStyle={{ gap: 8, paddingBottom: 80 }}
          ListEmptyComponent={<Text style={styles.empty}>אין עדיין לקוחות. הוסיפי אחת עם הכפתור הצף.</Text>}
          renderItem={function ({ item }) {
            return (
              <Pressable style={styles.row} onPress={function () { setViewingClient(item); }}>
                <Text style={styles.rowName}>{item.full_name}</Text>
                {item.phone ? <Text style={styles.rowPhone}>{item.phone}</Text> : null}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={function () { setShowAddModal(true); }}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <ClientFormModal
        visible={showAddModal}
        client={null}
        onClose={function () { setShowAddModal(false); }}
        onSaved={loadClients}
      />

      <ClientFormModal
        visible={editingClient !== null}
        client={editingClient}
        onClose={function () { setEditingClient(null); }}
        onSaved={function () {
          loadClients();
          setEditingClient(null);
        }}
      />

      <ClientDetailModal
        visible={viewingClient !== null}
        client={viewingClient}
        onClose={function () { setViewingClient(null); }}
        onEdit={function () {
          const current = viewingClient;
          setViewingClient(null);
          setEditingClient(current);
        }}
        onDeleted={function () {
          loadClients();
          setViewingClient(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7', padding: 16 },
  header: { fontSize: 20, fontWeight: '700', color: '#2D2D2D', textAlign: 'right', marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    textAlign: 'right',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  empty: { textAlign: 'center', color: '#777777', marginTop: 20 },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: { color: '#2D2D2D', fontWeight: '600', fontSize: 16 },
  rowPhone: { color: '#777777' },
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