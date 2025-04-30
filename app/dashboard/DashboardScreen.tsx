import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ListRenderItemInfo,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import {
  useGetAllAppointmentsQuery,
  useCancelAppointmentMutation,
} from "../../redux/api/appointmentApi";
import { selectUser } from "../../redux/slices/authSlice";
import { COLORS } from "@/constants/Colors";
import InstructionModal from "../../components/InstructionModal";
import AppointmentCard from "../../components/appointment-card";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import QRCode from "react-native-qrcode-svg";
import axios from "axios";
import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const onGeneratePDF = async (appointment: any) => {
  try {
    // Helper function to wrap long strings
    const wrapString = (input: string, maxLength: number) => {
      if (input.length > maxLength) {
        return `${input.slice(0, maxLength)}...`;
      }
      return input;
    };

    // Helper function to capitalize names
    const capitalizeName = (name: string) => {
      return name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    };

    // Fetch additional data (equivalent to fetchQrData)
    const fetchQrData = async (id: string) => {
      const url = `${API_BASE_URL}/online-appointment/generateToken/${id}`;
      const userDataString = await AsyncStorage.getItem("persist:auth");
      const parsedData = userDataString ? JSON.parse(userDataString) : null;
      const userData = parsedData.user ? JSON.parse(parsedData.user) : null;
      const token = userData?.token;
      if (!token) {
        throw new Error("No authentication token found");
      }
      try {
        const response = await axios.post(url, {}, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.data.isSuccess) {
          return response.data.data;
        } else {
          throw new Error(response.data.message);
        }
      } catch (error) {
        console.error("Error fetching QR data:", error);
        return null;
      }
    };

    // Fetch QR data
    const res = await fetchQrData(appointment._id) || {
      mrn: appointment.patientId.mrn,
      patientName: appointment.patientId.patientName,
      phonNumber: appointment.patientId.phonNumber || "N/A",
      appointmentDate: formatDate(appointment.appointmentDate),
      appointmentTime: { from: appointment.slot.split(" - ")[0] },
      doctorName: appointment.doctor.fullName,
      feeStatus: appointment.feeStatus || "N/A",
      bookedServices: appointment.bookedServices || [],
      discount: appointment.discount || 0,
      tokenId: appointment._id.slice(0, 8),
      visitId: appointment._id,
    };
    console.log("Fetched QR Data:", res);

    // Generate QR code data URL (placeholder for now)
    const qrCodeUrl = `https://pakhims.com/?MRN=${res.mrn}&visitId=${res.visitId}`;
    // Placeholder base64 image (1x1 transparent PNG)
    const qrCodeDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/w3K0ycAAAAASUVORK5CYII=";
    console.log("Using placeholder QR code for testing");

    // Calculate dynamic height for services
    let additionalHeight = 0;
    res.bookedServices.forEach((item: any) => {
      const serviceNameLines =
        item.serviceName.length / 30 > 1
          ? Math.ceil(item.serviceName.length / 30)
          : 1;
      additionalHeight += (serviceNameLines - 1) * 5;
    });
    const heightPaper = 92 + res.bookedServices.length * 5 + additionalHeight;

    // Generate HTML content for PDF
    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; font-size: 8px; width: 80mm; }
            .header { background-color: #000; color: #fff; text-align: center; padding: 5px; }
            .container { padding: 5px; }
            .row { margin-bottom: 5px; }
            .bold { font-weight: bold; }
            .qr-code { margin: 10px 0; }
            .table { width: 100%; margin-top: 5px; }
            .table div { display: flex; justify-content: space-between; padding: 3px; }
            .table-header { border-bottom: 1px solid #000; }
            .table-row { border-bottom: 1px solid #000; }
            .line { border-bottom: 1px solid #000; margin: 5px 0; }
            .footer { margin-top: 10px; text-align: left; font-size: 8px; }
            .paid { color: #bbb; font-size: 30px; text-align: center; transform: rotate(45deg); position: absolute; top: ${heightPaper / 1.5}mm; left: 30mm; opacity: 0.5; }
            .rect { border: 1px solid #000; padding: 2px; margin: 5px 0; }
            .token-circle { position: absolute; right: 5px; top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 10px;">${res.hospitalName || "Your Hospital Name"}</div>
          </div>
          <div class="container">
            ${res.feeStatus === "paid" ? `<div class="paid">PAID</div>` : res.feeStatus === "insurance" ? `<div class="paid">INSURANCE</div>` : ""}
            <div style="text-align: center; font-size: 8px; margin-top: 5px;">Hospital Phone # ${res.hospitalPhone || "N/A"}</div>
            <div class="token-circle">
              <div style="font-size: 10px; font-weight: bold;">Token</div>
              <div style="font-size: 17px;"># ${res.tokenId}</div>
            </div>
            <div class="row" style="margin-top: 10px;">
              <span class="bold">MRN #:</span>
              <span style="margin-left: 10px;">${res.mrn}</span>
            </div>
            <div class="rect" style="height: 16mm;">
              <div class="row" style="font-size: 9.5px;">
                <span class="bold">Name:</span>
                <span style="margin-left: 25mm;">${wrapString(capitalizeName(res.patientName), 17)}</span>
              </div>
              <div class="row">
                <span class="bold">Phone #:</span>
                <span style="margin-left: 25mm;">${res.phonNumber}</span>
              </div>
              <div class="row">
                <span class="bold">Date & Time:</span>
                <span style="margin-left: 25mm;">${res.appointmentDate} ${res.appointmentTime.from}</span>
              </div>
              <div class="row">
                <span class="bold">Dr. Name:</span>
                <span style="margin-left: 25mm;">${wrapString(capitalizeName(res.doctorName), 17)}</span>
              </div>
            </div>
            <div class="table">
              <div class="table-header">
                <span class="bold">Services</span>
                <span class="bold">Charges</span>
              </div>
              ${res.bookedServices
        .map((item: any) => {
          const serviceNameLines = item.serviceName.match(/.{1,30}/g) || [item.serviceName];
          return serviceNameLines
            .map(
              (line: string, index: number) => `
                      <div class="table-row">
                        <span>${line}</span>
                        ${index === 0 ? `<span>${item.fee}/-</span>` : "<span></span>"}
                      </div>
                    `
            )
            .join("");
        })
        .join("") || '<div class="table-row"><span>No services booked</span><span></span></div>'}
            </div>
            <div class="line"></div>
            <div class="row">
              <span class="bold">Gross Charges:</span>
              <span style="margin-left: 25mm;">${res.bookedServices.reduce((sum: number, item: any) => sum + Number(item.fee), 0)}/-</span>
            </div>
            <div class="row">
              <span class="bold">Fee Status:</span>
              <span style="margin-left: 25mm;">${res.feeStatus}</span>
            </div>
            <div class="row">
              <span class="bold">${res.feeStatus === "paid" ? "Paid Fee" : "Payable Fee"}:</span>
              <span style="margin-left: 25mm;">${res.bookedServices.reduce((sum: number, item: any) => sum + Number(item.fee), 0) - res.discount}/-</span>
            </div>
            <div class="line"></div>
            <div class="qr-code">
              <img src="${qrCodeDataUrl}" width="20mm" height="20mm" />
            </div>
            <div class="footer">
              Software By: Cure Logics, RYK
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      width: 80 * 2.83465, // 80mm in points
      height: heightPaper * 2.83465, // Dynamic height in points
    });
    console.log("Temporary PDF URI:", uri);

    // Request storage permissions for Android
    if (Platform.OS === "android") {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Storage permission is required to save files to Downloads folder.");
      }
    }

    // Define file path
    let fileUri = "";
    const fileName = `Appointment_${res.visitId}.pdf`;

    if (Platform.OS === "android") {
      // First, move to cache directory
      fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: fileUri });
      console.log("Moved to cache directory:", fileUri);

      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error("Failed to create PDF file in cache directory.");
      }
      console.log("Cache file exists:", fileInfo);

      // Try saving to Downloads using MediaLibrary
      try {
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync("Download", asset, false);
        fileUri = `Downloads/${fileName}`;
        console.log("Saved to Downloads via MediaLibrary:", fileUri);
      } catch (mediaError) {
        console.error("MediaLibrary failed:", mediaError);
        // Fallback to StorageAccessFramework
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            "application/pdf"
          );
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileUri = `Downloads/${fileName}`;
          console.log("Saved to Downloads via StorageAccessFramework:", fileUri);
        } else {
          throw new Error("Storage access permission denied.");
        }
      }
    } else {
      // iOS: Save to document directory
      fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: fileUri });
      console.log("Saved to document directory:", fileUri);
    }

    // Verify the file was saved
    const savedFileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!savedFileInfo.exists && Platform.OS === "ios") {
      throw new Error("Failed to verify saved PDF file in document directory.");
    }
    console.log("Saved file info:", savedFileInfo);

    // Show success message
    Alert.alert(
      "Success",
      `PDF file saved to: ${fileUri}${Platform.OS === "ios" ? "\nYou can share it to save to another location." : ""}`,
      [
        { text: "OK", style: "cancel" },
        ...(Platform.OS === "ios"
          ? [
              {
                text: "Share",
                onPress: async () => {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, {
                      mimeType: "application/pdf",
                      dialogTitle: "Share PDF",
                    });
                  } else {
                    Alert.alert("Error", "Sharing not available on this device.");
                  }
                },
              },
            ]
          : []),
      ]
    );
  } catch (error) {
    console.error("PDF Generation/Save Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    Alert.alert("Error", `Failed to generate or save PDF: ${errorMessage}`);
  }
};

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "/");
  } catch (e) {
    return dateString;
  }
};

