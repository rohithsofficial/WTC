import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from '../theme/theme';
import LoyaltyPointsInfo from './LoyaltyPointsInfo';

interface LoyaltyPointsTransaction {
  points: number;
  originalPoints: number;
  earnedAt: Date;
  multiplier: number;
  orderId: string;
  status: 'active' | 'used';
  description: string;
}

interface LoyaltyPointsListProps {
  transactions: LoyaltyPointsTransaction[];
  onTransactionPress?: (transaction: LoyaltyPointsTransaction) => void;
}

const LoyaltyPointsList: React.FC<LoyaltyPointsListProps> = ({
  transactions,
  onTransactionPress,
}) => {
  // Sort transactions by earned date (FIFO)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return a.earnedAt.getTime() - b.earnedAt.getTime();
  });

  // Group transactions by status
  const activeTransactions = sortedTransactions.filter(t => t.status === 'active');
  const usedTransactions = sortedTransactions.filter(t => t.status === 'used');

  // Calculate total active points
  const totalActivePoints = activeTransactions.reduce((sum, t) => sum + t.points, 0);

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>({count})</Text>
    </View>
  );

  const renderTransaction = ({ item }: { item: LoyaltyPointsTransaction }) => (
    <LoyaltyPointsInfo
      {...item}
    />
  );

  return (
    <View style={styles.container}>
      {/* Points Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Active Points:</Text>
          <Text style={styles.summaryValue}>{totalActivePoints.toLocaleString()}</Text>
        </View>
      </View>

      {/* Active Points */}
      {activeTransactions.length > 0 && (
        <View style={styles.section}>
          {renderSectionHeader('Active Points', activeTransactions.length)}
          <FlatList
            data={activeTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.orderId}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Used Points */}
      {usedTransactions.length > 0 && (
        <View style={styles.section}>
          {renderSectionHeader('Used Points', usedTransactions.length)}
          <FlatList
            data={usedTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.orderId}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhiteHex,
  },
  summaryContainer: {
    backgroundColor: COLORS.primaryGreyHex,
    padding: SPACING.space_15,
    marginBottom: SPACING.space_15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: FONTFAMILY.poppins_medium,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  summaryValue: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryGreenHex,
  },
  section: {
    marginBottom: SPACING.space_20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_10,
    backgroundColor: COLORS.primaryGreyHex,
  },
  sectionTitle: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_16,
    color: COLORS.primaryBlackHex,
  },
  sectionCount: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryGreyHex,
    marginLeft: SPACING.space_8,
  },
});

export default LoyaltyPointsList; 