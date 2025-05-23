import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Keyboard,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import { auth, db } from '../../src/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface SupportTicket {
  subject: string;
  message: string;
  category: string;
}

const SupportScreen = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'Please login to submit a ticket');
      router.replace('/(auth)/login');
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();

      const ticketData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'support_tickets'), ticketData);

      // Clear inputs
      setSubject('');
      setMessage('');

      // Show success message
      Alert.alert(
        'Ticket Submitted',
        'Your support ticket has been submitted successfully. We will get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(app)/HomeScreen'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = (method: string) => {
    switch (method) {
      case 'email':
        Linking.openURL('mailto:smoolyarohith@gmail.com');
        break;
      case 'phone':
        Linking.openURL('tel:+919148592177');
        break;
      case 'whatsapp':
        Linking.openURL('https://wa.me/9148592177');
        break;
    }
  };

  const renderContactMethod = (icon: string, title: string, description: string, method: string) => (
    <TouchableOpacity
      style={styles.contactMethod}
      onPress={() => handleContactSupport(method)}
    >
      <View style={styles.contactIcon}>
        <FontAwesome name={icon} size={24} color={COLORS.primaryOrangeHex} />
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactDescription}>{description}</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color={COLORS.primaryGreyHex} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Support',
          headerShown: false,
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(app)/HomeScreen')}>
          <FontAwesome name="arrow-left" size={24} color={COLORS.primaryBlackHex} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Submit a Support Ticket</Text>
          <Text style={styles.subtitle}>
            We're here to help! Please fill out the form below and we'll get back to you as soon as possible.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter the subject of your issue"
                placeholderTextColor={COLORS.primaryGreyHex}
                maxLength={100}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue in detail"
                placeholderTextColor={COLORS.primaryGreyHex}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primaryWhiteHex} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Need Immediate Assistance?</Text>
            <Text style={styles.infoText}>
              For urgent matters, please contact our customer service at:
            </Text>
            {renderContactMethod('envelope', 'Email Support', 'Get in touch via email', 'email')}
            {renderContactMethod('phone', 'Phone Support', 'Call us directly', 'phone')}
            {renderContactMethod('whatsapp', 'WhatsApp', 'Chat with us on WhatsApp', 'whatsapp')}
          </View>
        </View>
      </ScrollView>
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
  },
  content: {
    padding: SPACING.space_24,
  },
  title: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_24,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  subtitle: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_24,
  },
  form: {
    marginBottom: SPACING.space_24,
  },
  inputContainer: {
    marginBottom: SPACING.space_16,
  },
  inputLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
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
  },
  messageInput: {
    height: 120,
    paddingTop: SPACING.space_12,
  },
  submitButton: {
    backgroundColor: COLORS.primaryOrangeHex,
    padding: SPACING.space_16,
    borderRadius: BORDERRADIUS.radius_15,
    alignItems: 'center',
    marginTop: SPACING.space_16,
  },
  submitButtonText: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryWhiteHex,
  },
  infoSection: {
    backgroundColor: COLORS.primaryGreyHex + '10',
    padding: SPACING.space_24,
    borderRadius: BORDERRADIUS.radius_15,
  },
  infoTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_8,
  },
  infoText: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginBottom: SPACING.space_16,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_15,
    padding: SPACING.space_16,
    marginBottom: SPACING.space_16,
    borderWidth: 1,
    borderColor: COLORS.primaryGreyHex + '20',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryOrangeHex + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.space_16,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
    marginBottom: SPACING.space_4,
  },
  contactDescription: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
  },
});

export default SupportScreen; 