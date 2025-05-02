import React, { useState, useCallback, useRef, useEffect } from "react";
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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
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
import axios from "axios";
import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper function to format date
const formatDate = (dateString: string): string => {
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

// Helper function to wrap long strings
const wrapString = (input: string, maxLength: number): string => {
  if (!input) return "";
  if (input.length > maxLength) {
    return `${input.slice(0, maxLength)}...`;
  }
  return input;
};

// Helper function to capitalize names
const capitalizeName = (name: string): string => {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

// Generate fallback QR code using Google Charts API
const generateQRCode = (url: string): string => {
  return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(url)}`;
};

// Helper function to get default QR data
const getDefaultQrData = (appointment: any, userData?: any) => {
  return {
    mrn: appointment?.patientId?.mrn || "N/A",
    patientName: appointment?.patientId?.patientName || "Unknown",
    phonNumber: appointment?.patientId?.phonNumber || "N/A",
    visitId: appointment?._id || "N/A",
    tokenId: appointment?._id?.slice(0, 8) || "N/A",

    visitNo: "N/A",
    appointmentDate: formatDate(appointment?.appointmentDate) || "N/A",
    appointmentTime: { from: appointment?.slot?.split(" - ")[0] || "N/A" },
    doctorName: appointment?.doctor?.fullName || "N/A",
    feeStatus: appointment?.feeStatus || "pending",
    bookedServices: Array.isArray(appointment?.bookedServices) ? appointment.bookedServices : [],
    discount: appointment?.discount || 0,
    hospitalName: userData?.hospital?.hospitalName || "Your Hospital Name",
    hospitalPhone: userData?.hospital?.phoneNo || "N/A",
  };
};

const fetchQrData = async (id: string, userData: User | null) => {
  try {
    const token = userData?.token;
    if (!token) {
      Alert.alert("Error", "Authentication token not found");
      return null;
    }

    const response = await axios.post(
      `${API_BASE_URL}/online-appointment/generateToken/${id}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Token generation response:", response.data);
    
    if (response.data.isSuccess) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to generate token");
    }
  } catch (error) {
    console.error("Error generating token:", error);
    Alert.alert("Error", "Failed to generate token");
    return null;
  }
};

