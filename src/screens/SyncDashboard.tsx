// src/screens/SyncDashboard.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { syncAttendanceLogs, startNetworkListener, getLastSyncTime, addSyncListener, SyncResult } from '../services/SyncService';
import { getAllLogs, getPendingCount, saveAttendanceLog, getAllEmployees } from '../services/DatabaseService';

export default function SyncDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState('Never');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    setEmployees(getAllEmployees());
    const stopNetwork = startNetworkListener();
    const stopSyncListener = addSyncListener((result: SyncResult) => {
      setSyncMessage(result.message);
      setLastSync(getLastSyncTime());
      loadData();
      setIsSyncing(false);
    });
    const timer = setInterval(() => setLastSync(getLastSyncTime()), 30000);
    return () => { stopNetwork(); stopSyncListener(); clearInterval(timer); };
  }, []);

  const loadData = () => {
    setLogs(getAllLogs());
    setPendingCount(getPendingCount());
    setLastSync(getLastSyncTime());
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    const result = await syncAttendanceLogs();
    setSyncMessage(result.message);
    setLastSync(getLastSyncTime());
    loadData();
    setIsSyncing(false);
  };

  const handleMarkAttendance = () => {
    if (employees.length === 0) return;
    const emp = employees[Math.floor(Math.random() * employees.length)];
    saveAttendanceLog(emp.id, emp.name);
    loadData();
    setSyncMessage(`📝 ${emp.name} checked in`);
  };

  const renderLog = ({ item }: { item: any }) => (
    <View style={styles.logRow}>
      <View style={styles.logLeft}>
        <Text style={styles.logName}>{item.employee_name}</Text>
        <Text style={styles.logTime}>{item.formatted_time}</Text>
      </View>
      <View style={[styles.badge, item.sync_status === 'pending' ? styles.badgePending : styles.badgeSynced]}>
        <Text style={[styles.badgeText, item.sync_status === 'pending' ? styles.badgePendingText : styles.badgeSyncedText]}>
          {item.sync_status === 'pending' ? '⏳ pending' : '✅ synced'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NeuralGate</Text>
        <Text style={styles.headerSub}>Sync Dashboard</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, pendingCount > 0 && styles.statCardAlert]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{logs.length}</Text>
          <Text style={styles.statLabel}>Total logs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumberSmall}>{lastSync}</Text>
          <Text style={styles.statLabel}>Last sync</Text>
        </View>
      </View>

      {syncMessage !== '' && (
        <View style={styles.msgBox}>
          <Text style={styles.msgText}>{syncMessage}</Text>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]} onPress={handleManualSync} disabled={isSyncing}>
          {isSyncing ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.syncBtnText}>⬆ Sync to AWS</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.markBtn} onPress={handleMarkAttendance}>
          <Text style={styles.markBtnText}>+ Mark Attendance</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.offlineNote}>
        <Text style={styles.offlineText}>💡 Enable airplane mode → mark attendance → turn off → watch auto-sync</Text>
      </View>

      <Text style={styles.listTitle}>Recent Attendance Logs</Text>
      {logs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No records yet</Text>
          <Text style={styles.emptySubText}>Tap "+ Mark Attendance" to add one</Text>
        </View>
      ) : (
        <FlatList data={logs} keyExtractor={item => item.id} renderItem={renderLog} style={styles.list} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A14' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  headerSub: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  statCardAlert: { backgroundColor: 'rgba(239,159,39,0.12)', borderColor: 'rgba(239,159,39,0.3)' },
  statNumber: { color: 'white', fontSize: 28, fontWeight: '700' },
  statNumberSmall: { color: 'white', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
  msgBox: { marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(83,74,183,0.2)', borderRadius: 8, padding: 10, borderWidth: 0.5, borderColor: 'rgba(83,74,183,0.4)' },
  msgText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center' },
  btnRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  syncBtn: { flex: 1, backgroundColor: '#534AB7', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  markBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  markBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
  offlineNote: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 8, padding: 10, borderWidth: 0.5, borderColor: 'rgba(46,204,113,0.2)' },
  offlineText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  listTitle: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' },
  list: { flex: 1, paddingHorizontal: 16 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  logLeft: { flex: 1 },
  logName: { color: 'white', fontSize: 14, fontWeight: '500' },
  logTime: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 0.5 },
  badgePending: { backgroundColor: 'rgba(239,159,39,0.15)', borderColor: 'rgba(239,159,39,0.4)' },
  badgeSynced: { backgroundColor: 'rgba(46,204,113,0.12)', borderColor: 'rgba(46,204,113,0.3)' },
  badgeText: { fontSize: 11, fontWeight: '500' },
  badgePendingText: { color: '#EF9F27' },
  badgeSyncedText: { color: '#2ECC71' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '500' },
  emptySubText: { color: 'rgba(255,255,255,0.25)', fontSize: 13, marginTop: 6 },
});