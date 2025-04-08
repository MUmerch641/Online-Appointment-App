import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useLoginUserMutation } from "../../redux/api/authApi";
import { useDispatch, useSelector } from "react-redux";
import { selectUser, setUser } from "../../redux/slices/authSlice";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { COLORS } from "@/constants/Colors";

const LoginScreen = () => {
  const dispatch = useDispatch();
  const [mobileNo, setMobileNo] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginUser, { isLoading, error }] = useLoginUserMutation();
  const router = useRouter();
  const user = useSelector(selectUser);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const inputsOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(inputsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (user?.token) { 
      router.replace("/dashboard/DashboardScreen");
    }
  }, [user]);

  const handleLogin = async () => {
    Animated.sequence([
      Animated.timing(buttonAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (!mobileNo || !password) {
      Alert.alert("Missing Fields", "Please enter both Mobile Number and Password.");
      return;
    }

    const loginData = { mobileNo, password };

    try {
      const response = await loginUser(loginData).unwrap();

      if (response?.isSuccess && response?.data?.token) {
        console.log("JWT Token:", response.data.token);
        dispatch(setUser(response.data));
      } else {
        Alert.alert("Login Failed", response?.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      
      Alert.alert("Login Error", "Failed to log in. Please check your details.");
    }
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  const errorMessage = (() => {
    if (!error) return null;
    if ("data" in error && error.data && typeof error.data === "object") {
      return (
        (error.data as { message?: string }).message ||
        "Login failed. Please try again."
      );
    }
    return "An unexpected error occurred. Please try again.";
  })();

  const shakeAnimation = {
    0: { translateX: 0 },
    0.2: { translateX: -10 },
    0.4: { translateX: 10 },
    0.6: { translateX: -10 },
    0.8: { translateX: 10 },
    1: { translateX: 0 },
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View 
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                  ],
                }
              ]}
            >
              <Animated.View 
                style={[
                  styles.logoContainer,
                  {
                    transform: [
                      { scale: logoScale }
                    ],
                  }
                ]}
              >
                <Animatable.Text 
                  animation="pulse" 
                  iterationCount="infinite" 
                  duration={2000}
                  style={styles.logoText}
                >
                  HIMS
                </Animatable.Text>
              </Animated.View>
              
              <View style={styles.form}>
                <Animatable.Text 
                  animation="fadeIn" 
                  duration={1000} 
                  delay={300}
                  style={styles.title}
                >
                  Login Account
                </Animatable.Text>
                
                <Animatable.Text 
                  animation="fadeIn" 
                  duration={1000} 
                  delay={500}
                  style={styles.subtitle}
                >
                  Enter phone & password to login HIMS.
                </Animatable.Text>
                
                <Animated.View style={{ opacity: inputsOpacity }}>
                  <Animatable.View 
                    animation="fadeInUp" 
                    duration={800} 
                    delay={600} 
                    style={styles.inputContainer}
                  >
                    <Text style={styles.inputLabel}>Mobile Number</Text>
                    <TextInput
                      placeholder="Enter your mobile number"
                      value={mobileNo}
                      onChangeText={setMobileNo}
                      keyboardType="phone-pad"
                      style={styles.textInput}
                    />
                  </Animatable.View>

                  <Animatable.View 
                    animation="fadeInUp" 
                    duration={800} 
                    delay={700} 
                    style={styles.inputContainer}
                  >
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.textInput}
                    />
                  </Animatable.View>

                  <Animatable.View 
                    animation="fadeInUp" 
                    duration={800} 
                    delay={800} 
                    style={styles.row}
                  >
                    <TouchableOpacity 
                      style={styles.checkboxContainer} 
                      onPress={toggleRememberMe}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rememberText}>
                        {rememberMe ? "☑" : "☐"} Remember Me
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => router.push("/auth/ForgotPassword")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.forgotPassword}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </Animatable.View>
                </Animated.View>
              </View>
              
              <View style={styles.bottomContainer}>
                <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
                  <TouchableOpacity 
                    style={styles.loginButton} 
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator animating={true} color="white" />
                    ) : (
                      <Text style={styles.buttonText}>Login</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                <Animatable.View 
                  animation="fadeIn" 
                  duration={1000} 
                  delay={900} 
                  style={styles.signupContainer}
                >
                  <Text style={styles.signupPrompt}>Don't have an account? </Text>
                  <TouchableOpacity 
                    onPress={() => router.push("/auth/ScanQRScreen")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signupText}>Sign Up</Text>
                  </TouchableOpacity>
                </Animatable.View>
                
                {error && (
                  <Animatable.Text 
                    animation={shakeAnimation} 
                    duration={1000} 
                    style={styles.errorText}
                  >
                    {errorMessage}
                  </Animatable.Text>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 35,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1F75FE",
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#1F75FE",
    textAlign: "left",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "left",
    marginBottom: 25,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  textInput: {
    height: 60,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fdfdfd",
    color: "black",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
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
  loginButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#1F75FE",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  signupContainer: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
  },
  signupPrompt: {
    fontSize: 15,
    color: "#555",
  },
  signupText: {
    fontSize: 15,
    color: "#1F75FE",
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 14,
    color: "#D32F2F",
    textAlign: "center",
    marginTop: 20,
    padding: 10,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
  },
  bottomContainer: {
    width: "100%",
    marginTop: 10,
  },
});

export default LoginScreen;