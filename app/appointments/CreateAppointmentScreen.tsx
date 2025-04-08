import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Card } from "react-native-paper";
import {
  useGetAllDoctorsQuery,
  useGetAllSpecializationsQuery,
  useGetAllTimeSlotsQuery,
  useBookAppointmentMutation,
} from "../../redux/api/appointmentApi";
import { Image } from "react-native";
import { COLORS } from "@/constants/Colors";



interface Doctor {
  _id: string;
  fullName: string;
  specialization: string;
  availableDays: string[];
  photoUrl?: string;
  weeklySchedule: {
    day: string;
    timingScheedules: { timeFrom: string; timeTo: string }[];
  }[];
  services?: {
    _id: string;
    serviceName: string;
    fee: number;
    hospitalChargesInPercentage: number;
    extra: object;
  }[];
}

interface Specialization {
  specializations: string;
  details: string;
  _id: string; 
}

interface TimeSlot {
  slotId: string;
  slot: string;
  status: number;
}

interface Schedule {
  day: string;
  timingScheedules: { timeFrom: string; timeTo: string }[];
}

const CreateAppointmentScreen = () => {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  
  const CURRENT_DATE = new Date();
  const TODAY_DATE_STRING = CURRENT_DATE.toISOString().split("T")[0];

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(100))[0];
  const spinAnim = useState(new Animated.Value(0))[0];
  
  // API hooks
  const { data: doctorsData } = useGetAllDoctorsQuery({});
  const { data: specializationsData } = useGetAllSpecializationsQuery({});
  const [bookAppointment] = useBookAppointmentMutation();

  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<
    string | null
  >(null);
  const [specializationDescription, setSpecializationDescription] = useState<
    string | null
  >(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [feeStatus, setFeeStatus] = useState<"paid" | "unpaid">("unpaid");
  const [isLoading, setIsLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Fetch time slots when doctor and date are selected
  const { data: timeSlotsData, refetch: fetchSlots } = useGetAllTimeSlotsQuery(
    selectedDoctor && selectedDate
      ? { doctorId: selectedDoctor, date: selectedDate }
      : undefined,
    { skip: !selectedDoctor || !selectedDate }
  );

  // Animations
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
  }, []);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isLoading]);

  // Animate when doctor is selected
  useEffect(() => {
    if (selectedDoctor) {
      setAnimate(true);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setAnimate(false));
    }
  }, [selectedDoctor]);

  // Update current time
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const filteredDoctors = useMemo(() => {
    return selectedSpecialization && selectedSpecialization !== ""
      ? doctorsData?.data.filter(
          (doc: Doctor) => doc.specialization === selectedSpecialization
        )
      : doctorsData?.data;
  }, [selectedSpecialization, doctorsData?.data]);

  const selectedDoctorDetails = useMemo(() => {
    return doctorsData?.data?.find(
      (doc: Doctor) => doc._id === selectedDoctor
    );
  }, [selectedDoctor, doctorsData?.data]);

  const selectedSpecializationId = useMemo(() => {
    if (!selectedSpecialization || !specializationsData?.data) return null;
    
    const specObj = specializationsData?.data.find(
      (s: Specialization) => s.specializations === selectedSpecialization
    );
    
    return specObj?._id || null;
  }, [selectedSpecialization, specializationsData?.data]);

  const getStandardizedDayName = (date: Date): string => {
    return date.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
  };
  
  const isToday = (dateString: string): boolean => {
    return dateString === TODAY_DATE_STRING;
  };
  
  const isPastDate = (dateString: string): boolean => {
    const inputDate = new Date(dateString);
    inputDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return inputDate < today;
  };

  const calculateAvailableDates = (doctor: Doctor) => {
    if (!doctor || !doctor.weeklySchedule) return [];
    
    const today = new Date();
    const available: string[] = [];

    const availableDaysMap = new Map();
    doctor.weeklySchedule.forEach((schedule: Schedule) => {
      if (schedule.timingScheedules && schedule.timingScheedules.length > 0) {
        availableDaysMap.set(schedule.day.toLowerCase(), schedule.timingScheedules);
      }
    });
    
    
    if (availableDaysMap.size === 0) return [];

    for (let i = 0; i < 30; i++) {
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + i);
      
      if (futureDate < today && i > 0) continue;
      
      const dayName = getStandardizedDayName(futureDate);
      const dateString = futureDate.toISOString().split("T")[0];
      
      if (availableDaysMap.has(dayName)) {
        available.push(dateString);
      }
    }
    
    return available;
  };

  const handleSpecializationChange = (spec: string | null) => {
    setSelectedSpecialization(spec);

    if (!spec || spec === "") {
      setSpecializationDescription(null);
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableDates([]);
    } else {
      const foundSpecialization = specializationsData?.data.find(
        (s: Specialization) => s.specializations === spec
      );

      setSpecializationDescription(foundSpecialization?.details || "");
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableDates([]);
    }
  };

  const handleDoctorChange = (doctorId: string | null) => {
    setSelectedDoctor(doctorId);
    setSelectedSlot(null);
    setSelectedDate(null);
  
    if (!doctorId) {
      setAvailableDates([]);
      return;
    }
  
    const doctorDetails = doctorsData?.data.find((doc: Doctor) => doc._id === doctorId);
    if (!doctorDetails) {
      setAvailableDates([]);
      return;
    }
  
    setSelectedSpecialization(doctorDetails.specialization);
    setSpecializationDescription(
      specializationsData?.data.find(
        (spec: Specialization) => spec.specializations === doctorDetails.specialization
      )?.details || doctorDetails.specialization
    );
  
    const availableDays = calculateAvailableDates(doctorDetails);
    setAvailableDates(availableDays);
    
    if (availableDays.length > 0) {
      setSelectedDate(availableDays[0]);
    }
  };

  const isDateAvailable = (date: Date): boolean => {
    if (!selectedDoctorDetails || !selectedDoctorDetails.weeklySchedule) return false;
    
    const dayName = getStandardizedDayName(date);
    
    return selectedDoctorDetails.weeklySchedule.some(
      (schedule: Schedule) =>
        schedule.day.toLowerCase() === dayName &&
        schedule.timingScheedules &&
        schedule.timingScheedules.length > 0
    );
  };

  const filterAvailableDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return false;
    
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 30);
    if (date > futureLimit) return false;
    
    return isDateAvailable(date);
  };

  
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchSlots();
    }
  }, [selectedDoctor, selectedDate, fetchSlots]);

  const handleDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (!date) return;
  
    const formattedDate = date.toISOString().split("T")[0];
  
    if (isPastDate(formattedDate)) {
      Alert.alert("Invalid Date", "Please select a current or future date.");
      return;
    }
  
    
    if (!isDateAvailable(date)) {
      Alert.alert("Doctor Unavailable", "This doctor is not available on the selected date.");
      return;
    }
  
    setSelectedDate(formattedDate);
    setSelectedSlot(null);
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

  
  const isTimeSlotPassed = (timeFromStr: string) => {
    if (!selectedDate || !isToday(selectedDate)) {
      return false;
    }
  
    const parsedTime = parseTimeString(timeFromStr);
    if (!parsedTime) return false;
  
    const { hours, minutes } = parsedTime;
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
  
    return currentTime > slotTime;
  };


 const handleConfirmBooking = async () => {
  if (!selectedDoctor || !selectedDate || !selectedSlot || !patientId) {
    Alert.alert("Incomplete Information", "Please select all required fields");
    return;
  }

  setIsLoading(true);

  try {
    const selectedService = selectedDoctorDetails?.services?.[0];
    const serviceId = selectedService?._id || selectedSpecializationId;
    const serviceFee = selectedService?.fee || 0;

    const appointmentPayload = {
      doctorId: selectedDoctor,
      patientId,
      date: selectedDate,
      slotId: selectedSlot,
      services: serviceId
        ? [serviceId]
        : selectedSpecializationId
        ? [selectedSpecializationId]
        : [],
      feeStatus: feeStatus,
      appointmentDate: selectedDate,
      fee: serviceFee,
      extra: {},
      discount: 0,
      discountInPercentage: 0,
    };

    const response = await bookAppointment(appointmentPayload).unwrap();

    if (response.isSuccess && response.data) {
      router.replace({
        pathname: "/appointments/AppointmentReciept",
        params: { appointmentId: response.data._id },
      });
    } else if (response.message === "Appointment already submitted") {
      Alert.alert(
        "Appointment Already Submitted",
        "Your appointment has already been submitted. Redirecting to your appointment receipt."
      );
      router.replace({
        pathname: "/appointments/AppointmentReciept",
        params: { appointmentId: response.data ? response.data._id : "" },
      });
    } else {
      Alert.alert("Error", response.message || "Failed to book appointment");
    }
    
  } catch (error) {
    Alert.alert("Error", "An error occurred while booking the appointment");
  } finally {
    setIsLoading(false);
  }
};
  
  
  const doctorProfilePic = selectedDoctorDetails?.photoUrl
    ? { uri: selectedDoctorDetails.photoUrl }
    : require("../../assets/images/defaultProfilePic.png");


  const allSpecializations = useMemo(() => {
    const specializationsFromAPI = specializationsData?.data?.map(
      (spec: Specialization) => spec.specializations
    ) || [];
    
    const specializationsFromDoctors = doctorsData?.data?.map(
      (doc: Doctor) => doc.specialization
    ) || [];
    
    return [...new Set([...specializationsFromAPI, ...specializationsFromDoctors])];
  }, [specializationsData?.data, doctorsData?.data]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[
          styles.header,
          { transform: [{ translateY: slideAnim }] }
        ]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
         <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Appointment</Text>
        </Animated.View>

        <Card style={styles.card}>
          {selectedDoctor && (
            <Animated.View 
              style={[
                styles.profileContainer,
                animate ? { transform: [{ scale: fadeAnim }] } : {}
              ]}
            >
              <View style={styles.profileImageContainer}>
                <Image
                  source={doctorProfilePic}
                  style={styles.profileImage}
                  resizeMode='cover'
                />
              </View>
              {selectedDoctorDetails && (
                <Text style={styles.doctorName}>{selectedDoctorDetails.fullName}</Text>
              )}
            </Animated.View>
          )}

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>1. Select Specialization</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSpecialization || ""}
                onValueChange={(value) => handleSpecializationChange(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                <Picker.Item label="Select Specialization" value="" color={COLORS.placeholder} />
                
                {allSpecializations.map((specialization) => (
                  <Picker.Item key={specialization} label={specialization} value={specialization} color={COLORS.textPrimary} />
                ))}
              </Picker>
            </View>

            {specializationDescription && (
              <Animated.View style={[styles.specializationDescriptionContainer, { opacity: fadeAnim }]}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.specializationDescription}>
                  {specializationDescription}
                </Text>
              </Animated.View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>2. Select Doctor</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDoctor || ""}
                onValueChange={(value) => handleDoctorChange(value)}
                enabled={!!filteredDoctors?.length}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                <Picker.Item label='Select Doctor' value='' color={COLORS.placeholder} />
                {filteredDoctors?.map((doctor: Doctor) => (
                  <Picker.Item
                    key={doctor._id}
                    label={doctor.fullName}
                    value={doctor._id}
                    color={COLORS.textPrimary}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>3. Select Date</Text>
            <TouchableOpacity
              onPress={() =>
                selectedDoctor
                  ? setShowDatePicker(true)
                  : Alert.alert(
                      "Select Doctor",
                      "Please select a doctor before choosing a date."
                    )
              }
              disabled={!selectedDoctor}
              style={styles.datePickerButton}
            >
              <Ionicons name="calendar-outline" size={22} color={selectedDoctor ? COLORS.primary : COLORS.placeholder} />
              <TextInput
                style={[
                  styles.dateInput,
                  !selectedDoctor && styles.disabledInput
                ]}
                value={selectedDate || ""}
                placeholder={
                  selectedDoctor
                    ? "Select Date"
                    : "Select a doctor first"
                }
                editable={false}
                placeholderTextColor={COLORS.placeholder}
              />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                mode="date"
                value={new Date()}
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()} 
              />
            )}

            {availableDates.length > 0 && (
              <View style={styles.availableDaysContainer}>
                <Text style={styles.availableDaysTitle}>Available Days:</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.daysScrollView}
                  contentContainerStyle={styles.daysScrollViewContent}
                >
                  {availableDates.map((date) => {
                    const dateObj = new Date(date);
                    const isCurrentDay = isToday(date);
                    const isSelected = selectedDate === date;
                    
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.dayButton,
                          isSelected && styles.selectedDayButton,
                          isCurrentDay && styles.todayButton
                        ]}
                        onPress={() => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          isSelected && styles.selectedDayText
                        ]}>
                          {dateObj.toLocaleString('default', { weekday: 'short' })}
                        </Text>
                        <Text style={[
                          styles.dateButtonText,
                          isSelected && styles.selectedDayText
                        ]}>
                          {dateObj.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>4. Select Time Slot</Text>
            
            {/* Time Slot Legend - Added here as per screenshot */}
            <View style={styles.slotLegendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: COLORS.textSecondary }]} />
                <Text style={styles.legendText}>Booked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: COLORS.success }]} />
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.legendText}>Expired</Text>
              </View>
            </View>
            
            <View style={styles.timeSlotContainer}>
              {selectedDoctor && selectedDate ? (
                timeSlotsData?.data?.length ? (
                  <Animated.View 
                    style={[
                      styles.rowContainer,
                      { opacity: fadeAnim }
                    ]}
                  >
                    {timeSlotsData?.data?.map((slot: TimeSlot) => {
                      const [timeFrom, timeTo] = slot.slot.split(" - ");
                      const isSelected = selectedSlot === slot.slotId;

                      const isPastSlot = isTimeSlotPassed(timeFrom);

                      const isAvailable = slot.status === 0 && !isPastSlot;
                      const isBooked = slot.status === 1;
                      const isExpired = slot.status === 2 || isPastSlot;

                      let slotStyle = {};
                      let textStyle = {};

                      if (isSelected) {
                        slotStyle = styles.selectedSlot;
                        textStyle = { color: COLORS.success };
                      } else if (isExpired) {
                        slotStyle = styles.expiredSlot;
                        textStyle = { color: COLORS.danger };
                      } else if (isBooked) {
                        slotStyle = styles.bookedSlot;
                        textStyle = { color: COLORS.textSecondary };
                      } else if (isAvailable) {
                        slotStyle = styles.availableSlot;
                        textStyle = { color: COLORS.primary };
                      }

                      return (
                        <View key={slot.slotId} style={styles.slotWrapper}>
                          <TouchableOpacity
                            onPress={() => {
                              if (isBooked || isExpired || isPastSlot) return;
                              setSelectedSlot(slot.slotId);
                            }}
                            style={[styles.slotButton, slotStyle]}
                            disabled={isBooked || isExpired || isPastSlot}
                          >
                            <Text style={[styles.slotText, textStyle]}>
                              {timeFrom} - {timeTo}
                            </Text>
                            {isPastSlot && (
                              <Text style={styles.expiredText}>Expired</Text>
                            )}
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} style={styles.slotIcon} />
                            )}
                            {isBooked && (
                              <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} style={styles.slotIcon} />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </Animated.View>
                ) : (
                  <View style={styles.noSlotsContainer}>
                    <Ionicons name="calendar-outline" size={40} color={COLORS.lightGray} />
                    <Text style={styles.noSlotsText}>No Slots Available</Text>
                  </View>
                )
              ) : (
                <View style={styles.noSlotsContainer}>
                  <Ionicons name="time-outline" size={40} color={COLORS.lightGray} />
                  <Text style={styles.noSlotsText}>
                    {selectedDoctor
                      ? "Please select a date to view available slots"
                      : "Please select a doctor and date to view available slots"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {selectedDoctorDetails?.services && selectedDoctorDetails.services.length > 0 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>5. Payment Details</Text>
              <View style={styles.feeContainer}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Consultation Fee:</Text>
                  <Text style={styles.feeAmount}>
                    RS {selectedDoctorDetails.services[0].fee}
                  </Text>
                </View>
                
                <Text style={styles.paymentLabel}>Payment Status:</Text>
                <View style={styles.paymentOptionsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.paymentOption, 
                      feeStatus === "unpaid" && styles.selectedPaymentOption
                    ]}
                    onPress={() => setFeeStatus("unpaid")}
                  >
                    <Ionicons
                      name={feeStatus === "unpaid" ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={feeStatus === "unpaid" ? COLORS.primary : COLORS.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[
                      styles.paymentOptionText,
                      feeStatus === "unpaid" && styles.selectedPaymentText
                    ]}>Pay at Clinic</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              (!selectedDoctor || !selectedDate || !selectedSlot || isLoading) &&
                styles.disabledButton,
            ]}
            onPress={handleConfirmBooking}
            disabled={!selectedDoctor || !selectedDate || !selectedSlot || isLoading}
          >
            {isLoading ? (
              <Animated.View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={{ marginRight: 10, transform: [{ rotate: spin }] }}>
                  <Ionicons name="reload-outline" size={20} color={COLORS.cardBackground} />
                </Animated.View>
                <Text style={styles.buttonText}>Processing...</Text>
              </Animated.View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.cardBackground} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Confirm Appointment</Text>
              </View>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </Animated.View>
  );
};
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: COLORS.textPrimary,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  disabledInput: {
    color: COLORS.placeholder,
  },
  availableDaysContainer: {
    marginTop: 16,
  },
  availableDaysTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  daysScrollView: {
    flexGrow: 0,
  },
  daysScrollViewContent: {
    paddingRight: 12,
  },
  dayButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    minWidth: 60,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  selectedDayButton: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  todayButton: {
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  selectedDayText: {
    color: COLORS.cardBackground,
  },
  timeSlotContainer: {
    marginTop: 8,
    minHeight: 150,
  },
  rowContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  slotWrapper: {
    margin: 4,
  },
  slotButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: 'dashed',  
    padding: 10,
    minWidth: 100,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSlot: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(76, 201, 240, 0.1)",
  },
  availableSlot: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(67, 97, 238, 0.05)",
  },
  bookedSlot: {
    borderColor: COLORS.textSecondary,
    backgroundColor: "rgba(108, 117, 125, 0.1)",
  },
  expiredSlot: {
    borderColor: COLORS.danger,
    backgroundColor: "rgba(249, 65, 68, 0.05)",
  },
  slotText: {
    fontSize: 14,
    textAlign: "center",
  },
  expiredText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  slotIcon: {
    marginTop: 4,
  },
  noSlotsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  noSlotsText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  feeContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  paymentOptionsContainer: {
    marginTop: 8,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 12,
    marginBottom: 8,
  },
  selectedPaymentOption: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(67, 97, 238, 0.05)",
  },
  paymentOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  selectedPaymentText: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: COLORS.placeholder,
  },
  buttonText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: "bold",
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  doctorName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  specializationDescriptionContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(67, 97, 238, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    alignItems: "flex-start",
  },
  specializationDescription: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  slotLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  
});

export default CreateAppointmentScreen;