import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert, StatusBar, Image } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { COLORS } from "@/constants/Colors";
import Constants from "expo-constants";

// Get API base URL from Constants
const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/online-apmt`;

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

const QRScannerScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [scanned, setScanned] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(true);
  const [validating, setValidating] = useState<boolean>(false);

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        
        setPermissionStatus(status);
        setHasPermission(status === 'granted');
      } catch (error) {
        setPermissionStatus('denied');
        setHasPermission(false);
      }
    };

    requestCameraPermission();
  }, []);

  const isValidProjectId = (projectId: string): boolean => {
    
    // Check if projectId exists and is a string
    if (!projectId || typeof projectId !== 'string') {
      return false;
    }

    // Remove any whitespace
    const trimmedId = projectId.trim();

    // Check exact length of 24 characters
    if (trimmedId.length !== 24) {
      return false;
    }

    // Validate hexadecimal format (case insensitive)
    const hexPattern = /^[0-9a-f]{24}$/i;
    const isHex = hexPattern.test(trimmedId);
    
    if (!isHex) {
    }
    
    return isHex;
  };

  const validateProjectIdWithServer = async (projectId: string): Promise<boolean> => {
    try {
      // Use the hospital profile endpoint to validate if the project ID exists
      const response = await fetch(`${API_BASE_URL}/patient-auth/hospital_profile/${projectId}`);
      const data = await response.json();
      
      // If we get a successful response, the project ID is valid
      if (response.ok && data) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      // The app will handle validation again on the signup screen
      return true;
    }
  };

  const handleBarCodeScanned = async ({ type, data }: BarCodeScannerResult) => {
    if (!scanning || validating) return;
    
    setScanning(false);
    setScanned(true);
    
    try {
      // Extract projectId from various URL patterns
      let projectId: string | null = null;
      
      // 1. Main pattern for URLs like https://pakhims.com/online-apmt/{projectId}/
      const mainPattern = /\/online-apmt\/([a-f0-9]{24})\/?/i;
      const mainMatch = data.match(mainPattern);
      
      // 2. Fallback for any URL with a 24-character hex string after a slash
      const fallbackPattern = /\/([a-f0-9]{24})(?:\/|$)/i;
      const fallbackMatch = !mainMatch ? data.match(fallbackPattern) : null;
      
      // 3. Last resort: just look for a 24-character hex string anywhere
      const rawPattern = /([a-f0-9]{24})/i;
      const rawMatch = (!mainMatch && !fallbackMatch) ? data.match(rawPattern) : null;
      
      if (mainMatch) {
        projectId = mainMatch[1].trim();
      } else if (fallbackMatch) {
        projectId = fallbackMatch[1].trim();
      } else if (rawMatch) {
        projectId = rawMatch[1].trim();
      }
      
      if (projectId && isValidProjectId(projectId)) {
        // Show validation in progress
        setValidating(true);
        
        // Attempt to validate the project ID with the server
        const isValidWithServer = await validateProjectIdWithServer(projectId);
        setValidating(false);
        
        if (!isValidWithServer) {
          Alert.alert(
            "Invalid Project ID",
            "The QR code contains a project ID that doesn't exist in our system.",
            [{ 
              text: "Scan Again", 
              onPress: () => {
                setScanning(true);
                setScanned(false);
              }
            }]
          );
          return;
        }
        
        // Directly navigate to the signup page without showing the confirmation alert
        router.push({
          pathname: "/auth/signup/[projectId]",
          params: { projectId }
        });
        return;
      }
      
      Alert.alert(
        "Invalid QR Code",
        "The scanned QR code is not a valid signup link. Please scan a valid QR code.",
        [{ 
          text: "Scan Again", 
          onPress: () => {
            setScanning(true);
            setScanned(false);
          }
        }]
      );
    } catch (error) {
      console.error("QR code parsing error:", error);
      Alert.alert(
        "Error", 
        "Could not process the QR code.",
        [{ 
          text: "Try Again", 
          onPress: () => {
            setScanning(true);
            setScanned(false);
          }
        }]
      );
    }
  };

  if (permissionStatus === 'undetermined') {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Please allow camera access in your device settings to scan QR codes.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => router.back()}
          style={styles.permissionButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      />
      
      <View style={styles.overlay}>
        <View style={styles.scanWindowContainer}>
          <View style={styles.scanWindow}>
            <View style={[styles.cornerTL, styles.corner]} />
            <View style={[styles.cornerTR, styles.corner]} />
            <View style={[styles.cornerBL, styles.corner]} />
            <View style={[styles.cornerBR, styles.corner]} />
          </View>
        </View>
      </View>
      
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Scan QR Code</Text>
        <Text style={styles.instructionText}>
          Align QR code within the frame to scan
        </Text>
      </View>
      
      <View style={styles.bottomContainer}>
        {validating ? (
          <View style={styles.validatingContainer}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.validatingText}>Validating QR code...</Text>
          </View>
        ) : scanned ? (
          <Button 
            mode="contained"
            onPress={() => {
              setScanning(true);
              setScanned(false);
            }} 
            style={styles.scanButton}
            labelStyle={styles.buttonLabel}
          >
            Scan Again
          </Button>
        ) : null}
        
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.cancelButton}
          labelStyle={styles.cancelButtonLabel}
        >
          Cancel
        </Button>
      </View>
    </View>
  );
};

const WINDOW_SIZE = 250;
const CORNER_SIZE = 30;
const STROKE_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanWindowContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanWindow: {
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.primary,
    borderWidth: STROKE_WIDTH,
    backgroundColor: 'transparent',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 10,
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 40,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
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
  scanButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 30,
    marginBottom: 16,
    elevation: 4,
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
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
});

export default QRScannerScreen;