// Helper function to fetch prescription data
const fetchPrescriptionData = async (appointmentId: string, userData: User | null) => {
  try {
    const token = userData?.token;
    if (!token) {
      Alert.alert("Error", "Authentication token not found");
      return null;
    }

    const response = await axios.get(
      `${API_BASE_URL}/online-appointment/getPrescripByAppointmentId/${appointmentId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Prescription data response:", response.data);
    
    if (response.data.isSuccess) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch prescription");
    }
  } catch (error) {
    console.error("Error fetching prescription:", error);
    Alert.alert("Error", "Failed to fetch prescription data");
    return null;
  }
};

// Helper function to calculate total fee from services
const calculateTotalFee = (services: any[] | undefined): number => {
  if (!Array.isArray(services)) return 0;
  return services.reduce((total, service) => total + (service?.fee || 0), 0);
};

// Helper function to calculate age from date of birth
const calculateAge = (dob: string): string => {
  if (!dob) return "N/A";
  
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  } catch (e) {
    return "N/A";
  }
};

// Dashboard Screen Component
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
  slot: string;
  feeStatus: string;
  bookedServices?: { serviceName: string; fee: number }[];
  discount?: number;
}

interface ItemAnimation {
  fadeAnim: Animated.Value;
  translateY: Animated.Value;
}

interface User {
  fullName: string;
  token?: string;
  hospital?: { hospitalName: string; phoneNo: string; address?: string; logoUrl?: string };
}

const DashboardScreen = () => {
  const router = useRouter();
  const user = useSelector(selectUser) as User | null;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [instructionsVisible, setInstructionsVisible] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  const itemAnimations = useRef(new Map<string, ItemAnimation>()).current;

  const { data: appointmentsData, refetch, isLoading } = useGetAllAppointmentsQuery(
    { search: searchQuery || "" }
  );
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
        }),
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
              useNativeDriver: true,
            }),
            Animated.timing(animations.translateY, {
              toValue: 0,
              duration: 300,
              delay,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
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
    outputRange: ["0deg", "360deg"],
  });

  const animateRefresh = (): void => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true,
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
                cancel_reason: reason,
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
        timeSlotId: appointment.timeSlotId,
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
      params: { appointmentId },
    });
  };

  const handleViewPrescription = async (appointmentId: string) => {
    try {
      // Fetch prescription data
      const prescriptionData = await fetchPrescriptionData(appointmentId, user);
      
      if (!prescriptionData) {
        Alert.alert("Info", "No prescription found for this appointment");
        return;
      }
      
      // Find the appointment data
      const appointment = appointmentsData?.data?.find(item => item._id === appointmentId);
      
      if (!appointment) {
        Alert.alert("Error", "Appointment data not found");
        return;
      }
      
      // Generate PDF with the prescription data
      await generatePrescriptionPDF(prescriptionData, appointment);
    } catch (error) {
      console.error("Error viewing prescription:", error);
      Alert.alert("Error", "Failed to load prescription");
    }
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
      const timeRegex = /(\d+):(\d+)(?:\s*(AM|PM))?/i;
      const match = timeStr.match(timeRegex);

      if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3]?.toUpperCase();

        if (period === "PM" && hours < 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        const appointmentTime = new Date();
        appointmentTime.setHours(hours, minutes, 0, 0);

        return new Date() > appointmentTime;
      }
    }

    return false;
  };

  const onRefresh = (): void => {
    refetchAppointments();
  };

  const onGeneratePDF = async (appointment: any) => {
    try {
      // Get appointment ID
      const appointmentId = appointment._id;
      if (!appointmentId) {
        Alert.alert("Error", "Invalid appointment ID");
        return;
      }
      
      // First check if prescription is available for this appointment
      const prescriptionData = appointment.isPrescriptionCreated ? 
        await fetchPrescriptionData(appointmentId, user) : null;
      
      // If prescription data is available, use it for PDF generation, otherwise fetch token data
      if (prescriptionData) {
        await generatePrescriptionPDF(prescriptionData, appointment);
      } else {
        // Fetch token data and generate regular token PDF
        const tokenData = await fetchQrData(appointmentId, user);
        
        if (!tokenData) {
          return; // Error already handled in fetchQrData
        }
        
        await generateTokenPDF(tokenData);
      }
    } catch (error) {
      console.error("PDF Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      Alert.alert("Error", `Failed to generate PDF: ${errorMessage}`);
    }
  };

  const generatePrescriptionPDF = async (prescriptionData: any, appointment: any) => {
    try {
      // Generate QR code URL using Google Charts API
      const qrCodeUrl = `https://pakhims.com/?MRN=${encodeURIComponent(prescriptionData.patientData?.[0]?.mrn || "")}&visitId=${encodeURIComponent(appointment._id)}`;
      const qrCodeDataUrl = generateQRCode(qrCodeUrl);
      
      // Get patient data
      const patient = prescriptionData.patientData?.[0] || {};
      
      // Get header and footer URLs
      const headerUrl = prescriptionData.headerUrl || "";
      const footerUrl = prescriptionData.footerUrl || "";
      const signature = prescriptionData.signature || "";
      const stamp = prescriptionData.stamp || "";
      
      // Set visit number
      const visitNo = prescriptionData.visit_no || 1;
      
      // Generate HTML content for PDF with header and footer images
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; font-size: 8px; width: 210mm; }
              .header-image { width: 100%; max-height: 80px; object-fit: contain; }
              .footer-image { width: 100%; max-height: 50px; object-fit: contain; margin-top: 10px; }
              .container { padding: 10px; position: relative; }
              .patient-info { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
              .info-row { display: flex; margin-bottom: 5px; }
              .info-label { font-weight: bold; width: 120px; }
              .qr-code { text-align: center; margin-top: 20px; }
              .signature-section { display: flex; justify-content: flex-end; margin-top: 20px; text-align: center; }
              .signature-image { max-width: 150px; max-height: 60px; }
              .stamp-image { max-width: 100px; max-height: 100px; margin-left: 20px; }
            </style>
          </head>
          <body>
            ${headerUrl ? `<img src="${headerUrl}" class="header-image" />` : ''}
            <div class="container">
              <div class="patient-info">
                <div class="info-row">
                  <span class="info-label">Patient Name:</span>
                  <span>${patient.patientName || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">MRN:</span>
                  <span>${patient.mrn || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Gender/Age:</span>
                  <span>${patient.gender || "N/A"} / ${calculateAge(patient.dob) || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span>${patient.phonNumber || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Visit Number:</span>
                  <span>${visitNo}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Date:</span>
                  <span>${formatDate(new Date().toISOString())}</span>
                </div>
              </div>
              
              <h2>Prescription</h2>
              <p>This is a summary of your visit. Please follow the instructions provided by your doctor.</p>
              
              <div class="signature-section">
                ${signature ? `<img src="${signature}" class="signature-image" />` : ''}
                ${stamp ? `<img src="${stamp}" class="stamp-image" />` : ''}
              </div>
              
              <div class="qr-code">
                <img src="${qrCodeDataUrl}" width="80px" height="80px" />
                <p>Scan to view digital record</p>
              </div>
            </div>
            ${footerUrl ? `<img src="${footerUrl}" class="footer-image" />` : ''}
          </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 210 * 2.83465, // A4 width in points
        height: 297 * 2.83465, // A4 height in points
      });

      // Save/share the PDF
      const fileName = `Prescription_${patient.mrn || "unknown"}.pdf`;
      showPDFOptions(uri, fileName);
    } catch (error) {
      console.error("Prescription PDF Generation Error:", error);
      throw error;
    }
  };

  const generateTokenPDF = async (tokenData: any) => {
    try {
      // Generate QR code URL using Google Charts API
      const qrCodeUrl = `https://pakhims.com/?MRN=${encodeURIComponent(tokenData.mrn)}&visitId=${encodeURIComponent(tokenData.visitId)}`;
      const qrCodeDataUrl = generateQRCode(qrCodeUrl);
      
      // Calculate dynamic height for services
      let additionalHeight = 0;
      const bookedServices = Array.isArray(tokenData.bookedServices) ? tokenData.bookedServices : [];
      
      bookedServices.forEach((item: any) => {
        if (!item || !item.serviceName) return;
        const serviceNameLines =
          item.serviceName.length / 30 > 1
            ? Math.ceil(item.serviceName.length / 30)
            : 1;
        additionalHeight += (serviceNameLines - 1) * 5;
      });
      
      const heightPaper = 92 + (bookedServices.length * 5) + additionalHeight;

      // Get hospital info
      const hospitalName = user?.hospital?.hospitalName || "Your Hospital";
      const hospitalPhone = user?.hospital?.phoneNo || tokenData.hospitalPhone || "N/A";
      const hospitalAddress = user?.hospital?.address || tokenData.hospitalAddress || "Hospital Address";
      const hospitalLogo = user?.hospital?.logoUrl || "";

      // Generate HTML content for PDF with improved header/footer
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; font-size: 8px; width: 80mm; }
              .header { background-color: #000; color: #fff; text-align: center; padding: 8px 5px; }
              .header-logo { max-height: 30px; margin-bottom: 3px; }
              .container { padding: 5px; position: relative; }
              .row { margin-bottom: 5px; }
              .bold { font-weight: bold; }
              .qr-code { margin-top: 10px; text-align: center; }
              .table { width: 100%; margin-top: 5px; }
              .table div { display: flex; justify-content: space-between; padding: 3px; }
              .table-header { border-bottom: 1px solid #000; font-weight: bold; }
              .table-row { border-bottom: 1px solid #000; }
              .table-footer { border-top: 1px solid #000; font-weight: bold; }
              .line { border-bottom: 1px solid #000; margin: 5px 0; }
              .footer { margin-top: 10px; text-align: center; font-size: 7px; padding-top: 5px; border-top: 1px dashed #000; }
              .paid { color: #bbb; font-size: 50px; text-align: center; transform: rotate(45deg); position: absolute; top: ${heightPaper / 1.5}mm; left: 30mm; opacity: 0.5; }
              .rect { border: 1px solid #000; padding: 4px; margin: 5px 0; width: 75mm; }
              .token { position: absolute; right: 5px; top: 15px; text-align: center; }
              .contact-info { text-align: center; font-size: 7px; margin: 3px 0; }
              .total-row { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              ${hospitalLogo ? `<img src="${hospitalLogo}" class="header-logo" alt="Hospital Logo" /><br/>` : ''}
              <div style="font-size: 10px; font-weight: bold;">${hospitalName}</div>
              <div class="contact-info">${hospitalAddress}</div>
              <div class="contact-info">Phone: ${hospitalPhone}</div>
            </div>
            <div class="container">
              ${
                tokenData.feeStatus === "paid"
                  ? `<div class="paid">PAID</div>`
                  : tokenData.feeStatus === "insurance"
                  ? `<div class="paid">INSURANCE</div>`
                  : ""
              }
              <div class="token">
                <div style="font-size: 10px; font-weight: bold;">Token</div>
                <div style="font-size: 17px;"># ${tokenData.tokenId || "N/A"}</div>
              </div>
              <div class="row" style="margin-top: 10px;">
                <span class="bold" style="margin-left: 2mm;">MRN #:</span>
                <span style="margin-left: 13mm;">${tokenData.mrn || "N/A"}</span>
              </div>
              <div class="rect">
                <div class="row" style="font-size: 9.5px;">
                  <span class="bold" style="margin-left: 3mm;">Name:</span>
                  <span style="margin-left: 35mm;">${wrapString(capitalizeName(tokenData.patientName || ""), 17)}</span>
                </div>
                <div class="row">
                  <span class="bold" style="margin-left: 3mm;">Phone #:</span>
                  <span style="margin-left: 35mm;">${tokenData.phonNumber || "N/A"}</span>
                </div>
                <div class="row">
                  <span class="bold" style="margin-left: 3mm;">Date & Time:</span>
                  <span style="margin-left: 35mm;">${formatDate(tokenData.appointmentDate) || "N/A"}</span>
                  <span style="margin-left: 57mm;">${tokenData.appointmentTime?.from || "N/A"}</span>
                </div>
                <div class="row">
                  <span class="bold" style="margin-left: 3mm;">Dr. Name:</span>
                  <span style="margin-left: 35mm;">${wrapString(capitalizeName(tokenData.doctorName || ""), 17)}</span>
                </div>
                <div class="row">
                  <span class="bold" style="margin-left: 3mm;">Visit ID:</span>
                  <span style="margin-left: 35mm;">${tokenData.visitId || "N/A"}</span>
                </div>
              </div>
              <div class="table">
                <div class="table-header">
                  <span style="margin-left: 2mm;">Services</span>
                  <span style="margin-right: 2mm;">Charges</span>
                </div>
                ${
                  Array.isArray(tokenData.bookedServices) && tokenData.bookedServices.length > 0
                    ? tokenData.bookedServices
                        .map((item: any) => {
                          if (!item || !item.serviceName) return '';
                          const serviceNameLines =
                            item.serviceName?.match(/.{1,30}/g) || ["N/A"];
                          return serviceNameLines
                            .map(
                              (line: string, index: number) => `
                                <div class="table-row">
                                  <span style="margin-left: 2mm;">${line || ""}</span>
                                  ${
                                    index === 0
                                      ? `<span style="margin-right: 2mm;">${item.fee || 0}/-</span>`
                                      : "<span></span>"
                                  }
                                </div>
                              `
                            )
                            .join("");
                        })
                        .join("")
                    : '<div class="table-row"><span style="margin-left: 2mm;">No services booked</span><span></span></div>'
                }
                <div class="table-footer">
                  <span style="margin-left: 2mm;">Total Fee:</span>
                  <span style="margin-right: 2mm;">${tokenData.totalFee || calculateTotalFee(tokenData.bookedServices) || 0}/-</span>
                </div>
                ${tokenData.discount > 0 ? `
                  <div class="table-row">
                    <span style="margin-left: 2mm;">Discount:</span>
                    <span style="margin-right: 2mm;">${tokenData.discount || 0}/-</span>
                  </div>
                  <div class="total-row">
                    <span style="margin-left: 2mm;">Net Payable:</span>
                    <span style="margin-right: 2mm;">${(tokenData.totalFee || calculateTotalFee(tokenData.bookedServices) || 0) - (tokenData.discount || 0)}/-</span>
                  </div>
                ` : ''}
              </div>
              <div class="row" style="margin-top: 5px;">
                <span class="bold" style="margin-left: 2mm;">Fee Status:</span>
                <span style="margin-left: 15mm; text-transform: uppercase;">${tokenData.feeStatus || "pending"}</span>
              </div>
              <div class="line"></div>
              <div class="qr-code">
                <img src="${qrCodeDataUrl}" width="20mm" height="20mm" />
                <div style="font-size: 7px; margin-top: 3px;">Scan to view digital record</div>
              </div>
              <div class="footer">
                <div>Software Powered by PakHIMS - Hospital Information Management System</div>
                <div>© ${new Date().getFullYear()} Cure Logics, Rahim Yar Khan</div>
                <div>www.pakhims.com | support@pakhims.com</div>
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

      // Save/share the PDF
      const fileName = `Token_${tokenData.tokenId || tokenData.visitId || "unknown"}.pdf`;
      showPDFOptions(uri, fileName);
    } catch (error) {
      console.error("Token PDF Generation Error:", error);
      throw error;
    }
  };

  const showPDFOptions = (uri: string, fileName: string) => {
    Alert.alert(
      "PDF Generated",
      "What would you like to do with the PDF?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(uri, { idempotent: true });
            } catch (error) {
              console.warn("Failed to delete temporary file:", error);
            }
          },
        },
        {
          text: "Share",
          onPress: async () => {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri, {
                mimeType: "application/pdf",
                dialogTitle: "Share PDF",
              });
            } else {
              Alert.alert("Error", "Sharing not available on this device.");
            }
            try {
              await FileSystem.deleteAsync(uri, { idempotent: true });
            } catch (error) {
              console.warn("Failed to delete temporary file:", error);
            }
          },
        },
        {
          text: "Save",
          onPress: async () => {
            let fileUri = "";
            if (Platform.OS === "android") {
              try {
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                  const base64 = await FileSystem.readAsStringAsync(uri, {
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
                  Alert.alert("Success", `PDF saved to selected location: ${fileName}`);
                } else {
                  Alert.alert("Error", "Storage access permission denied.");
                  fileUri = `${FileSystem.documentDirectory}${fileName}`;
                  await FileSystem.moveAsync({ from: uri, to: fileUri });
                  Alert.alert(
                    "Fallback",
                    `Saved to app's document directory: ${fileUri}`
                  );
                }
              } catch (error) {
                console.error("Save error:", error);
                fileUri = `${FileSystem.documentDirectory}${fileName}`;
                await FileSystem.moveAsync({ from: uri, to: fileUri });
                Alert.alert(
                  "Fallback",
                  `Failed to save to selected location. Saved to: ${fileUri}`
                );
              }
            } else {
              fileUri = `${FileSystem.documentDirectory}${fileName}`;
              await FileSystem.moveAsync({ from: uri, to: fileUri });
              Alert.alert(
                "Success",
                `PDF saved to: ${fileUri}\nYou can share it to save to another location.`,
                [
                  { text: "OK", style: "cancel" },
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
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderAppointmentItem = ({ item, index }: ListRenderItemInfo<Appointment>): React.ReactElement => {
    const animations = itemAnimations.get(item._id) || {
      fadeAnim: new Animated.Value(1),
      translateY: new Animated.Value(0),
    };

    return (
      <Animated.View
        style={[{ opacity: animations.fadeAnim, transform: [{ translateY: animations.translateY }] }]}
      >
        <AppointmentCard
          appointment={{
            _id: item._id,
            patientId: {
              patientName: item.patientId?.patientName || "Unknown",
              mrn: item.patientId?.mrn || "N/A",
            },
            doctor: {
              fullName: item.doctor?.fullName || "Not assigned",
            },
            appointmentDate: item.appointmentDate,
            slot: item.slot || "N/A",
            isCanceled: item.isApmtCanceled,
            isPrescriptionCreated: item.isPrescriptionCreated,
            isChecked: item.isPrescriptionCreated,
          }}
          onRetake={() => handleRetakeAppointment(item)}
          onToken={() => handleViewToken(item._id)}
          onCancel={() => handleCancelAppointment(item._id)}
          onGeneratePDF={() => onGeneratePDF(item)}
          onViewPrescription={() => handleViewPrescription(item._id)}
          showPrescription={item.isPrescriptionCreated}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}
      >
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
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
        style={[styles.searchContainer, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}
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
              style={[styles.emptyContainer, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}
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
      <InstructionModal
        visible={instructionsVisible}
        onClose={() => setInstructionsVisible(false)}
        navigateToAppointment={handleNavigateToAppointment}
        navigateToPatients={handleNavigateToPatients}
      />
    </View>
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
    fontWeight: "bold",
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