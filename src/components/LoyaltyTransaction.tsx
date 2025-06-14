import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface LoyaltyTransactionProps<T = any> {
  transactions: T[];
  styles: any;
  COLORS: any;
  formatTransactionDate: (timestamp: any) => string;
  getTransactionColor: (transaction: T) => string;
  getTransactionPrefix: (transaction: T) => string;
}

const LoyaltyTransaction: React.FC<LoyaltyTransactionProps> = ({
  transactions,
  styles,
  COLORS,
  formatTransactionDate,
  getTransactionColor,
  getTransactionPrefix,
}) => {
  const styles3D = transactionStyles(COLORS);

  const EmptyState = () => (
    <View style={[styles.emptyStateContainer, styles3D.boxFloating]}>
      <View style={styles3D.content3D}>
        <MaterialIcons name="history" size={48} color={COLORS.primaryLightGreyHex} />
        <Text style={styles.NoTransactionsText}>No recent activity</Text>
        <Text style={styles.emptyStateSubtext}>
          Your loyalty points history will appear here
        </Text>
      </View>
    </View>
  );

  // Helper function to determine if points are positive or negative
  const getPointsColor = (transaction: any): string => {
    const points = transaction.points || 0;
    const prefix = getTransactionPrefix(transaction);
    
    // Check if points are negative (either negative number or minus prefix)
    if (points < 0 || prefix === '-') {
      return '#FF4444'; // Red for negative/deducted points
    }
    return '#4CAF50'; // Green for positive/earned points
  };

  // Helper function to get badge background color
  const getBadgeColor = (transaction: any): string => {
    const points = transaction.points || 0;
    const prefix = getTransactionPrefix(transaction);
    
    if (points < 0 || prefix === '-') {
      return '#FF4444'; // Red background for negative points
    }
    return '#4CAF50'; // Green background for positive points
  };

  const TransactionItem: React.FC<{ transaction: any; index: number }> = ({ transaction, index }) => (
    <View key={`${transaction.id || transaction.orderId || 'tx'}-${index}`} style={styles3D.box3D}>
      <View style={styles3D.content3D}>
        <View style={styles.TransactionInfo}>
          <Text style={styles.TransactionDate}>{formatTransactionDate(transaction.timestamp)}</Text>
          <Text style={styles.TransactionType}>{getTransactionTypeText(transaction.type)}</Text>
          <Text style={styles.TransactionDescription}>
            {transaction.description || 'No description available'}
          </Text>
        </View>

        <View style={[
          styles3D.pointsBadge,
          { backgroundColor: getBadgeColor(transaction) }
        ]}>
          <Text
            style={[
              styles.TransactionPoints,
              {
                color: COLORS.primaryWhiteHex || '#FFFFFF',
                fontWeight: 'bold',
              },
            ]}
          >
            {getTransactionPrefix(transaction)}
            {Math.abs(transaction.points)} {/* Use absolute value since prefix handles sign */}
          </Text>
        </View>
      </View>
    </View>
  );

  const getTransactionTypeText = (type: any): string => {
     switch (type) {
    case 'earned':
      return '🟢 Points Added';
    case 'redeemed':
      return '🔴 Points Used';
    case 'bonus':
      return '🎁 Bonus Points';
    case 'refund':
      return '↩️ Points Refunded';
    case 'adjustment':
      return '⚙️ Points Adjusted';
    default:
      return 'Points Activity';
     }
  };

  const isValidTransaction = (transaction: any): boolean => {
    return transaction && typeof transaction === 'object' && transaction.points !== undefined && transaction.points !== null;
  };

  const renderTransactions = () => {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return <EmptyState />;
    }

    const validTransactions = transactions.filter(isValidTransaction);
    if (validTransactions.length === 0) {
      return <EmptyState />;
    }

    return validTransactions.map((transaction, index) => (
      <TransactionItem key={`${transaction.id || transaction.orderId || 'tx'}-${index}`} transaction={transaction} index={index} />
    ));
  };

  return (
    <View style={styles3D.container}>
      <Text style={styles3D.title}>Recent Activity</Text>
      {renderTransactions()}
    </View>
  );
};

const transactionStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.primaryBlackHex || '#000',
      marginBottom: 12,
    },
    box3D: {
      backgroundColor: COLORS.primaryWhiteHex || '#FFFFFF',
      borderRadius: 12,
      marginVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 15,
      transform: [{ perspective: 1000 }, { rotateX: '2deg' }, { translateY: -2 }],
    },
    content3D: {
      padding: 16,
      backgroundColor: COLORS.primaryWhiteHex || '#FFFFFF',
      borderRadius: 12,
      shadowColor: COLORS.primaryBlackHex || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    boxFloating: {
      backgroundColor: COLORS.primaryWhiteHex || '#FFFFFF',
      borderRadius: 16,
      marginVertical: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 20,
      transform: [
        { perspective: 1000 },
        { rotateY: '1deg' },
        { rotateX: '2deg' },
        { translateY: -5 }
      ],
    },
    pointsBadge: {
      // backgroundColor is now set dynamically in the component
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      position: 'absolute' as const,
      right: 16,
      top: 16,
      shadowColor: '#000', // Changed to black for universal shadow
      shadowOffset: { width: 2, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 8,
      transform: [{ perspective: 500 }, { rotateX: '-5deg' }, { translateY: -2 }],
    },
  });

export default LoyaltyTransaction;