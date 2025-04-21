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
    router.push("/dashboard/PatientScreen"); // Adjust this path as needed
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

  const handlePrintData = (appointmentId: string): void => {
    Alert.alert(
      "Print Prescription",
      "Would you like to view/print the prescription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "View",
          onPress: () => {
            router.push({
              pathname: "/appointments/PrescriptionScreen",
              params: { appointmentId }
            });
          }
        },
      ]
    );
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
            slot: item.appointmentTime?.from || "N/A",
            isCanceled: item.isApmtCanceled,
            isPrescriptionCreated: item.isPrescriptionCreated,
            isChecked: item.isPrescriptionCreated
          }}
          onRetake={() => handleRetakeAppointment(item)}
          onToken={() => handleViewToken(item._id)}
          onCancel={() => handleCancelAppointment(item._id)}
          onPrintData={handlePrintData}
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
    <Text style={styles.userName}>{user?.fullName || "User"}</Text>
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
    elevation: 2,
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
    elevation: 2,
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
    elevation: 3,
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
    elevation: 1,
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
    elevation: 2,
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
    elevation: 2,
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
  elevation: 2,
},
helpButtonText: {
  fontSize: 14,
  color: "#fff",
  fontWeight: "bold",
  marginLeft: 4,
},
});

export default DashboardScreen;