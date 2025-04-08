import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InstructionModalProps {
  visible: boolean;
  onClose: () => void;
  navigateToAppointment: () => void;
  navigateToPatients: () => void;
}

const { width, height } = Dimensions.get('window');

const InstructionModal: React.FC<InstructionModalProps> = ({ 
  visible, 
  onClose, 
  navigateToAppointment, 
  navigateToPatients 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true} 
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true} 
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalView}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              
              <ScrollView style={styles.scrollView}>
                <View style={styles.contentContainer}>
                  <Text style={styles.heading}>ہدایات:</Text>
                  
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>نئی اپائنٹمنٹ بنائیں</Text>
                    <Text style={styles.sectionText}>
                    لاگ آن کرنے کے بعد، اپائنٹمنٹ سیکشن میں جائیں۔ پھر 
                      <Text style={styles.highlight}> APPOINTMENT + </Text>
                      پر کلک کریں، مطلوبہ تفصیلات درج کریں اور
                      <Text style={styles.highlight}> SUBMIT </Text>
                      پر کلک کریں۔ اگر آپ کا مریض مختلف ہسپتال میں پہلے سے رجسٹرڈ ہے تو 
                      <Text style={styles.highlight}> MR </Text>
                      نمبر سے تلاش کریں اور
                      <Text style={styles.highlight}> NEXT </Text>
                      پر کلک کریں۔
                    </Text>
                  </View>
                  
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>اپائنٹمنٹ کی تفصیلات چیک کریں</Text>
                    <Text style={styles.sectionText}>
                      ڈاکٹر کا نام، خدمات، اپائنٹمنٹ کی تاریخ اور وقت منتخب کریں۔ پھر 
                      <Text style={styles.highlight}> DONE </Text>
                      پر کلک کرکے اس کو محفوظ کریں تاکہ مریض کے وقت پر اپائنٹمنٹ کو دکھایا جا سکے۔
                    </Text>
                  </View>
                
                  
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>دوبارہ اپائنٹمنٹ لینا</Text>
                    <Text style={styles.sectionText}>
                      اگر آپ کو اسی ڈاکٹر کا دوبارہ اپائنٹمنٹ لینا ہے تو متعلقہ مریض کی معلومات معلوم ہونے کے لئے  <Text style={styles.highlight}><Ionicons name="refresh" size={18} /> Retake </Text>
                      آئیکن پر کلک کریں۔
                    </Text>
                  </View>
                  
                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity 
                      style={styles.createButton}
                      onPress={() => {
                        onClose();
                        navigateToAppointment();
                      }}
                    >
                      <Text style={styles.buttonText}>+ APPOINTMENT</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.patientsButton}
                      onPress={() => {
                        onClose();
                        navigateToPatients();
                      }}
                    >
                      <Text style={styles.buttonText}>PATIENTS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0,0.1)', 
  },
  modalView: {
    width: width * 0.9,
    maxHeight: height * 0.85,
    backgroundColor: 'white',
    borderRadius: 9,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollView: {
    marginTop: 10,
  },
  contentContainer: {
    paddingTop: 30,
    paddingBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#212529',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212529',
    textAlign: 'right',
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#495057',
    textAlign: 'right',
  },
  highlight: {
    color: '#0d6efd',
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  createButton: {
    backgroundColor: '#0d6efd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  patientsButton: {
    backgroundColor: '#0d6efd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default InstructionModal;