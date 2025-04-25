import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, Dimensions } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@/constants/Colors";
import { useSelector } from "react-redux";
import { selectUser } from "@/redux/slices/authSlice";

const { width } = Dimensions.get("window");

const healthQuotes = [
  "\"The greatest wealth is health.\" — Virgil",
  "\"Take care of your body. It's the only place you have to live.\" — Jim Rohn",
  "\"Health is not valued until sickness comes.\" — Thomas Fuller",
  "\"Your health is an investment, not an expense.\"",
  "\"Healing is a matter of time, but it is sometimes also a matter of opportunity.\" — Hippocrates"
];

const Welcome = () => {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const quoteAnim = useRef(new Animated.Value(0)).current;
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const user = useSelector(selectUser);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }),
      Animated.timing(quoteAnim, {
        toValue: 1,
        duration: 1500,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % healthQuotes.length);

      Animated.sequence([
        Animated.timing(quoteAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(quoteAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    }, 5000);

    return () => clearInterval(quoteInterval);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user?.token && isMounted) {
      router.replace("/dashboard/DashboardScreen");
    }
  }, [user, isMounted]);

  return (
    <LinearGradient
      colors={[COLORS.background, '#E5F1FB', COLORS.background]}
      style={styles.container}
    >
      <View style={styles.wavyTopRight}></View>
      <View style={styles.wavyBottomLeft}></View>
      <View style={styles.circle1}></View>
      <View style={styles.circle2}></View>

      <View style={styles.animationContainer}>
        <LottieView
          source={require("../assets/images/Doctor.json")}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.mainTitle}>Welcome To HIMS</Text>
        <Text style={styles.subtitle}>Find Best Doctor With Us</Text>
      </Animated.View>

      {/* Rotating quotes */}
      <Animated.View style={[styles.quoteContainer, { opacity: quoteAnim }]}>
        <MaterialCommunityIcons name="format-quote-open" size={20} color={COLORS.secondary} style={styles.quoteIcon} />
        <Text style={styles.quoteText}>{healthQuotes[currentQuote]}</Text>
        <MaterialCommunityIcons name="format-quote-close" size={20} color={COLORS.secondary} style={styles.quoteIcon} />
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          width: "100%",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/auth/LoginScreen")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Login</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={styles.buttonIcon} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/auth/ScanQRScreen")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Scan To Signup</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={styles.buttonIcon} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/")}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Learn More About HIMS</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.trustIndicators}>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="shield-check" size={18} color={COLORS.success} />
          <Text style={styles.trustText}>Verified Doctors</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="clock-time-four" size={18} color={COLORS.success} />
          <Text style={styles.trustText}>24/7 Support</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="hospital-box" size={18} color={COLORS.success} />
          <Text style={styles.trustText}>Private Consultations</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  animationContainer: {
    width: "100%",
    height: 280,
    padding: 20,
  },
  animation: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: COLORS.primary,
    letterSpacing: 1,
    textShadowColor: 'rgba(67, 97, 238, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: COLORS.secondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 30,
    maxWidth: width - 40,
  },
  quoteText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    flex: 1,
  },
  quoteIcon: {
    marginHorizontal: 5,
  },
  button: {
    width: "70%",
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    margin: 10
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  secondaryButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "500",
  },
  trustIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 30,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  trustText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  wavyTopRight: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(76, 201, 240, 0.15)',
    transform: [{ scaleX: 1.5 }],
  },
  wavyBottomLeft: {
    position: "absolute",
    bottom: 40,
    left: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(247, 37, 133, 0.15)',
    transform: [{ scaleX: 1.5 }],
  },
  circle1: {
    position: 'absolute',
    top: 120,
    left: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(63, 55, 201, 0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: 120,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(114, 9, 183, 0.1)',
  },
});