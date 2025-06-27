// app/(app)/LoyaltyScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';
import GradientBGIcon from '../../src/components/GradientBGIcon';
import LoyaltyPointsDisplay from '../../src/components/LoyaltyPointsDisplay';
import LoyaltyTransaction from '../../src/components/LoyaltyTransaction';
import { loyaltyService, UserLoyaltyProfile, ComprehensiveLoyaltyTransaction } from '../../src/services/loyaltyService';
import { auth } from '../../src/firebase/firebase-config';
import { MaterialIcons } from '@expo/vector-icons';
// React Native Firebase imports
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { LoyaltyUser } from '../../src/types/loyalty';

const { width: screenWidth } = Dimensions.get('window');

// Type alias for cleaner code
type Timestamp = FirebaseFirestoreTypes.Timestamp;

// Updated type guards for React Native Firebase Timestamp
const isFirestoreTimestamp = (value: unknown): value is Timestamp => {
  return typeof value === 'object' && 
         value !== null && 
         'toMillis' in value && 
         'toDate' in value &&
         typeof (value as any).toMillis === 'function' &&
         typeof (value as any).toDate === 'function';
};

const isDate = (value: unknown): value is Date => {
  return value instanceof Date;
};

const getTimestampValue = (ts: unknown): number => {
  try {
    if (isFirestoreTimestamp(ts)) {
      return ts.toMillis();
    }
    if (isDate(ts)) {
      return ts.getTime();
    }
    return new Date(ts as string).getTime();
  } catch (error) {
    console.error('Error getting timestamp value:', error);
    return Date.now();
  }
};

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onRetry?: () => void;
  onClose: () => void;
  showRetry?: boolean;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title,
  message,
  onRetry,
  onClose,
  showRetry = true
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.primaryOrangeHex} />
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        
        <View style={styles.modalButtons}>
          {showRetry && onRetry && (
            <TouchableOpacity style={styles.modalButton} onPress={onRetry}>
              <Text style={styles.modalButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.modalButton, styles.modalButtonSecondary]} 
            onPress={onClose}
          >
            <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

interface AuthModalProps {
  visible: boolean;
  onSignIn: () => void;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ visible, onSignIn, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <MaterialIcons name="account-circle" size={64} color={COLORS.primaryOrangeHex} />
        <Text style={styles.modalTitle}>Sign In Required</Text>
        <Text style={styles.modalMessage}>
          Please sign in to view and manage your loyalty points. Join our loyalty program to earn rewards on every purchase!
        </Text>
        
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.modalButton} onPress={onSignIn}>
            <MaterialIcons name="login" size={20} color={COLORS.primaryWhiteHex} />
            <Text style={[styles.modalButtonText, { marginLeft: SPACING.space_8 }]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, styles.modalButtonSecondary]} 
            onPress={onClose}
          >
            <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const LoadingScreen = () => (
  <View style={styles.ScreenContainer}>
    <View style={styles.HeaderContainer}>
      <View style={{ opacity: 0.5 }}>
        <GradientBGIcon
          name="left"
          color={COLORS.primaryLightGreyHex}
          size={FONTSIZE.size_16}
        />
      </View>
      <Text style={styles.HeaderText}>Loyalty Points</Text>
      <View style={{ opacity: 0.5 }}>
        <MaterialIcons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
      </View>
    </View>

    <View style={styles.loadingContent}>
      <ActivityIndicator size="large" color={COLORS.primaryOrangeHex} />
      <Text style={styles.loadingText}>Loading your loyalty data...</Text>
      <Text style={styles.loadingSubtext}>This may take a moment</Text>
    </View>
  </View>
);

const LoyaltyScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserLoyaltyProfile | null>(null);
  const [points, setPoints] = useState(0);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<ComprehensiveLoyaltyTransaction[]>([]);
  
  // Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState({ title: '', message: '' });
  const [retryFunction, setRetryFunction] = useState<(() => void) | undefined>(undefined);

  const showError = (title: string, message: string, onRetry?: () => void) => {
    setErrorDetails({ title, message });
    setRetryFunction(onRetry ? () => onRetry : undefined);
    setShowErrorModal(true);
  };

  const handleSignIn = () => {
    setShowAuthModal(false);
    try {
      router.push('/phone-auth');
    } catch (error) {
      console.error('Navigation error:', error);
      showError(
        'Navigation Error',
        'Unable to navigate to sign in page. Please try again.',
        () => handleSignIn()
      );
    }
  };

  // Updated createSafeTimestamp for React Native Firebase
  const createSafeTimestamp = (value: unknown): Timestamp => {
    try {
      if (isFirestoreTimestamp(value)) return value;
      if (isDate(value)) return firestore.Timestamp.fromDate(value);
      if (typeof value === 'string' || typeof value === 'number') {
        return firestore.Timestamp.fromDate(new Date(value));
      }
      return firestore.Timestamp.now();
    } catch (error) {
      console.error('Error creating timestamp:', error);
      return firestore.Timestamp.now();
    }
  };

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      
      // Check authentication
      if (!auth.currentUser) {
        setLoading(false);
        setShowAuthModal(true);
        return;
      }

      // Get user profile
      const profile = await loyaltyService.getUserLoyaltyProfile(auth.currentUser.uid);
      
      if (profile) {
        try {
          // Process profile with safe date handling for React Native Firebase
          const processedProfile = {
            ...profile,
            createdAt: isFirestoreTimestamp(profile.createdAt) 
              ? profile.createdAt.toDate() 
              : new Date(profile.createdAt),
            updatedAt: isFirestoreTimestamp(profile.updatedAt) 
              ? profile.updatedAt.toDate() 
              : new Date(profile.updatedAt)
          };
          
          setUserProfile(processedProfile);
          setPoints(processedProfile.availablePoints || 0);

          // Fetch transactions with error handling
          try {
            const transactions = await loyaltyService.getComprehensiveLoyaltyTransactions(auth.currentUser.uid);
            
            if (transactions && Array.isArray(transactions) && transactions.length > 0) {
              const processedTransactions = transactions.map(transaction => {
                try {
                  const timestamp = transaction?.transactionDetails?.timestamp;
                  const auditTrail = transaction?.auditTrail || {};
                  
                  return {
                    ...transaction,
                    transactionDetails: {
                      ...transaction.transactionDetails,
                      timestamp: createSafeTimestamp(timestamp)
                    },
                    auditTrail: {
                      createdAt: createSafeTimestamp(auditTrail?.createdAt),
                      updatedAt: createSafeTimestamp(auditTrail?.updatedAt),
                      createdBy: auditTrail?.createdBy || auth.currentUser?.uid || 'system',
                      updatedBy: auditTrail?.updatedBy
                    }
                  };
                } catch (transactionError) {
                  console.error('Error processing transaction:', transactionError);
                  return {
                    ...transaction,
                    transactionDetails: {
                      ...transaction.transactionDetails,
                      timestamp: firestore.Timestamp.now()
                    },
                    auditTrail: {
                      createdAt: firestore.Timestamp.now(),
                      updatedAt: firestore.Timestamp.now(),
                      createdBy: auth.currentUser?.uid || 'system',
                      updatedBy: auth.currentUser?.uid
                    }
                  };
                }
              });
              
              // Sort transactions safely
              processedTransactions.sort((a, b) => {
                try {
                  const timeA = getTimestampValue(a.transactionDetails.timestamp);
                  const timeB = getTimestampValue(b.transactionDetails.timestamp);
                  return timeB - timeA;
                } catch (sortError) {
                  console.error('Error sorting transactions:', sortError);
                  return 0;
                }
              });
              
              setLoyaltyTransactions(processedTransactions);
            } else {
              setLoyaltyTransactions([]);
            }
          } catch (transactionError) {
            console.error('Error fetching loyalty transactions:', transactionError);
            setLoyaltyTransactions([]);
            // Don't show error for transactions - profile data is more important
          }

        } catch (profileError) {
          console.error('Error processing profile:', profileError);
          throw new Error('Failed to process loyalty profile data');
        }

      } else {
        // Create new profile safely
        try {
          const newProfile: Omit<LoyaltyUser, "loyaltyPoints" | "updatedAt" | "createdAt"> & { totalOrders?: number } = {
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || 'Guest User',
            email: auth.currentUser.email || '',
            phone: auth.currentUser.phoneNumber || undefined,
            totalOrders: 0,
            totalSpent: 0,
            isFirstTimeUser: true
          };
          
          await loyaltyService.createUserProfile(newProfile);
          
          setUserProfile({
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || 'Guest User',
            availablePoints: 0,
            totalOrders: 0,
            totalSpent: 0,
            isFirstTimeUser: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          setPoints(0);
          setLoyaltyTransactions([]);

        } catch (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          throw new Error('Failed to create loyalty profile');
        }
      }

    } catch (error) {
      console.error('Error loading loyalty data:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      showError(
        'Loading Error',
        `We encountered an issue loading your loyalty data: ${errorMessage}`,
        () => loadLoyaltyData()
      );
      setLoyaltyTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadLoyaltyData();
    }, [])
  );

  const formatTransactionDate = (timestamp: Date | Timestamp) => {
    try {
      const date = isFirestoreTimestamp(timestamp) ? timestamp.toDate() : timestamp;
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const transformTransactionsForComponent = (transactions: ComprehensiveLoyaltyTransaction[]) => {
    return transactions.map(transaction => {
      try {
        const pointsAmount = (transaction.loyaltyDetails?.pointsEarned || 0) - (transaction.loyaltyDetails?.pointsRedeemed || 0);
        const orderNumber = transaction.orderId?.slice(-6) || 'Unknown';
        const itemCount = transaction.orderDetails?.items?.length || 0;
        const orderTotal = transaction.orderDetails?.originalAmount || 0;
        
        const earnedPoints = transaction.loyaltyDetails?.pointsEarned || 0;
        const redeemedPoints = transaction.loyaltyDetails?.pointsRedeemed || 0;
        const netPoints = earnedPoints - redeemedPoints;

        let type: 'earned' | 'redeemed' | 'adjusted';
        if (transaction.transactionDetails?.notes?.toLowerCase().includes('adjust')) {
          type = 'adjusted';
        } else if (netPoints > 0) {
          type = 'earned';
        } else {
          type = 'redeemed';
        }
        
        let description = '';
        switch (type) {
          case 'adjusted':
            description = netPoints > 0 
              ? `${netPoints} points added`
              : `${Math.abs(netPoints)} points deducted`;
            break;
          case 'earned':
            description = `+${netPoints} pts (Earned: ${earnedPoints}, Redeemed: ${redeemedPoints}) – ₹${orderTotal} order`;
            break;
          case 'redeemed':
            description = `${netPoints} pts (Earned: ${earnedPoints}, Redeemed: ${redeemedPoints}) – ₹${orderTotal} order`;
            break;
        }
        
        return {
          id: transaction.id,
          orderId: transaction.orderId,
          points: Math.abs(pointsAmount),
          timestamp: transaction.transactionDetails?.timestamp,
          type: type,
          description: description,
          notes: transaction.transactionDetails?.notes
        };
      } catch (transactionError) {
        console.error('Error transforming transaction:', transactionError);
        return {
          id: transaction.id || 'unknown',
          orderId: 'unknown',
          points: 0,
          timestamp: firestore.Timestamp.now(),
          type: 'adjusted' as const,
          description: 'Transaction data unavailable',
          notes: 'Error processing transaction'
        };
      }
    });
  };

  const handleQRNavigation = () => {
    try {
      router.push('/LoyaltyQRCodeScreen');
    } catch (error) {
      console.error('QR navigation error:', error);
      showError(
        'Navigation Error',
        'Unable to open QR code screen. Please try again.',
        () => handleQRNavigation()
      );
    }
  };

  const handleBackNavigation = () => {
    try {
      router.back();
    } catch (error) {
      console.error('Back navigation error:', error);
      // Fallback navigation
      try {
        router.push('/');
      } catch (fallbackError) {
        console.error('Fallback navigation error:', fallbackError);
      }
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.ScreenContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ScrollViewFlex}>
        
        {/* Header */}
        <View style={styles.HeaderContainer}>
          <TouchableOpacity onPress={handleBackNavigation}>
            <GradientBGIcon
              name="left"
              color={COLORS.primaryLightGreyHex}
              size={FONTSIZE.size_16}
            />
          </TouchableOpacity>
          <Text style={styles.HeaderText}>Loyalty Points</Text>
          <TouchableOpacity onPress={handleQRNavigation}>
            <MaterialIcons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
          </TouchableOpacity>
        </View>

        {userProfile && (
          <>
            {/* User Info */}
            <View style={styles.UserInfoContainer}>
              <Text style={styles.WelcomeText}>Welcome, {userProfile.userName}!</Text>
              <Text style={styles.TierText}>
                {userProfile.isFirstTimeUser ? 'New Member' : 'Loyal Member'}
              </Text>
            </View>

            {/* Points Display */}
            <LoyaltyPointsDisplay initialPoints={points} />

            {/* QR Code Button */}
            <TouchableOpacity 
              style={styles.qrButton}
              onPress={handleQRNavigation}>
              <MaterialIcons name="qr-code" size={24} color={COLORS.primaryWhiteHex} />
              <Text style={styles.qrButtonText}>Show QR Code</Text>
            </TouchableOpacity>

            {/* Transaction History */}
            <LoyaltyTransaction
              transactions={transformTransactionsForComponent(loyaltyTransactions)}
              styles={styles}
              COLORS={COLORS}
              formatTransactionDate={formatTransactionDate}
              getTransactionColor={(transaction) => {
                if (transaction.type === 'earned') {
                  return COLORS.primaryGreenHex;
                } else if (transaction.type === 'redeemed') {
                  return COLORS.primaryRedHex;
                }
                return COLORS.primaryLightGreyHex;
              }}
              getTransactionPrefix={(transaction) => {
                if (transaction.type === 'earned') {
                  return '+';
                } else if (transaction.type === 'redeemed') {
                  return '-';
                }
                return '';
              }}
              emptyStateMessage="No loyalty transactions yet"
              emptyStateSubMessage="Complete your first order to start earning loyalty points!"
            />
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <AuthModal
        visible={showAuthModal}
        onSignIn={handleSignIn}
        onClose={() => {
          setShowAuthModal(false);
          handleBackNavigation();
        }}
      />

      <ErrorModal
        visible={showErrorModal}
        title={errorDetails.title}
        message={errorDetails.message}
        onRetry={retryFunction}
        onClose={() => setShowErrorModal(false)}
        showRetry={!!retryFunction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  ScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  ScrollViewFlex: {
    flexGrow: 1,
  },
  HeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.space_15,
    backgroundColor: COLORS.primaryBlackHex,
  },
  HeaderText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_20,
    fontWeight: '600',
  },
  
  // Loading States
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.space_30,
  },
  loadingText: {
    color: COLORS.primaryBlackHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: '500',
    marginTop: SPACING.space_15,
  },
  loadingSubtext: {
    color: COLORS.primaryLightGreyHex,
    fontSize: FONTSIZE.size_14,
    marginTop: SPACING.space_8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.space_20,
  },
  modalContainer: {
    backgroundColor: COLORS.primaryWhiteHex,
    borderRadius: BORDERRADIUS.radius_20,
    padding: SPACING.space_30,
    alignItems: 'center',
    maxWidth: screenWidth * 0.9,
    width: '100%',
  },
  modalTitle: {
    fontSize: FONTSIZE.size_20,
    fontWeight: '700',
    color: COLORS.primaryBlackHex,
    textAlign: 'center',
    marginTop: SPACING.space_15,
    marginBottom: SPACING.space_10,
  },
  modalMessage: {
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryDarkGreyHex,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.space_20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.space_15,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    backgroundColor: COLORS.primaryOrangeHex,
    paddingVertical: SPACING.space_15,
    paddingHorizontal: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primaryLightGreyHex,
  },
  modalButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: COLORS.primaryDarkGreyHex,
  },

  // User Info
  UserInfoContainer: {
    padding: SPACING.space_15,
    backgroundColor: COLORS.primaryDarkGreyHex,
    margin: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  WelcomeText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_20,
    fontWeight: '600',
    marginBottom: SPACING.space_4,
  },
  TierText: {
    color: COLORS.primaryOrangeHex,
    fontSize: FONTSIZE.size_16,
  },

  // QR Button
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrangeHex,
    margin: SPACING.space_15,
    padding: SPACING.space_15,
    borderRadius: BORDERRADIUS.radius_15,
  },
  qrButtonText: {
    color: COLORS.primaryWhiteHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
    marginLeft: SPACING.space_10,
  },

  // Transaction Component Styles
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.space_30,
    margin: SPACING.space_15,
  },
  NoTransactionsText: {
    color: COLORS.primaryDarkGreyHex,
    fontSize: FONTSIZE.size_16,
    fontWeight: '500',
    marginTop: SPACING.space_10,
  },
  emptyStateSubtext: {
    color: COLORS.primaryLightGreyHex,
    fontSize: FONTSIZE.size_14,
    textAlign: 'center',
    marginTop: SPACING.space_4,
  },
  TransactionInfo: {
    flex: 1,
    marginRight: SPACING.space_10,
  },
  TransactionDate: {
    color: COLORS.primaryDarkGreyHex,
    fontSize: FONTSIZE.size_12,
    marginBottom: SPACING.space_4,
  },
  TransactionType: {
    color: COLORS.primaryBlackHex,
    fontSize: FONTSIZE.size_14,
    fontWeight: '500',
    marginBottom: SPACING.space_4,
  },
  TransactionDescription: {
    color: COLORS.primaryDarkGreyHex,
    fontSize: FONTSIZE.size_12,
  },
  TransactionPoints: {
    fontSize: FONTSIZE.size_16,
    fontWeight: '600',
  },
});

export default LoyaltyScreen;