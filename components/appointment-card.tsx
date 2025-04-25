import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Card } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "@/constants/Colors"

interface AppointmentCardProps {
  appointment: {
    _id: string
    patientId: {
      patientName: string
      mrn: string | number
    }
    doctor: {
      fullName: string
    }
    appointmentDate: string
    slot: string
    isCanceled?: boolean
    isChecked?: boolean
    isPrescriptionCreated?: boolean
  }
  onRetake: (appointment: any) => void
  onToken: (id: string) => void
  onCancel: (id: string) => void
  // onPrintData: (id: string) => void
}

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString)
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "/")
  } catch (e) {
    return dateString
  }
}

const AppointmentCard = ({ appointment, onRetake, onToken, onCancel }: AppointmentCardProps) => {
  return (
    <Card style={styles.card}>
      <View style={styles.headerContainer}>
        <View style={styles.patientInfoContainer}>
          <Text style={styles.patientName}>{appointment.patientId.patientName}</Text>
          <Text style={styles.mrnText}>MRN: {appointment.patientId.mrn}</Text>
        </View>

        <View style={styles.actionButtonsContainer}>
         
     
          {/* <TouchableOpacity
            style={[styles.iconButton, styles.cancelButton]}
            onPress={() => onCancel(appointment._id)}
            disabled={appointment.isCanceled || appointment.isChecked}
          >
            <Ionicons
              name="close"
              size={16}
              color={appointment.isCanceled || appointment.isChecked ? "gray" : "#FF1F1F"}
            />
          </TouchableOpacity> */}
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Doctor Name:</Text>
          <Text style={styles.detailValue}>{appointment.doctor.fullName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Appointment Date:</Text>
          <Text style={styles.detailValue}>{formatDate(appointment.appointmentDate)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time Slot:</Text>
          <Text style={styles.detailValue}>{appointment.slot}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={styles.detailValue}>
            {appointment.isCanceled ? "Canceled" : appointment.isChecked ? "Checked" : "Active"}
          </Text>
        </View>
      </View>

      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={() => onRetake(appointment)}>
          <Ionicons name="repeat-outline" size={18}  style={styles.buttonIconR} />
          <Text style={styles.buttonText}>Retake Appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tokenButton}
          onPress={() => onToken(appointment._id)}
        >
          <Ionicons name="receipt-outline" size={18} color={'grey'} style={styles.buttonIcon} />
          <Text style={styles.buttonTextT}>Generate Token</Text>
        </TouchableOpacity>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  patientInfoContainer: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  mrnText: {
    fontSize: 10,
    color: "grey",
    marginTop: 2,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    padding: 6,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 31, 31, 0.1)",
  },
  detailsContainer: {
    backgroundColor: "#E4E4E4",
    padding: 12,
    borderRadius: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  bottomButtonsContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  // Updated button styles with border and improved background colors
  retakeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#388E3C", // Darker border
    backgroundColor:'transparent'
  },
  tokenButton: {
    flex: 1,
    backgroundColor: "transparent", // Blue background
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "grey", // Darker border
  },
  buttonIconR: {
    marginRight: 6,
    color: "#4CAF50", // Green background

  },
  buttonIcon: {
    marginRight: 6,

  },
  buttonText: {
    color: "#4CAF50", // Green background
    fontSize: 11,
    fontWeight: "600",
  },
  buttonTextT: {
    color:'grey',
    fontSize: 11,
    fontWeight: "600",
  },
})

export default AppointmentCard