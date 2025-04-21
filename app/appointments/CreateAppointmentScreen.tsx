"use client"

import { useState, useEffect, useMemo } from "react"
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
  Image,
  Modal,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Picker } from "@react-native-picker/picker"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Card } from "react-native-paper"
import {
  useGetAllDoctorsQuery,
  useGetAllSpecializationsQuery,
  useGetAllTimeSlotsQuery,
  useBookAppointmentMutation,
} from "../../redux/api/appointmentApi"
import { COLORS } from "@/constants/Colors"

interface Doctor {
  _id: string
  fullName: string
  specialization: string
  designationDetail?: string // Add this property
  availableDays: string[]
  photoUrl?: string
  weeklySchedule: {
    day: string
    timingScheedules: { timeFrom: string; timeTo: string }[]
  }[]
  services?: {
    _id: string
    serviceName: string
    fee: number
    hospitalChargesInPercentage: number
    extra: object
  }[]
}

interface Specialization {
  specializations: string
  details: string
  _id: string
}

interface TimeSlot {
  slotId: string
  slot: string
  status: number
}

interface Schedule {
  day: string
  timingScheedules: { timeFrom: string; timeTo: string }[]
}

const CreateAppointmentScreen = () => {
  const router = useRouter()
  const { patientId, patientName, mrn } = useLocalSearchParams<{
    patientId: string
    patientName: string
    mrn: string
  }>()

  const CURRENT_DATE = new Date()
  const TODAY_DATE_STRING = CURRENT_DATE.toISOString().split("T")[0]
  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"]
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(100))[0]
  const spinAnim = useState(new Animated.Value(0))[0]

  const { data: doctorsData } = useGetAllDoctorsQuery({})
  const { data: specializationsData } = useGetAllSpecializationsQuery({})
  const [bookAppointment] = useBookAppointmentMutation()

  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null)
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null)
  const [specializationDescription, setSpecializationDescription] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [feeStatus, setFeeStatus] = useState<"paid" | "unpaid">("unpaid")
  const [isLoading, setIsLoading] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [showDoctorSelection, setShowDoctorSelection] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const { data: timeSlotsData, refetch: fetchSlots } = useGetAllTimeSlotsQuery(
    selectedDoctor && selectedDate ? { doctorId: selectedDoctor, date: selectedDate } : undefined,
    { skip: !selectedDoctor || !selectedDate },
  )

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
    ]).start()
  }, [])

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start()
    } else {
      spinAnim.setValue(0)
    }
  }, [isLoading])

  useEffect(() => {
    if (selectedDoctor) {
      setAnimate(true)
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
      ]).start(() => setAnimate(false))
    }
  }, [selectedDoctor])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(intervalId)
  }, [])

  const filteredDoctors = useMemo(() => {
    return selectedSpecialization && selectedSpecialization !== ""
      ? doctorsData?.data.filter((doc: Doctor) => doc.specialization === selectedSpecialization)
      : doctorsData?.data
  }, [selectedSpecialization, doctorsData?.data])

  const selectedDoctorDetails = useMemo(() => {
    return doctorsData?.data?.find((doc: Doctor) => doc._id === selectedDoctor)
  }, [selectedDoctor, doctorsData?.data])

  const selectedSpecializationId = useMemo(() => {
    if (!selectedSpecialization || !specializationsData?.data) return null
    const specObj = specializationsData?.data.find((s: Specialization) => s.specializations === selectedSpecialization)
    return specObj?._id || null
  }, [selectedSpecialization, specializationsData?.data])

  const getStandardizedDayName = (date: Date): string => {
    return date.toLocaleString("en-US", { weekday: "long" }).toLowerCase()
  }

  const getShortDayName = (dayName: string): string => {
    const dayMap: Record<string, string> = {
      sunday: "Sun",
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thur",
      friday: "Fri",
      saturday: "Sat",
    }
    return dayMap[dayName.toLowerCase()] || dayName
  }

  const isToday = (dateString: string): boolean => {
    return dateString === TODAY_DATE_STRING
  }

  const isPastDate = (dateString: string): boolean => {
    const inputDate = new Date(dateString)
    inputDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return inputDate < today
  }

  const calculateAvailableDates = (doctor: Doctor) => {
    if (!doctor || !doctor.weeklySchedule) return []
    const today = new Date()
    const available: string[] = []
    const availableDaysMap = new Map()
    doctor.weeklySchedule.forEach((schedule: Schedule) => {
      if (schedule.timingScheedules && schedule.timingScheedules.length > 0) {
        availableDaysMap.set(schedule.day.toLowerCase(), schedule.timingScheedules)
      }
    })
    if (availableDaysMap.size === 0) return []
    for (let i = 0; i < 30; i++) {
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + i)
      if (futureDate < today && i > 0) continue
      const dayName = getStandardizedDayName(futureDate)
      const dateString = futureDate.toISOString().split("T")[0]
      if (availableDaysMap.has(dayName)) {
        available.push(dateString)
      }
    }
    return available
  }

  const handleSpecializationChange = (spec: string | null) => {
    setSelectedSpecialization(spec)
    if (!spec || spec === "") {
      setSpecializationDescription(null)
      setSelectedDoctor(null)
      setSelectedDate(null)
      setSelectedSlot(null)
      setAvailableDates([])
    } else {
      const foundSpecialization = specializationsData?.data.find((s: Specialization) => s.specializations === spec)
      setSpecializationDescription(foundSpecialization?.details || "")
      setSelectedDoctor(null)
      setSelectedDate(null)
      setSelectedSlot(null)
      setAvailableDates([])
    }
  }

  const handleDoctorChange = (doctorId: string | null) => {
    setSelectedDoctor(doctorId)
    setSelectedSlot(null)
    setSelectedDate(null)
    if (!doctorId) {
      setAvailableDates([])
      setShowDoctorSelection(true)
      return
    }
    const doctorDetails = doctorsData?.data.find((doc: Doctor) => doc._id === doctorId)
    if (!doctorDetails) {
      setAvailableDates([])
      return
    }
    const availableDays = calculateAvailableDates(doctorDetails)
    setAvailableDates(availableDays)
    if (availableDays.length > 0) {
      setSelectedDate(availableDays[0])
    }
    setShowDoctorSelection(false)
  }

  const handleBackToDoctorSelection = () => {
    setShowDoctorSelection(true)
    setSelectedDoctor(null)
    setSelectedDate(null)
    setSelectedSlot(null)
    setAvailableDates([])
  }

  const isDateAvailable = (date: Date): boolean => {
    if (!selectedDoctorDetails || !selectedDoctorDetails.weeklySchedule) return false
    const dayName = getStandardizedDayName(date)
    return selectedDoctorDetails.weeklySchedule.some(
      (schedule: Schedule) =>
        schedule.day.toLowerCase() === dayName && schedule.timingScheedules && schedule.timingScheedules.length > 0,
    )
  }

  const filterAvailableDates = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return false
    const futureLimit = new Date()
    futureLimit.setDate(today.getDate() + 30)
    if (date > futureLimit) return false
    return isDateAvailable(date)
  }

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchSlots()
    }
  }, [selectedDoctor, selectedDate, fetchSlots])

  const handleDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false)
    if (!date) return
    const formattedDate = date.toISOString().split("T")[0]
    if (isPastDate(formattedDate)) {
      Alert.alert("Invalid Date", "Please select a current or future date.")
      return
    }
    if (!isDateAvailable(date)) {
      Alert.alert("Doctor Unavailable", "This doctor is not available on the selected date.")
      return
    }
    setSelectedDate(formattedDate)
    setSelectedSlot(null)
  }

  const parseTimeString = (timeStr: string) => {
    const timeRegex = /(\d+):(\d+)(?:\s*(AM|PM))?/i
    const match = timeStr.match(timeRegex)
    if (match) {
      let hours = Number.parseInt(match[1])
      const minutes = Number.parseInt(match[2])
      const period = match[3]?.toUpperCase()
      if (period === "PM" && hours < 12) hours += 12
      if (period === "AM" && hours === 12) hours = 0
      return { hours, minutes }
    }
    return null
  }

  const isTimeSlotPassed = (timeFromStr: string) => {
    if (!selectedDate || !isToday(selectedDate)) return false
    const parsedTime = parseTimeString(timeFromStr)
    if (!parsedTime) return false
    const { hours, minutes } = parsedTime
    const slotTime = new Date()
    slotTime.setHours(hours, minutes, 0, 0)
    return currentTime > slotTime
  }

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot || !patientId) {
      Alert.alert("Incomplete Information", "Please select all required fields")
      return
    }
    setShowConfirmModal(true)
  }

  const handleModalConfirm = async () => {
    setShowConfirmModal(false)
    setIsLoading(true)
    try {
      const selectedService = selectedDoctorDetails?.services?.[0]
      const serviceId = selectedService?._id || selectedSpecializationId
      const serviceFee = selectedService?.fee || 0
      const appointmentPayload = {
        doctorId: selectedDoctor,
        patientId,
        date: selectedDate,
        slotId: selectedSlot,
        services: serviceId ? [serviceId] : selectedSpecializationId ? [selectedSpecializationId] : [],
        feeStatus: feeStatus,
        appointmentDate: selectedDate,
        fee: serviceFee + 100, // Adding the additional Rs. 100 fee
        extra: {},
        discount: 0,
        discountInPercentage: 0,
      }
      const response = await bookAppointment(appointmentPayload).unwrap()
      if (response.isSuccess && response.data) {
        router.replace({
          pathname: "/appointments/AppointmentReciept",
          params: { appointmentId: response.data._id },
        })
      } else if (response.message === "Appointment already submitted") {
        Alert.alert(
          "Appointment Already Submitted",
          "Your appointment has already been submitted. Redirecting to your appointment receipt.",
        )
        router.replace({
          pathname: "/appointments/AppointmentReciept",
          params: { appointmentId: response.data ? response.data._id : "" },
        })
      } else {
        Alert.alert("Error", response.message || "Failed to book appointment")
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while booking the appointment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleModalCancel = () => {
    setShowConfirmModal(false)
  }

  const doctorProfilePic = selectedDoctorDetails?.photoUrl
    ? { uri: selectedDoctorDetails.photoUrl }
    : require("../../assets/images/defaultProfilePic.png")

  const allSpecializations = useMemo(() => {
    const specializationsFromAPI = specializationsData?.data?.map((spec: Specialization) => spec.specializations) || []
    const specializationsFromDoctors = doctorsData?.data?.map((doc: Doctor) => doc.specialization) || []
    return ["All", ...new Set([...specializationsFromAPI, ...specializationsFromDoctors])]
  }, [specializationsData?.data, doctorsData?.data])

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Appointment</Text>
        </Animated.View>

        <Card style={styles.card}>
          {!showDoctorSelection && (
            <View style={styles.backContainer}>
              <TouchableOpacity onPress={handleBackToDoctorSelection} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                <Text style={styles.backText}>Back to Doctor Selection</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.topSection}>
            <View style={styles.patientInfoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{patientName || "N/A"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MRN:</Text>
                <Text style={styles.infoValue}>{mrn || "N/A"}</Text>
              </View>
              <View style={styles.dateContainer}>
                <View style={styles.calendarIcon}>
                  <Ionicons name="calendar" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={styles.dateLabel}>Date:</Text>
                  <Text style={styles.dateValue}>
                    {`${months[CURRENT_DATE.getMonth()]} ${CURRENT_DATE.getDate()}, ${CURRENT_DATE.getFullYear()}, ${
                      days[CURRENT_DATE.getDay()]
                    }`}
                  </Text>
                </View>
              </View>
            </View>
            {showDoctorSelection && (
              <View style={styles.specializationContainer}>
                <Picker
                  selectedValue={selectedSpecialization || "All"}
                  onValueChange={(itemValue) => handleSpecializationChange(itemValue === "All" ? null : itemValue)}
                  style={styles.picker}
                >
                  {allSpecializations.map((specialization) => (
                    <Picker.Item key={specialization} label={specialization} value={specialization} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {showDoctorSelection && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Select Doctor</Text>
              <View style={styles.doctorsContainer}>
                {filteredDoctors?.length ? (
                  filteredDoctors.map((doctor: Doctor) => (
                    <View key={doctor._id} style={styles.doctorCard}>
                      <View style={styles.cardTopSection}>
                        <View style={styles.doctorImageContainer}>
                          <Image
                            source={
                              doctor.photoUrl
                                ? { uri: doctor.photoUrl }
                                : require("../../assets/images/defaultProfilePic.png")
                            }
                            style={styles.doctorImage}
                          />
                        </View>
                        <View style={styles.doctorInfo}>
                          <Text style={styles.doctorName}>{doctor.fullName}</Text>
                          <Text style={styles.doctorSpecialty}>{doctor.specialization}</Text>
                          <Text style={styles.doctorDescription}>
                            {doctor.designationDetail || "Provides healthcare for infants, children, and adolescents."}
                          </Text>
                        </View>
                        <View style={styles.selectButtonContainer}>
                          <TouchableOpacity style={styles.selectButton} onPress={() => handleDoctorChange(doctor._id)}>
                            <Text style={styles.selectButtonText}>Select</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Availability section moved to bottom with separator */}
                      <View style={styles.availabilityFooter}>
                        <Text style={styles.availabilityLabel}>
                          Available:{" "}
                          <Text style={styles.availabilityDays}>
                            {doctor.availableDays?.length
                              ? doctor.availableDays.map((day) => getShortDayName(day)).join(", ")
                              : "Contact clinic for availability"}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.noDataContainer}>
                    <Ionicons name="medical" size={40} color={COLORS.lightGray} />
                    <Text style={styles.noDataText}>
                      {selectedSpecialization
                        ? "No doctors available for this specialization"
                        : "Please select a specialization first"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {!showDoctorSelection && (
            <>
              <View style={styles.formSection}>
                <Text style={styles.doctorSelectedName}>Doctor: {selectedDoctorDetails?.fullName}</Text>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                  <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
                  <TextInput
                    style={styles.dateInput}
                    value={selectedDate || ""}
                    placeholder="Select Date"
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
                    <Text style={styles.availableDaysTitle}>Select Date:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.daysScrollView}
                      contentContainerStyle={styles.daysScrollViewContent}
                    >
                      {availableDates.map((date) => {
                        const dateObj = new Date(date)
                        const isCurrentDay = isToday(date)
                        const isSelected = selectedDate === date
                        return (
                          <TouchableOpacity
                            key={date}
                            style={[
                              styles.dayButton,
                              isSelected && styles.selectedDayButton,
                              isCurrentDay && styles.todayButton,
                            ]}
                            onPress={() => {
                              setSelectedDate(date)
                              setSelectedSlot(null)
                            }}
                          >
                            <Text style={[styles.dayButtonText, isSelected && styles.selectedDayText]}>
                              {dateObj.toLocaleString("default", { weekday: "short" })}
                            </Text>
                            <Text style={[styles.dateButtonText, isSelected && styles.selectedDayText]}>
                              {dateObj.getDate()}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Select Time Slot</Text>
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
                      <Animated.View style={[styles.rowContainer, { opacity: fadeAnim }]}>
                        {timeSlotsData?.data?.map((slot: TimeSlot) => {
                          const [timeFrom, timeTo] = slot.slot.split(" - ")
                          const isSelected = selectedSlot === slot.slotId
                          const isPastSlot = isTimeSlotPassed(timeFrom)
                          const isAvailable = slot.status === 0 && !isPastSlot
                          const isBooked = slot.status === 1
                          const isExpired = slot.status === 2 || isPastSlot
                          let slotStyle = {}
                          let textStyle = {}
                          if (isSelected) {
                            slotStyle = styles.selectedSlot
                            textStyle = { color: COLORS.success }
                          } else if (isExpired) {
                            slotStyle = styles.expiredSlot
                            textStyle = { color: COLORS.danger }
                          } else if (isBooked) {
                            slotStyle = styles.bookedSlot
                            textStyle = { color: COLORS.textSecondary }
                          } else if (isAvailable) {
                            slotStyle = styles.availableSlot
                            textStyle = { color: COLORS.primary }
                          }
                          return (
                            <View key={slot.slotId} style={styles.slotWrapper}>
                              <TouchableOpacity
                                onPress={() => {
                                  if (isBooked || isExpired || isPastSlot) return
                                  setSelectedSlot(slot.slotId)
                                }}
                                style={[styles.slotButton, slotStyle]}
                                disabled={isBooked || isExpired || isPastSlot}
                              >
                                <Text style={[styles.slotText, textStyle]}>
                                  {timeFrom} - {timeTo}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )
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
                      <Text style={styles.noSlotsText}>Please select a date to view available slots</Text>
                    </View>
                  )}
                </View>
              </View>

              {selectedDoctorDetails?.services && selectedDoctorDetails.services.length > 0 && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Payment Details</Text>
                  <View style={styles.feeContainer}>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Consultation Fee:</Text>
                      <Text style={styles.feeAmount}>RS {selectedDoctorDetails.services[0].fee}</Text>
                    </View>
                    <Text style={styles.paymentLabel}>Payment Status:</Text>
                    <View style={styles.paymentOptionsContainer}>
                      <TouchableOpacity
                        style={[styles.paymentOption, feeStatus === "unpaid" && styles.selectedPaymentOption]}
                        onPress={() => setFeeStatus("unpaid")}
                      >
                        <Ionicons
                          name={feeStatus === "unpaid" ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={feeStatus === "unpaid" ? COLORS.primary : COLORS.textSecondary}
                          style={styles.paymentIcon}
                        />
                        <Text style={[styles.paymentOptionText, feeStatus === "unpaid" && styles.selectedPaymentText]}>
                          Pay at Clinic
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  (!selectedDoctor || !selectedDate || !selectedSlot || isLoading) && styles.disabledButton,
                ]}
                onPress={handleConfirmBooking}
                disabled={!selectedDoctor || !selectedDate || !selectedSlot || isLoading}
              >
                {isLoading ? (
                  <Animated.View style={styles.buttonContent}>
                    <Animated.View style={[styles.buttonIcon, { transform: [{ rotate: spin }] }]}>
                      <Ionicons name="reload-outline" size={20} color={COLORS.cardBackground} />
                    </Animated.View>
                    <Text style={styles.buttonText}>Processing...</Text>
                  </Animated.View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={COLORS.cardBackground}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Confirm Appointment</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </Card>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="help-circle-outline" size={24} color="#0099ff" style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Confirm Appointment</Text>
            </View>
            <Text style={styles.modalMessage}>
              PLEASE NOTE THAT AN ADDITIONAL FEE OF Rs.100 WILL APPLY FOR SCHEDULING AN APPOINTMENT ONLINE. WOULD YOU
              LIKE TO PROCEED?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleModalCancel}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleModalConfirm}>
                <Text style={styles.modalConfirmText}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: COLORS.background,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backContainer: {
    marginBottom: 20,
  },
  backText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 12,
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  patientInfoContainer: {
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  calendarIcon: {
    backgroundColor: "#0099ff",
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  dateValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  specializationContainer: {
    width: "35%",
  },
  picker: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    color: COLORS.textPrimary,
    height: 40,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: COLORS.textPrimary,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  doctorSelectedName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopSection: {
    flexDirection: "row",
    marginBottom: 8,
  },
  doctorImageContainer: {
    marginRight: 12,
  },
  doctorsContainer: {
    flexDirection: "column",
    marginTop: 16,
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  doctorInfo: {
    flex: 1,
    justifyContent: "center",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  doctorDescription: {
    fontSize: 13,
    color: "#000000",
  },
  selectButtonContainer: {
    marginLeft: 8,
    justifyContent: "center",
  },
  selectButton: {
    backgroundColor: "#0099ff",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  availabilityFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    paddingTop: 8,
    marginTop: 4,
  },
  availabilityLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },
  availabilityDays: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "400",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    marginTop: 12,
  },
  availableDaysTitle: {
    fontSize: 14,
    fontWeight: "500",
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
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  selectedDayText: {
    color: COLORS.cardBackground,
  },
  timeSlotContainer: {
    marginTop: 8,
    minHeight: 120,
  },
  rowContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  slotWrapper: {
    margin: 4,
    width: "48%",
  },
  slotButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: "dashed",
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noSlotsText: {
    marginTop: 8,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  feeContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  feeAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  paymentOptionsContainer: {
    marginTop: 4,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 12,
  },
  selectedPaymentOption: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(67, 97, 238, 0.05)",
  },
  paymentIcon: {
    marginRight: 8,
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
    marginTop: 12,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: COLORS.placeholder,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: "600",
  },
  slotLegendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    padding: 20,
    width: "80%",
    maxWidth: 350,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modalIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0099ff",
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  modalConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0099ff",
    textTransform: "uppercase",
  },
})

export default CreateAppointmentScreen
