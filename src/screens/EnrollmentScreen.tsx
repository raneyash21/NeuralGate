import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { getFaceEmbedding, initFaceEmbedder } from '../services/FaceEmbedder';
import { saveEmployeeWithEmbedding } from '../services/DatabaseService';

export default function EnrollmentScreen() {
  const [name, setName] = useState('');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');

  // Initialize embedder when screen loads
  React.useEffect(() => {
    initFaceEmbedder().catch(err => console.log('Init error:', err));
  }, []);

  const handleEnroll = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    setCapturing(true);
    try {
      // Take photo
      const photo = await cameraRef.current.takePhoto({ qualityPrioritization: 'quality' });
      console.log('Photo taken:', photo.path);

      // Get embedding (mock or real)
      const embedding = await getFaceEmbedding(photo.path);
      console.log('Embedding length:', embedding?.length);

      if (!embedding || embedding.length !== 512) {
        Alert.alert('Error', 'Could not extract face. Please ensure good lighting and look straight.');
        return;
      }

      // Save to database
      const id = `EMP_${Date.now()}`;
      await saveEmployeeWithEmbedding(id, name, embedding);
      Alert.alert('Success', `${name} enrolled successfully!`);
      setName(''); // clear input

    } catch (err: any) {
      console.error('Enrollment error:', err);
      Alert.alert('Error', err.message || 'Enrollment failed');
    } finally {
      setCapturing(false);
    }
  };

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>No front camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
      />
      <View style={styles.overlay}>
        <TextInput
          style={styles.input}
          placeholder="Enter full name"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          style={[styles.btn, capturing && styles.btnDisabled]}
          onPress={handleEnroll}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.btnText}>Enroll Face</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white', fontSize: 16 },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#534AB7',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600' },
});