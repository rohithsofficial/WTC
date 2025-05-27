import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { auth, db } from '../../src/firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import StyledAlert from '../../src/components/StyledAlert';

interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const AddressScreen = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({
      visible: true,
      title,
      message,
      type
    });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(collection(db, 'addresses'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const addressList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Address[];

      setAddresses(addressList);
    } catch (error) {
      console.error('Error loading addresses:', error);
      showAlert('Error', 'Failed to load addresses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAddressForm({
      name: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    });
    setEditingAddress(null);
    setShowAddForm(false);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });
    setShowAddForm(true);
  };

  const handleSaveAddress = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        showAlert('Error', 'Please sign in to manage addresses', 'error');
        return;
      }

      // Validate inputs
      if (!addressForm.name || !addressForm.phone || !addressForm.address || 
          !addressForm.city || !addressForm.state || !addressForm.pincode) {
        showAlert('Error', 'Please fill in all fields', 'error');
        return;
      }

      if (editingAddress) {
        // Update existing address
        await updateDoc(doc(db, 'addresses', editingAddress.id), {
          ...addressForm,
          updatedAt: new Date().toISOString()
        });
        showAlert('Success', 'Address updated successfully', 'success');
      } else {
        // Add new address
        const addressData = {
          ...addressForm,
          userId,
          isDefault: addresses.length === 0, // First address is default
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'addresses'), addressData);
        showAlert('Success', 'Address added successfully', 'success');
      }

      resetForm();
      loadAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      showAlert('Error', 'Failed to save address', 'error');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
      showAlert('Success', 'Address deleted successfully', 'success');
      loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      showAlert('Error', 'Failed to delete address', 'error');
    }
  };

  const renderAddressForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>{editingAddress ? 'Edit Address' : 'Add New Address'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={addressForm.name}
        onChangeText={(text) => setAddressForm({ ...addressForm, name: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={addressForm.phone}
        onChangeText={(text) => setAddressForm({ ...addressForm, phone: text })}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={addressForm.address}
        onChangeText={(text) => setAddressForm({ ...addressForm, address: text })}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="City"
        value={addressForm.city}
        onChangeText={(text) => setAddressForm({ ...addressForm, city: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="State"
        value={addressForm.state}
        onChangeText={(text) => setAddressForm({ ...addressForm, state: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Pincode"
        value={addressForm.pincode}
        onChangeText={(text) => setAddressForm({ ...addressForm, pincode: text })}
        keyboardType="numeric"
      />
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={resetForm}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={handleSaveAddress}
        >
          <Text style={[styles.buttonText, styles.addButtonText]}>
            {editingAddress ? 'Update Address' : 'Add Address'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Addresses',
          headerShown: false,
        }}
      />

      <StyledAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              {address.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
              <Text style={styles.addressName}>{address.name}</Text>
              <Text style={styles.addressPhone}>{address.phone}</Text>
              <Text style={styles.addressText}>{address.address}</Text>
              <Text style={styles.addressText}>
                {address.city}, {address.state} - {address.pincode}
              </Text>
              <View style={styles.addressActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditAddress(address)}
                >
                  <FontAwesome name="edit" size={20} color={COLORS.primaryOrangeHex} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteAddress(address.id)}
                >
                  <FontAwesome name="trash" size={20} color={COLORS.primaryRedHex} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {!showAddForm && (
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => setShowAddForm(true)}
            >
              <FontAwesome name="plus" size={20} color={COLORS.primaryWhiteHex} />
              <Text style={styles.addAddressText}>Add New Address</Text>
            </TouchableOpacity>
          )}

          {showAddForm && renderAddressForm()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.space_24,
    paddingTop: SPACING.space_36,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  headerTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_20,
    color: COLORS.primaryBlackHex,
  },
  headerRight: {
    width: 24,
  },
  scrollView: {
    flex: 1,
    padding: SPACING.space_16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCard: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex + '20',
    position: 'relative',
  },
  defaultBadge: {
    position: 'absolute',
    top: SPACING.space_16,
    right: SPACING.space_16,
    backgroundColor: COLORS.primaryOrangeHex,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_10,
  },
  defaultBadgeText: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_12,
    color: COLORS.primaryWhiteHex,
  },
  addressName: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  addressPhone: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_8,
  },
  addressText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.space_12,
  },
  editButton: {
    padding: SPACING.space_8,
    marginRight: SPACING.space_8,
  },
  deleteButton: {
    padding: SPACING.space_8,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    marginBottom: SPACING.space_16,
    gap: SPACING.space_8,
  },
  addAddressText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  formContainer: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex + '20',
  },
  formTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_16,
  },
  input: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex + '20',
    borderRadius: BORDERRADIUS.radius_10,
    padding: SPACING.space_12,
    marginBottom: SPACING.space_12,
  },
  formButtons: {
    flexDirection: 'row',
    gap: SPACING.space_12,
    marginTop: SPACING.space_8,
  },
  button: {
    flex: 1,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderWidth: 1,
    borderColor: COLORS.primaryOrangeHex,
  },
  addButton: {
    backgroundColor: COLORS.primaryOrangeHex,
  },
  buttonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryOrangeHex,
  },
  addButtonText: {
    color: COLORS.primaryWhiteHex,
  },
});

export default AddressScreen; 