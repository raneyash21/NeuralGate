import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { initDatabase } from './src/services/DatabaseService';
import { initEncryption } from './src/services/EncryptionService';
import CameraScreen from './src/screens/CameraScreen';
import EnrollmentScreen from './src/screens/EnrollmentScreen';
import SyncDashboard from './src/screens/SyncDashboard';

type Tab = 'camera' | 'enroll' | 'sync';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('camera');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        initDatabase();
        await initEncryption();
        setIsReady(true);
      } catch (e) {
        setIsReady(true);
      }
    };
    initialize();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>NeuralGate</Text>
        <Text style={styles.loadingSub}>Initializing secure storage...</Text>
      </View>
    );
  }

  let content;
  if (activeTab === 'camera') content = <CameraScreen />;
  else if (activeTab === 'enroll') content = <EnrollmentScreen />;
  else content = <SyncDashboard />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A14" />
      <View style={styles.content}>{content}</View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('camera')}>
          <Text style={[styles.tabIcon, activeTab === 'camera' && styles.tabIconActive]}>📷</Text>
          <Text style={[styles.tabLabel, activeTab === 'camera' && styles.tabLabelActive]}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('enroll')}>
          <Text style={[styles.tabIcon, activeTab === 'enroll' && styles.tabIconActive]}>➕</Text>
          <Text style={[styles.tabLabel, activeTab === 'enroll' && styles.tabLabelActive]}>Enroll</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('sync')}>
          <Text style={[styles.tabIcon, activeTab === 'sync' && styles.tabIconActive]}>☁️</Text>
          <Text style={[styles.tabLabel, activeTab === 'sync' && styles.tabLabelActive]}>Sync</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A14' },
  content: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A14' },
  loadingText: { color: 'white', fontSize: 28, fontWeight: '700' },
  loadingSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F0F1E',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 24,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabIcon: { fontSize: 22, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3, fontWeight: '500' },
  tabLabelActive: { color: '#AFA9EC', fontWeight: '600' },
});