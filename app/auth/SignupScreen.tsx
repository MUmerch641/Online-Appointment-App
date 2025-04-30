import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TextInput,
  Animated,
  Easing,
  Image,
  Alert,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useRegisterUserMutation, useGetHospitalByProjectIdQuery } from "../../redux/api/authApi";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/authSlice";
import { router, useLocalSearchParams } from "expo-router";
import * as Animatable from "react-native-animatable";
import { COLORS } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

// Define a properly typed User interface for Redux
interface User {
  _id: string;
  fullName: string;
  mobileNo: string;
  token: string;
  refreshToken: string;
}

// Define a flexible ApiResponse type for handling different response structures
interface ApiResponse {
  isSuccess?: boolean;
  data?: {
    _id?: string;
    mobileNo?: string;
    fullName?: string;
    token?: string;
    refreshToken?: string;
    [key: string]: any;
  } | null;
  message?: string;
  token?: string;
  _id?: string;
  mobileNo?: string;
  fullName?: string;
  refreshToken?: string;
  [key: string]: any;
}

// Define hospital info type
interface HospitalInfo {
  _id: string;
  hospitalName: string;
  hospitalLogoUrl: string;
  phoneNo: string;
}

const SignupScreen = () => {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId;
  const dispatch = useDispatch();
  const [fullName, setFullName] = useState<string>("");
  const [mobileNo, setMobileNo] = useState<string>("03");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  const [registerUser, { isLoading, error }] = useRegisterUserMutation();
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<string | null>(null);

  // Fetch hospital information by projectId
  const {
    data: hospitalData,
    isLoading: isLoadingHospital,
    error: hospitalError,
    isError: isHospitalError,
  } = useGetHospitalByProjectIdQuery(projectId || "", {
    skip: !projectId,
  });

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;

  // Prevent access without a valid project ID
  useEffect(() => {
    const validateProjectId = () => {
      if (!projectId) {
        setErrorMessage("Invalid access: No project ID found.");
        Alert.alert(
          "Invalid Access",
          "You must scan a valid QR code to sign up. Please go back and scan the QR code.",
          [
            {
              text: "Go Back",
              onPress: () => router.push("/auth/ScanQRScreen"),
              style: "cancel",
            },
          ]
        );
        return false;
      }

      if (projectId.length !== 24) {
        setErrorMessage(`Invalid project ID length: ${projectId.length}`);
        Alert.alert(
          "Invalid Project ID",
          "The provided project ID is invalid. Please scan the QR code again.",
          [
            {
              text: "Scan QR Code",
              onPress: () => router.push("/auth/ScanQRScreen"),
              style: "cancel",
            },
          ]
        );
        return false;
      }

      const hexPattern = /^[0-9a-f]{24}$/i;
      if (!hexPattern.test(projectId)) {
        setErrorMessage("Invalid project ID format");
        Alert.alert(
          "Invalid Project ID Format",
          "The project ID must be a valid 24-character hexadecimal string.",
          [
            {
              text: "Scan QR Code",
              onPress: () => router.push("/auth/ScanQRScreen"),
              style: "cancel",
            },
          ]
        );
        return false;
      }

      return true;
    };

    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        delay: 900,
        useNativeDriver: true,
      }),
    ]).start();

    if (!validateProjectId()) {
      setTimeout(() => {
        router.push("/auth/ScanQRScreen");
      }, 1500);
    }
  }, [projectId, hospitalData, isHospitalError, isLoadingHospital]);

  const handleInputFocus = (inputName: string) => {
    setActiveInput(inputName);
  };

  const handleInputBlur = () => {
    setActiveInput(null);
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  const getInputContainerStyle = (inputName: string) => {
    return [
      styles.inputContainer,
      activeInput === inputName && {
        transform: [{ scale: 1.02 }],
      },
      inputName === "mobileNo" &&
        errorMessage &&
        errorMessage.includes("Phone number already registered") &&
        styles.errorInput,
    ];
  };

  const handleMobileNoChange = (text: string) => {
    if (text.length <= 11) {
      if (text.startsWith("03")) {
        setMobileNo(text);
      } else if (text.length >= 2) {
        setMobileNo("03" + text.substring(2));
      } else {
        setMobileNo("03");
      }
    }
  };

  const handleSignup = async () => {
    if (!projectId || projectId.length !== 24) {
      Alert.alert(
        "Error",
        "No valid project ID found. Please scan the QR code again.",
        [{ text: "OK", onPress: () => router.push("/auth/ScanQRScreen") }]
      );
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name");
      return;
    }

    if (!mobileNo.trim()) {
      setErrorMessage("Please enter your phone number");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter a password");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    const signupData = {
      fullName,
      mobileNo,
      password,
      projectId,
    };

    try {
      const response: ApiResponse = await registerUser(signupData).unwrap();

      if (response.isSuccess === true ) {    

        if (response.data) {
          dispatch(setUser(response.data as User));
        } else {
          throw new Error("Invalid user data received");
        }
        router.replace("/dashboard/PatientScreen");
      } else {
        const msg = response.message || "Signup failed. Please try again.";
        setErrorMessage(msg);
        Alert.alert("Error", msg);
      }
    } catch (err: any) {

      const errorMsg = err?.data?.message || "Signup failed. Please try again.";
      if (
        errorMsg.toLowerCase().includes("phone number already registered") ||
        errorMsg.toLowerCase().includes("already registered") ||
        errorMsg.toLowerCase().includes("already exists")
      ) {
        setErrorMessage("Phone number already registered");
        Alert.alert(
          "Registration Error",
          "Phone number already registered. Please login instead.",
          [
            {
              text: "OK",
              onPress: () => router.push("/auth/LoginScreen"),
            },
          ]
        );
      } else {
        setErrorMessage(errorMsg);
        Alert.alert("Error", errorMsg);
      }
    }
  };

  if (!projectId) {
    return (
      <View style={styles.noProjectContainer}>
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorMessage}>
          You cannot access the signup page directly. Please scan a valid QR code
          to proceed with registration.
        </Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push("/auth/ScanQRScreen")}
        >
          <Text style={styles.buttonText}>Scan QR Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hospitalInfo = hospitalData?.data;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formTranslateY }],
                },
              ]}
            >
              {isLoadingHospital ? (
                <View style={styles.hospitalLoadingContainer}>
                  <ActivityIndicator
                    animating={true}
                    color="#1F75FE"
                    size="large"
                  />
                  <Text style={styles.loadingText}>
                    Loading hospital information...
                  </Text>
                </View>
              ) : hospitalInfo ? (
                <Animatable.View
                  animation="fadeIn"
                  duration={1000}
                  style={styles.hospitalInfoContainer}
                >
                  {hospitalInfo.hospitalLogoUrl ? (
                    <Image
                      source={{ uri: hospitalInfo.hospitalLogoUrl }}
                      style={styles.hospitalLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Text style={styles.logoPlaceholderText}>
                        {hospitalInfo.hospitalName?.charAt(0) || "H"}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.hospitalName}>
                    {hospitalInfo.hospitalName}
                  </Text>
                  {hospitalInfo.phoneNo && (
                    <Text style={styles.hospitalPhone}>
                      Contact: {hospitalInfo.phoneNo}
                    </Text>
                  )}
                </Animatable.View>
              ) : (
                <Animatable.View
                  animation="bounceIn"
                  duration={1200}
                  style={styles.logoContainer}
                >
                  <Text style={styles.logoText}>HIMS</Text>
                </Animatable.View>
              )}

              <Animatable.Text
                animation="fadeIn"
                duration={800}
                delay={300}
                style={styles.title}
              >
                Signup Account
              </Animatable.Text>

              <Animatable.Text
                animation="fadeIn"
                duration={800}
                delay={400}
                style={styles.subtitle}
              >
                Enter your name, phone number & password to register.
              </Animatable.Text>

              {errorMessage && (
                <Animatable.View
                  animation="fadeIn"
                  duration={300}
                  style={styles.errorContainer}
                >
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Animatable.View>
              )}

              <View style={styles.form}>
                <Animatable.View
                  animation="fadeInUp"
                  duration={800}
                  delay={500}
                  style={getInputContainerStyle("fullName")}
                >
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    placeholder="Enter Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    style={styles.textInput}
                    onFocus={() => handleInputFocus("fullName")}
                    onBlur={handleInputBlur}
                  />
                </Animatable.View>

                <Animatable.View
                  animation="fadeInUp"
                  duration={800}
                  delay={600}
                  style={getInputContainerStyle("mobileNo")}
                >
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    placeholder="Enter Phone Number"
                    keyboardType="phone-pad"
                    value={mobileNo}
                    onChangeText={handleMobileNoChange}
                    style={[
                      styles.textInput,
                      errorMessage &&
                        errorMessage.includes("Phone number already registered") &&
                        styles.inputError,
                    ]}
                    onFocus={() => handleInputFocus("mobileNo")}
                    onBlur={handleInputBlur}
                    maxLength={11}
                  />
                  {errorMessage &&
                    errorMessage.includes("Phone number already registered") && (
                      <Text style={styles.fieldErrorText}>
                        Phone number already registered
                      </Text>
                    )}
                </Animatable.View>

                <Animatable.View
                  animation="fadeInUp"
                  duration={800}
                  delay={700}
                  style={getInputContainerStyle("password")}
                >
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      placeholder="Enter Password"
                      secureTextEntry={!passwordVisible}
                      value={password}
                      onChangeText={setPassword}
                      style={[styles.textInput, styles.passwordInput]}
                      onFocus={() => handleInputFocus("password")}
                      onBlur={handleInputBlur}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                    >
                      <Ionicons
                        name={passwordVisible ? "eye" : "eye-off"}
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </Animatable.View>

                <Animatable.View
                  animation="fadeInUp"
                  duration={800}
                  delay={800}
                  style={getInputContainerStyle("confirmPassword")}
                >
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      placeholder="Confirm Password"
                      secureTextEntry={!confirmPasswordVisible}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      style={[styles.textInput, styles.passwordInput]}
                      onFocus={() => handleInputFocus("confirmPassword")}
                      onBlur={handleInputBlur}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                    >
                      <Ionicons
                        name={confirmPasswordVisible ? "eye" : "eye-off"}
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </Animatable.View>
              </View>

              <View style={styles.bottomContainer}>
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={handleSignup}
                    activeOpacity={0.8}
                    disabled={!projectId || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator animating={true} color="white" />
                    ) : (
                      <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                <Animatable.View
                  animation="fadeIn"
                  duration={800}
                  delay={1000}
                  style={styles.loginContainer}
                >
                  <Text style={styles.loginPrompt}>
                    Already have an account?
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/auth/LoginScreen")}
                  >
                    <Text style={styles.loginText}> Login</Text>
                  </TouchableOpacity>
                </Animatable.View>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  formContainer: {
    width: "100%",
    maxWidth: 450,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    marginVertical: 20,
  },
  hospitalInfoContainer: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  hospitalLogo: {
    width: 120,
    height: 120,
    marginBottom: 10,
    borderRadius: 10,
  },
  hospitalName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F75FE",
    textAlign: "center",
    marginBottom: 5,
  },
  hospitalPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1F75FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  logoPlaceholderText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
  },
  hospitalLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    height: 120,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F75FE",
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F75FE",
    textAlign: "center",
    marginBottom: 5,
  },
  projectIdText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 10,
    backgroundColor: "#f0f4ff",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    textAlign: "center",
  },
  fieldErrorText: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  form: {
    width: "100%",
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 20,
    borderRadius: 10,
    padding: 2,
  },
  errorInput: {
    borderWidth: 1,
    borderColor: "#FFCDD2",
    backgroundColor: "#FFEBEE",
    borderRadius: 10,
    padding: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
    marginLeft: 2,
  },
  textInput: {
    height: 55,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fdfdfd",
    color: "black",
  },
  inputError: {
    borderColor: "#FF5252",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 25,
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberText: {
    fontSize: 15,
    color: "#555",
  },
  forgotPassword: {
    fontSize: 15,
    color: "#1F75FE",
    fontWeight: "600",
  },
  signupButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  loginPrompt: {
    fontSize: 15,
    color: "#555",
  },
  loginText: {
    fontSize: 15,
    color: "#1F75FE",
    fontWeight: "bold",
  },
  bottomContainer: {
    width: "100%",
  },
  noProjectContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  passwordContainer: {
    position: "relative",
    width: "100%",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    top: "50%",
    transform: [{ translateY: -12 }],
    zIndex: 1,
  },
});

export default SignupScreen;