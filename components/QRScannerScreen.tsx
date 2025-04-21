import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, StatusBar, Alert } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import Constants from 'expo-constants';

// Get API base URL from Constants
const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/stg_online-apmt`;

const QRScannerScreen = () => {
  const [projectId, setProjectId] = useState('');
  const [validating, setValidating] = useState(false);

  const isValidProjectId = (id: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    const trimmedId = id.trim();
    if (trimmedId.length !== 24) return false;
    const hexPattern = /^[0-9a-f]{24}$/i;
    return hexPattern.test(trimmedId);
  };

  const validateProjectIdWithServer = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/patient-auth/hospital_profile/${id}`);
      const data = await response.json();
      return response.ok && data;
    } catch (error) {
      return true; // Let signup screen handle validation
    }
  };

  const handleSubmit = async () => {
    if (!projectId) {
      Alert.alert('Error', 'Please enter a project ID.');
      return;
    }

    // Extract ID from URLs or raw input
    let extractedId = projectId.trim();
    const mainPattern = /\/stg_online-apmt\/([a-f0-9]{24})\/?/i;
    const fallbackPattern = /\/([a-f0-9]{24})(?:\/|$)/i;
    const rawPattern = /([a-f0-9]{24})/i;

    const mainMatch = projectId.match(mainPattern);
    const fallbackMatch = !mainMatch ? projectId.match(fallbackPattern) : null;
    const rawMatch = !mainMatch && !fallbackMatch ? projectId.match(rawPattern) : null;

    if (mainMatch) extractedId = mainMatch[1].trim();
    else if (fallbackMatch) extractedId = fallbackMatch[1].trim();
    else if (rawMatch) extractedId = rawMatch[1].trim();

    if (!isValidProjectId(extractedId)) {
      Alert.alert(
        'Invalid Project ID',
        'The project ID must be a 24-character hexadecimal string.',
        [{ text: 'OK' }]
      );
      return;
    }

    setValidating(true);
    const isValidWithServer = await validateProjectIdWithServer(extractedId);
    setValidating(false);

    if (!isValidWithServer) {
      Alert.alert(
        'Invalid Project ID',
        'This project ID doesn’t exist in our system.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Project ID Valid',
      'Would you like to sign up?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            router.push({
              pathname: '/auth/signup/[projectId]',
              params: { projectId: extractedId },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Enter Project ID</Text>
        <Text style={styles.instructionText}>
          Type or paste the project ID from your QR code link.
        </Text>
      </View>
      <TextInput
        style={styles.input}
        value={projectId}
        onChangeText={setProjectId}
        placeholder="Enter or paste project ID"
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        autoCapitalize="none"
      />
      {validating ? (
        <View style={styles.validatingContainer}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.validatingText}>Validating ID...</Text>
        </View>
      ) : (
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          labelStyle={styles.buttonLabel}
          disabled={validating}
        >
          Submit
        </Button>
      )}
      <Button
        mode="outlined"
        onPress={() => router.back()}
        style={styles.cancelButton}
        labelStyle={styles.cancelButtonLabel}
      >
        Cancel
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 5,
    padding: 10,
    color: 'white',
    marginBottom: 20,
    fontSize: 16,
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 16,
  },
  validatingText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 30,
    marginBottom: 16,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderColor: 'white',
    backgroundColor: 'transparent',
    borderRadius: 30,
    borderWidth: 1.5,
    paddingHorizontal: 24,
  },
  cancelButtonLabel: {
    color: 'white',
    fontSize: 14,
  },
});

export default QRScannerScreen;