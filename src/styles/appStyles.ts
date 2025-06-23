import { StyleSheet } from 'react-native';
import { COLORS, FONTFAMILY, FONTSIZE, SPACING, BORDERRADIUS } from '../../src/theme/theme';

export const styles = StyleSheet.create({
    ScreenContainer: {
        flex: 1,
        backgroundColor: COLORS.primaryBlackHex,
    },
    ScrollViewFlex: {
        flexGrow: 1,
    },
    LottieAnimation: {
        height: 250,
    },
    HeaderContainer: {
        paddingHorizontal: SPACING.space_24,
        paddingVertical: SPACING.space_15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    HeaderText: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_20,
        color: COLORS.primaryWhiteHex,
    },
    EmptyView: {
        height: SPACING.space_36,
        width: SPACING.space_36,
    },
    PaymentContainer: {
        padding: SPACING.space_15,
        margin: SPACING.space_15,
        borderRadius: BORDERRADIUS.radius_15,
        backgroundColor: COLORS.primaryGreyHex,
    },
    PaymentHeaderText: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_18,
        color: COLORS.primaryWhiteHex,
        marginBottom: SPACING.space_10,
    },
    // Loyalty Points Styles
    LoyaltyPointsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.primaryDarkGreyHex,
        borderRadius: BORDERRADIUS.radius_15,
        padding: SPACING.space_15,
        marginTop: SPACING.space_10,
    },
    PointsDisplay: {
        alignItems: 'flex-start',
    },
    PointsValue: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_24,
        color: COLORS.primaryOrangeHex,
    },
    PointsLabel: {
        fontFamily: FONTFAMILY.poppins_medium,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryWhiteHex,
    },
    PointsSubLabel: {
        fontFamily: FONTFAMILY.poppins_regular,
        fontSize: FONTSIZE.size_12,
        color: COLORS.primaryLightGreyHex,
    },
    FirstTimeUserBadge: {
        backgroundColor: COLORS.primaryOrangeHex,
        paddingHorizontal: SPACING.space_10,
        paddingVertical: SPACING.space_4,
        borderRadius: BORDERRADIUS.radius_8,
    },
    FirstTimeBadgeText: {
        fontFamily: FONTFAMILY.poppins_medium,
        fontSize: FONTSIZE.size_12,
        color: COLORS.primaryWhiteHex,
    },
    // Discount Options Styles
    DiscountOptionsContainer: {
        marginTop: SPACING.space_15,
    },
    DiscountOptionsTitle: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_16,
        color: COLORS.primaryWhiteHex,
        marginBottom: SPACING.space_10,
    },
    DiscountOption: {
        backgroundColor: COLORS.primaryDarkGreyHex,
        borderRadius: BORDERRADIUS.radius_15,
        padding: SPACING.space_15,
        marginBottom: SPACING.space_15,
        borderWidth: 2,
    },
    DiscountOptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.space_10,
    },
    DiscountOptionTitle: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_16,
        color: COLORS.primaryWhiteHex,
    },
    DiscountOptionAmount: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_16,
    },
    DiscountOptionDescription: {
        fontFamily: FONTFAMILY.poppins_regular,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryLightGreyHex,
        marginBottom: SPACING.space_10,
    },
    DiscountOptionError: {
        fontFamily: FONTFAMILY.poppins_regular,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryRedHex,
    },
    PointsInputContainer: {
        marginTop: SPACING.space_10,
    },
    // Apply Discount Button Styles
    ApplyDiscountButton: {
        backgroundColor: COLORS.primaryOrangeHex,
        paddingVertical: SPACING.space_12,
        paddingHorizontal: SPACING.space_20,
        borderRadius: BORDERRADIUS.radius_10,
        alignItems: 'center',
        marginTop: SPACING.space_10,
    },
    ApplyDiscountButtonText: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryWhiteHex,
    },
    // Applied Discount Styles
    AppliedDiscountContainer: {
        backgroundColor: COLORS.primaryGreenHex + '20', // 20 is for opacity
        padding: SPACING.space_12,
        borderRadius: BORDERRADIUS.radius_10,
        marginTop: SPACING.space_10,
    },
    AppliedDiscountText: {
        fontFamily: FONTFAMILY.poppins_medium,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryGreenHex,
        textAlign: 'center',
    },
    // Comparison Styles
    ComparisonContainer: {
        backgroundColor: COLORS.primaryDarkGreyHex,
        borderRadius: BORDERRADIUS.radius_15,
        padding: SPACING.space_15,
        marginTop: SPACING.space_15,
    },
    ComparisonTitle: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_16,
        color: COLORS.primaryWhiteHex,
        marginBottom: SPACING.space_10,
    },
    ComparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.space_8,
    },
    ComparisonOption: {
        fontFamily: FONTFAMILY.poppins_regular,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryLightGreyHex,
    },
    ComparisonValue: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryOrangeHex,
    },
    // Loading Styles
    LoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    LoadingText: {
        fontFamily: FONTFAMILY.poppins_medium,
        fontSize: FONTSIZE.size_16,
        color: COLORS.primaryWhiteHex,
        marginTop: SPACING.space_15,
    },
    // Debug Styles
    DebugContainer: {
        backgroundColor: COLORS.primaryDarkGreyHex,
        padding: SPACING.space_10,
        borderRadius: BORDERRADIUS.radius_10,
        marginTop: SPACING.space_10,
    },
    DebugText: {
        fontFamily: FONTFAMILY.poppins_regular,
        fontSize: FONTSIZE.size_12,
        color: COLORS.primaryLightGreyHex,
    },
    // Reset Button Styles
    ResetButton: {
        backgroundColor: COLORS.primaryDarkGreyHex,
        paddingVertical: SPACING.space_12,
        paddingHorizontal: SPACING.space_20,
        borderRadius: BORDERRADIUS.radius_10,
        alignItems: 'center',
        marginTop: SPACING.space_12,
    },
    ResetButtonText: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryWhiteHex,
    },
    // Credit Card Styles
    CreditCardContainer: {
        padding: SPACING.space_10,
        gap: SPACING.space_10,
        borderRadius: BORDERRADIUS.radius_15,
        borderWidth: 3,
    },
    CreditCardTitle: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_14,
        color: COLORS.primaryWhiteHex,
        marginLeft: SPACING.space_10,
    },
    CreditCardBG: {
        backgroundColor: COLORS.primaryGreyHex,
        borderRadius: BORDERRADIUS.radius_25,
    },
    LinearGradientStyle: {
        borderRadius: BORDERRADIUS.radius_25,
        gap: SPACING.space_36,
        paddingHorizontal: SPACING.space_15,
        paddingVertical: SPACING.space_10,
    },
    CreditCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    CreditCardNumberContainer: {
        flexDirection: 'row',
        gap: SPACING.space_10,
        alignItems: 'center',
    },
    CreditCardNumber: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_18,
        color: COLORS.primaryWhiteHex,
        letterSpacing: SPACING.space_4 + SPACING.space_2,
    },
    CreditCardNameContainer: {
        alignItems: 'flex-start',
    },
    CreditCardNameSubtitle: {
        fontFamily: FONTFAMILY.poppins_regular,
        fontSize: FONTSIZE.size_12,
        color: COLORS.secondaryLightGreyHex,
    },
    CreditCardNameTitle: {
        fontFamily: FONTFAMILY.poppins_medium,
        fontSize: FONTSIZE.size_18,
        color: COLORS.primaryWhiteHex,
    },
    CreditCardDateContainer: {
        alignItems: 'flex-end',
    },
    // Price Styles
    PriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.space_8,
    },
    PriceText: {
        fontFamily: FONTFAMILY.poppins_medium,
        fontSize: FONTSIZE.size_14,
        color: COLORS.secondaryLightGreyHex,
    },
    TotalRow: {
        borderTopWidth: 1,
        borderTopColor: COLORS.primaryDarkGreyHex,
        paddingTop: SPACING.space_12,
        marginTop: SPACING.space_8,
    },
    TotalText: {
        fontFamily: FONTFAMILY.poppins_semibold,
        fontSize: FONTSIZE.size_16,
        color: COLORS.primaryWhiteHex,
    },
});
