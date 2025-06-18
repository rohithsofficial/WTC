# WTC Coffee Shop - Mobile Application

## Project Overview
WTC Coffee Shop is a comprehensive React Native mobile application built for a coffee shop business. It offers a complete digital ordering and loyalty system that serves customers with advanced features for ordering, payment processing, and loyalty management.

## Technology Stack
- **Frontend Framework:** React Native with Expo SDK 53
- **Navigation:** Expo Router for file-based routing
- **State Management:** Zustand for global state management
- **Backend:** Firebase (Firestore, Authentication, Storage)
- **Language:** TypeScript for type safety
- **UI Components:** Custom components with React Native Vector Icons
- **Animations:** Lottie animations and React Native Reanimated
- **Payment Integration:** Currently exploring payment gateway options (PhonePe business account under consideration)
- **QR Code:** QR code scanning and generation
- **Maps:** React Native Maps for location services

## Current Application Features

### Customer Features
1. **Product Catalog:** Browse coffee products with detailed information, pricing, and images
2. **Shopping Cart:** Add items with size variations and quantity management
3. **Order Management:** Place orders for dine-in and takeaway
4. **Loyalty System:** Earn points on purchases (0.1 points per ₹1 spent)
5. **Points Redemption:** Redeem points for discounts (1 point = ₹1 value)
6. **Order Tracking:** Real-time order status updates
7. **Profile Management:** User profiles with order history and preferences

## Technical Highlights
- **Offline Capability:** AsyncStorage for offline data persistence
- **Real-time Updates:** Firebase real-time database for live order tracking
- **Security:** Firebase Authentication with phone number verification
- **Performance:** Optimized image loading and lazy loading
- **Cross-platform:** Works on iOS, Android, and Web platforms
- **Scalable Architecture:** Modular code structure with custom hooks and services

## Loyalty System Details
- **Points earned:** 0.1 points per ₹1 spent
- **Points redemption:** 1 point = ₹1 discount
- **First-time user discount:** ₹100 off
- **Birthday bonus:** 100 points
- **Minimum order for points:** ₹100
- **Flat discount:** 10% on orders

## Future Development Plans (After App Completion)

### Admin Dashboard Website (Separate Project)
**Status:** Planned for development after mobile app completion

**Purpose:** A comprehensive web-based admin dashboard for complete business management

**Planned Features:**

1. **Product Management:**
   - Add, edit, and delete products
   - Manage product categories
   - Upload product images
   - Set pricing and availability
   - Inventory tracking

2. **Category Management:**
   - Create and manage product categories
   - Set category icons and descriptions
   - Organize product hierarchy

3. **Order Management:**
   - View all orders in real-time
   - Update order statuses
   - Order analytics and reporting

4. **Customer Management:**
   - View customer profiles and history
   - Manage loyalty points manually

5. **Analytics Dashboard:**
   - Sales reports and trends
   - Revenue analytics
   - Popular products analysis
   - Loyalty program performance

6. **Offer Management:**
   - Create promotional offers
   - Set discount rules
   - Schedule campaigns
   - Track offer performance

7. **Settings & Configuration:**
   - Loyalty system configuration
   - Payment gateway settings
   - App configuration
   - Business hours and policies

**Technology Stack (Planned):**
- **Frontend:** React.js with TypeScript
- **UI Framework:** Material-UI or Ant Design
- **State Management:** Redux Toolkit or Zustand
- **Backend:** Same Firebase backend (shared with mobile app)
- **Charts:** Chart.js or Recharts for analytics
- **Deployment:** Vercel or Netlify

**Integration Benefits:**
- Connects to the same Firebase project as the mobile app
- Shared database ensures data consistency
- Real-time updates between mobile app and admin dashboard
- Single source of truth for all business data

## Current Status
✅ **Mobile Application:** In development mode (approximately 50-60% complete)
🔄 **Admin Dashboard:** Will be implemented as a website after app development completion

## Architecture Benefits
- **Shared Backend:** Both mobile app and future admin dashboard will use the same Firebase backend
- **Data Consistency:** Single source of truth for all business data
- **Real-time Sync:** Changes in admin dashboard will immediately reflect in mobile app
- **Cost Effective:** Shared Firebase resources reduce infrastructure costs
- **Scalability:** Modular architecture allows easy feature additions

## Summary
This application represents a complete digital transformation of a coffee shop business. It provides customers with a modern ordering experience while building customer loyalty through a sophisticated points system. The planned admin dashboard will provide complete business management capabilities through a web interface, creating a comprehensive solution for both customers and business owners.


#for local install for apk 
eas build --platform android --profile preview --local(only work for linux and ios not for windows)
