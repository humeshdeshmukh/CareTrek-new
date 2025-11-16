// src/screens/senior/SOSContactsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Modal,
  Pressable,
  Switch,
  Linking,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';
import { useAuth } from '../../hooks/useAuth';
import { useSOSContacts } from '../../hooks/useSOSContacts';

type ContactType = 'family' | 'police' | 'medical' | 'other';

type SOSContact = {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  is_emergency: boolean;
};

type SOSNavigationProp = StackNavigationProp<RootStackParamList, 'SOSContacts'>;

const SOSContactsScreen = () => {
  const navigation = useNavigation<SOSNavigationProp>();
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();
  const { user } = useAuth();
  const { 
    contacts, 
    loading, 
    error, 
    saveContact, 
    deleteContact, 
    refreshContacts 
  } = useSOSContacts(user?.id);
  
  // Log user ID and contacts when they change
  useEffect(() => {
    console.log('User ID:', user?.id);
    console.log('Contacts from hook:', contacts);
  }, [user?.id, contacts]);
  
  // Translations
  const { translatedText: backText } = useCachedTranslation('Back', currentLanguage);
  const { translatedText: sosContactsText } = useCachedTranslation('SOS Contacts', currentLanguage);
  const { translatedText: addContactText } = useCachedTranslation('Add Contact', currentLanguage);
  const { translatedText: emergencyContactsText } = useCachedTranslation('Emergency Contacts', currentLanguage);
  const { translatedText: familyText } = useCachedTranslation('Family', currentLanguage);
  const { translatedText: policeText } = useCachedTranslation('Police', currentLanguage);
  const { translatedText: medicalText } = useCachedTranslation('Medical', currentLanguage);
  const { translatedText: otherText } = useCachedTranslation('Other', currentLanguage);
  const { translatedText: callText } = useCachedTranslation('Call', currentLanguage);
  const { translatedText: nameText } = useCachedTranslation('Name', currentLanguage);
  const { translatedText: phoneText } = useCachedTranslation('Phone', currentLanguage);
  const { translatedText: typeText } = useCachedTranslation('Type', currentLanguage);
  const { translatedText: saveText } = useCachedTranslation('Save', currentLanguage);
  const { translatedText: cancelText } = useCachedTranslation('Cancel', currentLanguage);
  const { translatedText: deleteText } = useCachedTranslation('Delete', currentLanguage);
  const { translatedText: emergencyContactText } = useCachedTranslation('Emergency Contact', currentLanguage);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentContact, setCurrentContact] = useState<SOSContact | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    type: ContactType;
    is_emergency: boolean;
  }>({
    name: '',
    phone: '',
    type: 'family',
    is_emergency: false
  });

  // Show error alert if there's an error and log contacts data
  useEffect(() => {
    if (error) {
      console.error('Error in SOSContactsScreen:', error);
      Alert.alert('Error', error);
    }
    console.log('Current contacts:', contacts);
    console.log('Loading state:', loading);
  }, [error, contacts, loading]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAddContact = () => {
    setCurrentContact(null);
    setFormData({
      name: '',
      phone: '',
      type: 'family',
      is_emergency: false
    });
    setIsModalVisible(true);
  };

  const handleEditContact = (contact: SOSContact) => {
    setCurrentContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      type: contact.type,
      is_emergency: contact.is_emergency
    });
    setIsModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      console.log('Saving contact:', formData);
      if (currentContact) {
        // Update existing contact
        console.log('Updating contact with ID:', currentContact.id);
        const updatedContact = await saveContact(formData, currentContact.id);
        console.log('Updated contact:', updatedContact);
      } else {
        // Add new contact
        console.log('Adding new contact');
        const newContact = await saveContact(formData);
        console.log('Added new contact:', newContact);
      }
      setIsModalVisible(false);
      // Refresh contacts after saving
      await refreshContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    }
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(id);
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCall = async (phoneNumber: string) => {
    try {
      // Remove any non-numeric characters except '+' from the phone number
      const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
      
      // Create the phone URL based on the platform
      const phoneUrl = Platform.OS === 'ios' 
        ? `telprompt:${cleanNumber}`
        : `tel:${cleanNumber}`;
      
      // Check if the device can open the URL
      const supported = await Linking.canOpenURL(phoneUrl);
      
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          'Unable to make call',
          'Your device does not support phone calls or the phone number is invalid.'
        );
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert(
        'Error',
        'An error occurred while trying to make the call. Please try again.'
      );
    }
  };

  const renderContact = ({ item }: { item: SOSContact }) => (
    <View style={[styles.contactCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
          {item.name}
        </Text>
        <Text style={[styles.contactType, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>
          {item.type === 'family' ? familyText : 
           item.type === 'police' ? policeText : 
           item.type === 'medical' ? medicalText : otherText}
          {item.is_emergency ? ` • ${emergencyContactText}` : ''}
        </Text>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#38A169' }]}
          onPress={() => handleCall(item.phone)}
          accessibilityLabel={`Call ${item.name}`}
          accessibilityHint={`Initiates a phone call to ${item.name}`}
        >
          <Ionicons name="call" size={16} color="white" />
          <Text style={styles.actionButtonText}>{callText}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: isDark ? '#4A5568' : '#E2E8F0' }]}
          onPress={() => handleEditContact(item)}
        >
          <Ionicons name="create" size={20} color={isDark ? '#E2E8F0' : '#4A5568'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#4A5568' : '#E2E8F0' }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#E2E8F0' : '#4A5568'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
          {sosContactsText}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Emergency Contacts Section */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
        {emergencyContactsText}
      </Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#48BB78' : '#38A169'} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={isDark ? '#A0AEC0' : '#718096'} />
              <Text style={[styles.emptyText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
                No contacts found. Add your first contact!
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshContacts}
              colors={[isDark ? '#48BB78' : '#38A169']}
              tintColor={isDark ? '#48BB78' : '#38A169'}
            />
          }
        />
      )}

      {/* Add Contact Button */}
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: isDark ? '#2F855A' : '#38A169' }]}
        onPress={handleAddContact}
      >
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>{addContactText}</Text>
      </TouchableOpacity>

      {/* Add/Edit Contact Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              {currentContact ? 'Edit Contact' : 'Add New Contact'}
            </Text>
            
            <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{nameText}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#4A5568' : '#EDF2F7',
                color: isDark ? '#E2E8F0' : '#1A202C',
                borderColor: isDark ? '#4A5568' : '#E2E8F0'
              }]}
              value={formData.name}
              onChangeText={text => setFormData({...formData, name: text})}
              placeholder={nameText}
              placeholderTextColor={isDark ? '#A0AEC0' : '#A0AEC0'}
            />
            
            <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{phoneText}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#4A5568' : '#EDF2F7',
                color: isDark ? '#E2E8F0' : '#1A202C',
                borderColor: isDark ? '#4A5568' : '#E2E8F0'
              }]}
              placeholder={phoneText}
              placeholderTextColor={isDark ? '#A0AEC0' : '#A0AEC0'}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
            
            <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{typeText}</Text>
            <View style={[styles.picker, { 
              backgroundColor: isDark ? '#4A5568' : '#EDF2F7',
              borderColor: isDark ? '#4A5568' : '#E2E8F0'
            }]}>
              <TouchableOpacity 
                style={[
                  styles.pickerItem, 
                  formData.type === 'family' && { backgroundColor: isDark ? '#2F855A' : '#38A169' }
                ]}
                onPress={() => setFormData({...formData, type: 'family'})}
              >
                <Text style={[
                  styles.pickerItemText, 
                  { color: formData.type === 'family' ? 'white' : (isDark ? '#E2E8F0' : '#1A202C') }
                ]}>
                  {familyText}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.pickerItem, 
                  formData.type === 'police' && { backgroundColor: isDark ? '#2F855A' : '#38A169' }
                ]}
                onPress={() => setFormData({...formData, type: 'police'})}
              >
                <Text style={[
                  styles.pickerItemText, 
                  { color: formData.type === 'police' ? 'white' : (isDark ? '#E2E8F0' : '#1A202C') }
                ]}>
                  {policeText}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.pickerItem, 
                  formData.type === 'medical' && { backgroundColor: isDark ? '#2F855A' : '#38A169' }
                ]}
                onPress={() => setFormData({...formData, type: 'medical'})}
              >
                <Text style={[
                  styles.pickerItemText, 
                  { color: formData.type === 'medical' ? 'white' : (isDark ? '#E2E8F0' : '#1A202C') }
                ]}>
                  {medicalText}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.pickerItem, 
                  formData.type === 'other' && { backgroundColor: isDark ? '#2F855A' : '#38A169' }
                ]}
                onPress={() => setFormData({...formData, type: 'other'})}
              >
                <Text style={[
                  styles.pickerItemText, 
                  { color: formData.type === 'other' ? 'white' : (isDark ? '#E2E8F0' : '#1A202C') }
                ]}>
                  {otherText}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                {emergencyContactText}
              </Text>
              <Switch
                value={formData.is_emergency}
                onValueChange={value => setFormData({...formData, is_emergency: value})}
                trackColor={{ false: isDark ? '#4A5568' : '#E2E8F0', true: isDark ? '#48BB78' : '#38A169' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: isDark ? '#4A5568' : '#E2E8F0' }]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
                  {cancelText}
                </Text>
              </Pressable>
              <TouchableOpacity 
                style={[styles.modalButton, { 
                  backgroundColor: isDark ? '#2F855A' : '#38A169',
                  opacity: loading ? 0.7 : 1
                }]}
                onPress={handleSaveContact}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>
                    {saveText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {currentContact && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setIsModalVisible(false);
                  handleDeleteContact(currentContact.id);
                }}
              >
                <Ionicons name="trash" size={20} color="#E53E3E" />
                <Text style={styles.deleteButtonText}>{deleteText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    margin: 16,
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactType: {
    fontSize: 14,
    opacity: 0.8,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pickerItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  deleteButtonText: {
    color: '#E53E3E',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default SOSContactsScreen;