// Rest of your DashboardScreen code remains unchanged
interface Patient {
  _id: string;
  patientName: string;
  mrn: string;
}

interface Doctor {
  fullName: string;
}

interface TimeSlot {
  from: string;
  to: string;
}

interface Appointment {
  _id: string;
  patientId?: Patient;
  doctorId: string;
  doctor?: Doctor;
  appointmentDate: string;
  appointmentTime?: TimeSlot;
  timeSlotId: string;
  fee: number;
  isApmtCanceled: boolean;
  isPrescriptionCreated: boolean;
  cancel_reason?: string;
}

interface ItemAnimation {
  fadeAnim: Animated.Value;
  translateY: Animated.Value;
}

interface User {
  fullName: string;
  token?: string;
}

const DashboardScreen = () => {
  const router = useRouter();
  const user = useSelector(selectUser) as User | null;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  const itemAnimations = useRef(new Map<string, ItemAnimation>()).current;

  const { data: appointmentsData, refetch, isLoading } = useGetAllAppointmentsQuery(
    { search: searchQuery || "" }
  );
  const [instructionsVisible, setInstructionsVisible] = useState<boolean>(false);

  const [cancelAppointment] = useCancelAppointmentMutation();

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      translateY.setValue(20);

      itemAnimations.clear();

      refetchAppointments();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        })
      ]).start();
    }, [])
  );

  const handleNavigateToAppointment = () => {
    router.push("/registration/PatientRegistration");
  };

  const handleNavigateToPatients = () => {
    router.push("/dashboard/PatientScreen");
  };

  const startItemAnimations = useCallback(() => {
    if (appointmentsData?.data) {
      const maxDelay = Math.min(appointmentsData.data.length * 50, 1000);

      appointmentsData.data.forEach((item: Appointment, index: number) => {
        const animations = itemAnimations.get(item._id);
        if (animations) {
          const delayFactor = appointmentsData.data.length > 10 ? 0.5 : 1;
          const delay = Math.min(index * 50 * delayFactor, maxDelay);

          Animated.parallel([
            Animated.timing(animations.fadeAnim, {
              toValue: 1,
              duration: 300,
              delay,
              useNativeDriver: true
            }),
            Animated.timing(animations.translateY, {
              toValue: 0,
              duration: 300,
              delay,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true
            })
          ]).start();
        }
      });
    }
  }, [appointmentsData?.data, itemAnimations]);

  useEffect(() => {
    if (appointmentsData?.data && !isLoading) {
      appointmentsData.data.forEach((item: Appointment) => {
        if (!itemAnimations.has(item._id)) {
          itemAnimations.set(item._id, {
            fadeAnim: new Animated.Value(0),
            translateY: new Animated.Value(20),
          });
        }
      });

      setTimeout(() => {
        startItemAnimations();
      }, 100);
    }
  }, [appointmentsData?.data, isLoading, startItemAnimations]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const animateRefresh = (): void => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  };

  const refetchAppointments = async (): Promise<void> => {
    setIsRefreshing(true);
    animateRefresh();
    try {
      await refetch();
    } catch (error) {
      Alert.alert("Error refreshing appointments:");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearch = (): void => {
    refetch();
  };

  const handleCancelAppointment = async (appointmentId: string): Promise<void> => {
    Alert.alert(
      "Reason for Cancellation",
      "Please provide a reason",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async (reason = "Appointment no longer needed") => {
            try {
              await cancelAppointment({
                id: appointmentId,
                cancel_reason: reason
              }).unwrap();
              Alert.alert("Success", "Appointment cancelled successfully.");
              refetchAppointments();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel appointment.");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleRetakeAppointment = (appointment: Appointment): void => {
    router.push({
      pathname: "/appointments/CreateAppointmentScreen",
      params: {
        patientId: appointment.patientId?._id,
        patientName: appointment.patientId?.patientName,
        mrn: appointment.patientId?.mrn,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor?.fullName,
        date: appointment.appointmentDate,
        timeSlotId: appointment.timeSlotId
      },
    });
  };

  const handleViewToken = (appointmentId: string): void => {
    if (!appointmentId) {
      Alert.alert("Error", "Invalid appointment ID");
      return;
    }

    router.push({
      pathname: "/appointments/AppointmentReciept",
      params: { appointmentId }
    });
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    try {
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric'
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return "Invalid date";
    }
  };

  const onRefresh = (): void => {
    refetchAppointments();
  };

  const parseTimeString = (timeStr: string) => {
    const timeRegex = /(\d+):(\d+)(?:\s*(AM|PM))?/i;
    const match = timeStr.match(timeRegex);

    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3]?.toUpperCase();

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      return { hours, minutes };
    }

    return null;
  };

  const isAppointmentExpired = (appointment: Appointment): boolean => {
    if (!appointment.appointmentDate || !appointment.appointmentTime?.from) {
      return false;
    }

    const today = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);

    if (appointmentDate.getTime() < today.setHours(0, 0, 0, 0)) {
      return true;
    }

    today.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      const timeStr = appointment.appointmentTime.from;
      const parsedTime = parseTimeString(timeStr);

      if (parsedTime) {
        const { hours, minutes } = parsedTime;
        const appointmentTime = new Date();
        appointmentTime.setHours(hours, minutes, 0, 0);

        return new Date() > appointmentTime;
      }
    }

    return false;
  };

  const renderAppointmentItem = ({ item, index }: ListRenderItemInfo<Appointment>): React.ReactElement => {
    const animations = itemAnimations.get(item._id) || {
      fadeAnim: new Animated.Value(1),
      translateY: new Animated.Value(0)
    };

    return (
      <Animated.View
        style={[
          { opacity: animations.fadeAnim, transform: [{ translateY: animations.translateY }] }
        ]}
      >
        <AppointmentCard
          appointment={{
            _id: item._id,
            patientId: {
              patientName: item.patientId?.patientName || "Unknown",
              mrn: item.patientId?.mrn || "N/A"
            },
            doctor: {
              fullName: item.doctor?.fullName || "Not assigned"
            },
            appointmentDate: item.appointmentDate,
            slot: item.appointmentTime
              ? `${item.appointmentTime.from} - ${item.appointmentTime.to}`
              : "N/A",
            isCanceled: item.isApmtCanceled,
            isPrescriptionCreated: item.isPrescriptionCreated,
            isChecked: item.isPrescriptionCreated
          }}
          onRetake={() => handleRetakeAppointment(item)}
          onToken={() => handleViewToken(item._id)}
          onCancel={() => handleCancelAppointment(item._id)}
          onGeneratePDF={onGeneratePDF}
        />
        <InstructionModal
          visible={instructionsVisible}
          onClose={() => setInstructionsVisible(false)}
          navigateToAppointment={handleNavigateToAppointment}
          navigateToPatients={handleNavigateToPatients}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: translateY }] }
        ]}
      >
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text
            style={styles.userName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user?.fullName || "User"}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setInstructionsVisible(true)}
          >
            <Ionicons name="help-circle" size={20} color="#fff" />
            <Text style={styles.helpButtonText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.appointmentButton}
            onPress={() => router.push("/registration/PatientRegistration")}
          >
            <Text style={styles.appointmentText}>+ Appointment</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.searchContainer,
          { opacity: fadeAnim, transform: [{ translateY: translateY }] }
        ]}
      >
        <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search appointments"
          placeholderTextColor={COLORS.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          keyboardType="default"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              setTimeout(() => refetch(), 100);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.appointmentsHeader}>
        <Text style={styles.sectionTitle}>Appointments</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {isLoading || isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={appointmentsData?.data || []}
          keyExtractor={(item: Appointment) => item._id}
          renderItem={renderAppointmentItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Animated.View
              style={[
                styles.emptyContainer,
                { opacity: fadeAnim, transform: [{ translateY: translateY }] }
              ]}
            >
              <Ionicons name="calendar-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No appointments found</Text>
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setTimeout(() => refetch(), 100);
                  }}
                  style={styles.clearSearchButton}
                >
                  <Text style={styles.clearSearchText}>Clear search</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.createAppointmentButton}
                  onPress={() => router.push("/registration/PatientRegistration")}
                >
                  <Text style={styles.createAppointmentText}>Create Appointment</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 10,
  },
  greetingContainer: {
    flexDirection: "column",
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  appointmentButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  appointmentText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold"
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    height: 40,
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  appointmentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardContent: {
    padding: 12,
  },
  cardMainInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  patientInfoContainer: {
    flexDirection: "column",
    flex: 1,
    marginRight: 8,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  mrnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  status: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontWeight: "bold",
    fontSize: 10,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  status_completed: { backgroundColor: COLORS.success, color: "white" },
  status_pending: { backgroundColor: COLORS.warning, color: "#333" },
  status_cancelled: { backgroundColor: COLORS.danger, color: "white" },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  tokenButton: {
    backgroundColor: COLORS.tokenPurple,
  },
  retakeButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: "dashed",
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: 10,
    fontSize: 16,
    marginBottom: 6,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 20,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  clearSearchButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  clearSearchText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  createAppointmentButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createAppointmentText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  status_expired: { backgroundColor: COLORS.lightGray, color: COLORS.textSecondary },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  helpButton: {
    backgroundColor: COLORS.tokenPurple,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  helpButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 4,
  },
});

export default DashboardScreen;