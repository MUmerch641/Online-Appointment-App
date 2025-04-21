import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Keyboard,
} from "react-native";
import { skipToken } from "@reduxjs/toolkit/query";
import { Card, RadioButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  useRegisterPatientMutation,
  useGetAllPatientsQuery,
  useSearchPatientByMRNQuery
} from "../../redux/api/patientApi";
import { selectUser } from "../../redux/slices/authSlice";
import { addPatients, setPatients } from "../../redux/slices/patientSlice";
import { COLORS } from "@/constants/Colors";



const PatientRegistration = () => {
  const [dob, setDob] = useState("");
  const [age, setAge] = useState({ years: 0, months: 0, days: 0 });
  const [gender, setGender] = useState("Male");
  const [patientName, setPatientName] = useState("");
  const [guardiansName, setGuardiansName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cnic, setCnic] = useState("");
  const [healthId, setHealthId] = useState("");
  const [city, setCity] = useState("");
  const [reference, setReference] = useState("");
  const [mrn, setMrn] = useState<string>("");
  const [searchedPatientData, setSearchedPatientData] = useState<any>(null);
  const [searchedMRN, setSearchedMRN] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const searchButtonScale = useRef(new Animated.Value(1)).current;
  const submitButtonAnim = useRef(new Animated.Value(1)).current;

  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const projectId = user?.projectId ?? "";
  const [registerPatient] = useRegisterPatientMutation();
  const { data: allPatients, refetch } = useGetAllPatientsQuery();

  const { data: searchedPatient, error, isFetching } = useSearchPatientByMRNQuery(
    searchedMRN ?? skipToken
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
  }, [searchedMRN]);

  useEffect(() => {
    refetch();
  }, []);

  const handleDateChange = (text: string) => {
    setDob(text);

    // Only calculate age if the input matches YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      setAge(calculateAge(text));
    }
  };

  const calculateAge = (dobString: string) => {
    const dobDate = new Date(dobString);
    const today = new Date();

    let years = today.getFullYear() - dobDate.getFullYear();
    let months = today.getMonth() - dobDate.getMonth();
    let days = today.getDate() - dobDate.getDate();

    if (days < 0) {
      months -= 1;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months, days };
  };

  const handleMRNSearch = () => {
    if (!mrn.trim()) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true })
      ]).start();

      Alert.alert("Error", "Please enter a valid MRN.");
      return;
    }


    Animated.sequence([
      Animated.timing(searchButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(searchButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSearchedMRN(mrn);
  };

  useEffect(() => {
    if (isFetching) {
      console.log("⏳ Fetching patient data...");
    }

    if (searchedPatient?.isSuccess && searchedPatient.data?.length > 0) {
      console.log("✅ Found Patient Data:", searchedPatient.data[0]);

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setSearchedPatientData(searchedPatient.data[0]);
    } else if (searchedMRN && !isFetching) {
      Alert.alert("No Patient Found", "No patient found with this MRN.");
    }
  }, [searchedPatient, isFetching]);

  useEffect(() => {

    if (searchedPatientData) {
      console.log("📝 Updating Form Fields with Data...");

      setPatientName(searchedPatientData.patientName || "");
      setGuardiansName(searchedPatientData.guardiansName || "");
      setGender(searchedPatientData.gender || "Male");
      setDob(searchedPatientData.dob || "");
      setPhoneNumber(searchedPatientData.phonNumber || "");
      setCnic(searchedPatientData.cnic || "");
      setHealthId(searchedPatientData.helthId || "");
      setCity(searchedPatientData.city || "");
      setReference(searchedPatientData.reference || "");
    }

  }, [searchedPatientData]);

  useEffect(() => {
    if (error) {
      Alert.alert("API Error", "Something went wrong. Please try again.");
    }
  }, [error]);

  useEffect(() => {
    if (allPatients?.data) {
      dispatch(setPatients(allPatients.data));
    }
  }, [allPatients]);
  const handleSubmit = async () => {
    console.log("first")
    Keyboard.dismiss();

    Animated.sequence([
      Animated.timing(submitButtonAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(submitButtonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    console.log("2")

    // Check if required fields are filled
    if (!patientName || !guardiansName || !phoneNumber || !city) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();

      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    console.log("3")

    // Validate phone number
    const phonePattern = /^(03\d{9}|\+92\d{10})$/;
    if (!phonePattern.test(phoneNumber)) {
      Alert.alert(
        "Error",
        "Invalid Pakistani phone number. Format: 03XXXXXXXXX or +92XXXXXXXXXX"
      );
      return;
    }
    console.log("4")

    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dob && !datePattern.test(dob)) {
      Alert.alert("Error", "Date of birth must be in the format YYYY-MM-DD");
      return;
    }

    // If searchedPatientData exists, skip registration and navigate to appointment
    if (searchedPatientData) {
      Alert.alert("Success", "Existing patient selected. Proceeding to appointment.");
      router.push({
        pathname: "/appointments/CreateAppointmentScreen",
        params: {
          patientId: searchedPatientData._id, patientName: searchedPatientData.patientName,
          mrn: searchedPatientData.mrn,        },
      });
      return;
    }

    // Proceed with registration for new patient
    const patientData = {
      patientName,
      guardiansName,
      gender,
      dob,
      phonNumber: phoneNumber,
      helthId: healthId,
      cnic,
      city,
      reference,
    };

    try {
      const response = await registerPatient(patientData).unwrap();

      if (response?.isSuccess && response?.data) {
        dispatch(addPatients(response.data));

        Alert.alert("Success", "Patient registered successfully!");

        router.push({
          pathname: "/appointments/CreateAppointmentScreen",
          params: { patientId: response.data._id },
        });
      } else {
        Alert.alert("Error", response?.message || "Failed to register patient.");
      }
    } catch (error: any) {
      console.error("❌ Registration Failed:", error);

      if (error?.data?.message) {
        Alert.alert("Error", error.data.message[0] || "Failed to register patient.");
      } else {
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    }
  };
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registration</Text>

        <Animated.View
          style={[
            styles.searchContainer,
            { transform: [{ translateX: shakeAnim }] }
          ]}
        >
          <TextInput
            style={styles.searchInput}
            placeholder="Enter MRN"
            placeholderTextColor={COLORS.placeholder}
            value={mrn}
            onChangeText={(text) => {
              if (/^\d*$/.test(text)) {
                setMrn(text);
              }
            }}
          />

          <Animated.View style={{ transform: [{ scale: searchButtonScale }] }}>
            <TouchableOpacity
              onPress={handleMRNSearch}
              style={styles.searchButton}
            >
              {isFetching ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name='reload' size={20} color='white' />
                </Animated.View>
              ) : (
                <Ionicons name='search' size={20} color='white' />
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <Text style={styles.label}>Patient Name:</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter Name'
              placeholderTextColor={COLORS.placeholder}
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={styles.label}>Guardian Name:</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter Name'
              placeholderTextColor={COLORS.placeholder}
              value={guardiansName}
              onChangeText={setGuardiansName}
            />

            <Text style={styles.label}>Gender:</Text>
            <View style={styles.genderContainer}>
              {["Male", "Female", "Child"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderButton,
                    gender === option && styles.genderButtonSelected
                  ]}
                  onPress={() => setGender(option)}
                >
                  <RadioButton
                    value={option}
                    status={gender === option ? "checked" : "unchecked"}
                    onPress={() => setGender(option)}
                    color={COLORS.primary}
                  />
                  <Text style={[
                    styles.genderText,
                    gender === option && styles.genderTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Date & Age</Text>

            <Text style={styles.label}>Date of Birth:</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter DOB (YYYY-MM-DD)'
              placeholderTextColor={COLORS.placeholder}
              value={dob}
              onChangeText={handleDateChange}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Age:</Text>
            <View style={styles.ageContainer}>
              <View style={styles.ageBox}>
                <TextInput
                  style={styles.ageInput}
                  value={`${age.years}`}
                  editable={false}
                />
                <Text style={styles.ageLabel}>Years</Text>
              </View>
              <View style={styles.ageBox}>
                <TextInput
                  style={styles.ageInput}
                  value={`${age.months}`}
                  editable={false}
                />
                <Text style={styles.ageLabel}>Months</Text>
              </View>
              <View style={styles.ageBox}>
                <TextInput
                  style={styles.ageInput}
                  value={`${age.days}`}
                  editable={false}
                />
                <Text style={styles.ageLabel}>Days</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Contact Information</Text>

            <Text style={styles.label}>Phone Number:</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter Number (+923011234567)'
              placeholderTextColor={COLORS.placeholder}
              keyboardType='phone-pad'
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />

            <Text style={styles.label}>CNIC (optional):</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter CNIC (xxxxx-xxxxxxx-x)'
              placeholderTextColor={COLORS.placeholder}
              keyboardType='numeric'
              value={cnic}
              onChangeText={setCnic}
            />

            <Text style={styles.label}>Health ID (optional):</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter Health ID (Optional)'
              placeholderTextColor={COLORS.placeholder}
              value={healthId}
              onChangeText={setHealthId}
            />

            <Text style={styles.sectionTitle}>Location & Reference</Text>

            <Text style={styles.label}>City:</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter City Name'
              placeholderTextColor={COLORS.placeholder}
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Reference (optional):</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter Reference'
              placeholderTextColor={COLORS.placeholder}
              value={reference}
              onChangeText={setReference}
            />
          </View>

          <Animated.View
            style={{
              transform: [{ scale: submitButtonAnim }]
            }}
          >
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>Register & Continue</Text>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>
        </Card>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    overflow: "hidden",
  },
  searchInput: {
    paddingHorizontal: 10,
    height: 40,
    minWidth: 100,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.cardBackground
  },
  searchButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: COLORS.cardBackground,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 16,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: COLORS.background,
    marginBottom: 18,
    color: COLORS.textPrimary,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: 50,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    marginBottom: 18,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    marginRight: 8,
  },
  ageInput: {
    width: "100%",
    height: 50,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: COLORS.background,
    textAlign: "center",
    color: COLORS.textPrimary,
  },
  ageContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  ageBox: {
    alignItems: "center",
    width: "30%",
  },
  ageLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: "500",
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  genderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.background,
    width: "30%",
    justifyContent: "center",
  },
  genderButtonSelected: {
    backgroundColor: `${COLORS.primaryLight}20`,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  genderTextSelected: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
});

export default PatientRegistration;