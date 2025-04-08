import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Alert, 
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useChangePasswordMutation } from "../../redux/api/authApi";
import { selectUser, logout, updateProfilePicture } from "../../redux/slices/authSlice";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/constants/Colors";



const ProfileScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectUser); 

  const [newPassword, setNewPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    loadProfilePicture();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadProfilePicture = async () => {
    try {
      const persistentProfilePic = await AsyncStorage.getItem("persistentProfilePicture");
      
      if (persistentProfilePic) {
        setProfilePicture(persistentProfilePic);
        dispatch(updateProfilePicture(persistentProfilePic));
        
        await AsyncStorage.setItem("profilePicture", persistentProfilePic);
      } else {
        const regularProfilePic = await AsyncStorage.getItem("profilePicture");
        if (regularProfilePic) {
          setProfilePicture(regularProfilePic);
          dispatch(updateProfilePicture(regularProfilePic));
          
          await AsyncStorage.setItem("persistentProfilePicture", regularProfilePic);
        }
      }
    } catch (error) {
      Alert.alert("❌ Failed to load profile picture from storage:");
    }
  };

  const handleUploadImage = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      setProfilePicture(selectedImageUri);

      const formData = new FormData();
      formData.append("file", {
        uri: selectedImageUri,
        type: "image/jpeg",
        name: "profile.jpg",
      } as any);

      formData.append("upload_preset", "PAKHIMS");

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/dd1chofv4/image/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.secure_url) {
          Alert.alert("Success", "Profile picture uploaded successfully!");
          
          const imageUrl = data.secure_url;
          
          setProfilePicture(imageUrl);
          dispatch(updateProfilePicture(imageUrl));
          
          await AsyncStorage.setItem("profilePicture", imageUrl);
          await AsyncStorage.setItem("persistentProfilePicture", imageUrl);
          
          console.log("✅ Saved profile picture to persistent storage");
        } else {
          Alert.alert("Error", "Failed to upload image. Please try again.");
        }
      } catch (err) {
        Alert.alert("Error", "An error occurred while uploading the image.");
      }
    }
  };

  const handleChangePassword = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    if (!oldPassword || !newPassword) {
      Alert.alert("Error", "Please enter both old and new passwords.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User data is missing. Please log in again.");
      return;
    }

    const requestData = {
      mobileNo: user.mobileNo || "", 
      oldPassword,
      newPassword,
    };


    try {
      const response = await fetch(
        `${Constants.expoConfig?.extra?.API_BASE_URL}/stg_online-apmt/patient-auth/change_password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
      } else {
        Alert.alert("Error", data?.message || "Failed to change password.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while updating the password.");
    }
  };

  const handleLogout = async () => {
    if (profilePicture) {
      await AsyncStorage.setItem("persistentProfilePicture", profilePicture);
      console.log("✅ Saved profile picture before logout:", profilePicture);
    }
    
 
    dispatch(logout());
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("refreshToken");
    
 
    await AsyncStorage.removeItem("profilePicture");

    router.replace("/auth/LoginScreen");
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.mainContainer,
          {opacity: fadeAnim, transform: [{scale: scaleAnim}]}
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholderView} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.profilePictureContainer} 
              onPress={handleUploadImage}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: profilePicture || "https://via.placeholder.com/150" }}
                style={styles.profilePicture}
              />
              <View style={styles.editIcon}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </TouchableOpacity>
            {user?.fullName && (
              <Text style={styles.userName}>{user.fullName}</Text>
            )}
          </Animated.View>

          <View style={styles.infoSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.sectionTitle}>User Information</Text>
              <Text style={styles.label}>Name</Text>
              <TextInput 
                style={styles.input} 
                value={user?.fullName} 
                editable={false} 
              />

              <Text style={styles.label}>Mobile Number</Text>
              <TextInput 
                style={styles.input} 
                value={user?.mobileNo} 
                editable={false} 
              />
            </View>

            {/* Change Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={(text) => setOldPassword(text)}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor={COLORS.placeholder}
              />

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={(text) => setNewPassword(text)}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <TouchableOpacity 
              style={styles.changePasswordButton} 
              onPress={handleChangePassword}
              activeOpacity={0.8}
            >
              <Text style={styles.changePasswordText}>
                {isLoading ? "Changing..." : "Change Password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 20,
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
  placeholderView: {
    width: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  profilePictureContainer: {
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 10,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.cardBackground,
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.cardBackground,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  infoSection: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: COLORS.background,
    marginBottom: 15,
    color: COLORS.textPrimary,
  },
  changePasswordButton: {
    marginTop: 10,
    alignItems: "center",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  changePasswordText: {
    fontSize: 16,
    color: COLORS.cardBackground,
    fontWeight: "bold",
  },
  logoutButton: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.cardBackground,
    fontWeight: "bold",
  },
});

export default ProfileScreen;