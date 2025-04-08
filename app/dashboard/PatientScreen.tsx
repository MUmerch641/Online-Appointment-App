import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated,
  StatusBar,
  SafeAreaView,
} from "react-native";
import {
  useGetAllPatientsQuery,
  useDeletePatientMutation,
} from "../../redux/api/patientApi";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Card } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";
import {
  selectPatients,
  setPatients,
  removePatient,
} from "../../redux/slices/patientSlice";
import { useFocusEffect } from "@react-navigation/native"; 
import { COLORS } from "@/constants/Colors";



interface Patient {
  _id: string;
  patientName: string;
  guardiansName: string;
  gender: string;
  dob: string;
  phonNumber: string;
  cnic: string;
  healthId?: string;
  city: string;
  reference?: string;
  projectId?: string;
  mrn?: number;
}

const PatientsScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const projectId = user?.projectId ?? "";
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { data: fetchedPatients, isLoading, refetch } = useGetAllPatientsQuery(undefined, {
    refetchOnFocus: false, 
    refetchOnReconnect: true,
  });

  const [deletePatient] = useDeletePatientMutation();
  const patients = useSelector(selectPatients);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const listItemAnimations = useRef([]);

  useEffect(() => {
    if (fetchedPatients?.data) {
      dispatch(setPatients(fetchedPatients.data));
      
      // Create animation values for each item
      if (fetchedPatients.data.length > 0) {
        listItemAnimations.current = fetchedPatients.data.map(() => new Animated.Value(0));
      }
    }
  }, [fetchedPatients, dispatch]);

  useEffect(() => {
    if (patients && patients.length > 0 && listItemAnimations.current.length > 0) {
      Animated.stagger(
        50,
        listItemAnimations.current.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [patients]);

  useFocusEffect(
    useCallback(() => {
      refetch();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(headerAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
      
      return () => {
        fadeAnim.setValue(0);
        headerAnimation.setValue(0);
      };
    }, [refetch, fadeAnim, headerAnimation])
  );

  const filteredPatients = patients?.filter(
    (patient: Patient) =>
      patient.projectId === projectId &&
      (!searchKeyword ||
        patient.patientName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        patient.cnic.includes(searchKeyword) ||
        patient.phonNumber.includes(searchKeyword) ||
        String(patient.mrn ?? "").includes(searchKeyword))
  ) || [];

  const handleUpdate = (patient: Patient) => {

    if (!patient || !patient._id) {
      Alert.alert("Error", "Invalid patient data.");
      return;
    }


    router.push({
      pathname: "/registration/PatientUpdate",
      params: { patientData: JSON.stringify(patient) },
    });
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this patient?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deletePatient(id).unwrap();
            dispatch(removePatient(id)); 
            Alert.alert("Deleted", "Patient deleted successfully.");
            refetch();
          } catch (error) {
            Alert.alert("Error", "Failed to delete patient.");
          }
        },
      },
    ]);
  };

  const handleCreateAppointment = (patient: Patient) => {

    if (!patient || !patient._id) {
      Alert.alert("Error", "Invalid patient data.");
      return;
    }

    router.push({
      pathname: "/appointments/CreateAppointmentScreen",
      params: { patientId: patient._id },
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  const toggleSearch = () => {
    const toValue = isSearchExpanded ? 0 : 1;
    
    Animated.spring(searchAnimation, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start(() => {
      if (!isSearchExpanded) {
        searchInputRef.current?.focus();
      } else {
        setSearchKeyword("");
      }
    });
    
    setIsSearchExpanded(!isSearchExpanded);
  };

  const clearSearch = () => {
    setSearchKeyword("");
    searchInputRef.current?.focus();
  };

  const searchWidth = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["15%", "85%"],
  });

  const iconOpacity = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.2],
  });

  const headerTranslateY = headerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const headerOpacity = headerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const toggleCardExpansion = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const renderPatientCard = ({ item, index }) => {
    const isExpanded = expandedCard === item._id;
    const itemAnimation = listItemAnimations.current[index] || new Animated.Value(1);
    
    const translateY = itemAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });
    
    const opacity = itemAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Card style={styles.card}>
          <TouchableOpacity onPress={() => toggleCardExpansion(item._id)} activeOpacity={0.7}>
            <View style={styles.headerContainer}>
              <View style={styles.nameContainer}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.mrnText}>MRN: {item.mrn}</Text>
              </View>
              <View style={styles.actionIcons}>
                <TouchableOpacity onPress={() => handleUpdate(item)}>
                  <Ionicons name="create-outline" size={22} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color={COLORS.textSecondary} 
                />
              </View>
            </View>
            
            {!isExpanded ? (
              <View style={styles.compactInfoContainer}>
                <Text style={styles.compactInfo}>
                  <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} /> {item.phonNumber}
                </Text>
                <Text style={styles.compactInfo}>
                  <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} /> {item.gender}
                </Text>
              </View>
            ) : (
              <Animated.View>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.label}>Guardian: <Text style={styles.value}>{item.guardiansName}</Text></Text>
                    <Text style={styles.label}>DoB: <Text style={styles.value}>{item.dob}</Text></Text>
                    <Text style={styles.label}>Phone: <Text style={styles.value}>{item.phonNumber}</Text></Text>
                  </View>
                  <View style={styles.detailColumn}>
                    <Text style={styles.label}>Gender: <Text style={styles.value}>{item.gender}</Text></Text>
                    <Text style={styles.label}>City: <Text style={styles.value}>{item.city}</Text></Text>
                    <Text style={styles.label}>CNIC: <Text style={styles.value}>{item.cnic}</Text></Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.appointmentButton} 
                  onPress={() => handleCreateAppointment(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.appointmentText}>Create Appointment</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Card>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
     
      <Animated.View 
        style={[
          styles.header,
          { 
            opacity: headerOpacity, 
            transform: [{ translateY: headerTranslateY }] 
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patients</Text>
        <View style={styles.headerRight} />
      </Animated.View>

      <View style={styles.container}>
        <View style={styles.searchBarContainer}>
          <Animated.View style={[styles.searchContainer, { width: searchWidth }]}>
            <View style={styles.searchInputWrapper}>
              <Feather name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search by name, ID or phone..."
                placeholderTextColor={COLORS.placeholder}
                value={searchKeyword}
                onChangeText={(text) => setSearchKeyword(text)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                returnKeyType="search"
                selectionColor={COLORS.primary}
              />
              {searchKeyword.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Feather name="x" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
          
          <TouchableOpacity onPress={toggleSearch} style={styles.searchButton}>
            <Animated.View style={{ opacity: iconOpacity }}>
              <Ionicons 
                name={isSearchExpanded ? "close" : "search"} 
                size={24} 
                color={COLORS.primary} 
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {filteredPatients.length > 0 ? (
              <FlatList
                data={filteredPatients}
                keyExtractor={(item) => item._id}
                renderItem={renderPatientCard}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.lightGray} />
                <Text style={styles.emptyText}>No patients found</Text>
                <Text style={styles.emptySubtext}>
                  {searchKeyword ? "Try a different search term" : "Add patients to get started"}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40, 
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  searchContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    height: "100%",
    paddingVertical: 8,
    fontWeight: "400",
  },
  clearButton: {
    padding: 6,
  },
  searchButton: {
    backgroundColor: COLORS.cardBackground,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    padding: 14,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameContainer: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mrnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 2,
  },
  compactInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  compactInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flexDirection: "row",
    alignItems: "center",
  },
  detailsContainer: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  detailColumn: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontWeight: "normal",
    color: COLORS.textPrimary,
  },
  appointmentButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  appointmentText: {
    color: COLORS.cardBackground,
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.placeholder,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

export default PatientsScreen;