// ================================
// LOGGING TYPES AND INTERFACES
// ================================

import { Timestamp } from 'firebase/firestore';

const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

const LogCategory = {
  LOYALTY: 'LOYALTY',
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  AUTH: 'AUTH',
  SYSTEM: 'SYSTEM',
  PERFORMANCE: 'PERFORMANCE',
  USER_ACTION: 'USER_ACTION',
};

/**
 * @typedef {Object} LogEntry
 * @property {string} id
 * @property {any} timestamp
 * @property {string} level
 * @property {string} category
 * @property {string} message
 * @property {string} [userId]
 * @property {string} [orderId]
 * @property {string} sessionId
 * @property {Object} [metadata]
 * @property {string} [stackTrace]
 * @property {Object} [deviceInfo]
 * @property {string} appVersion
 * @property {'development'|'staging'|'production'} environment
 */

/**
 * @typedef {Object} DeviceInfo
 * @property {string} platform
 * @property {string} version
 * @property {string} [model]
 * @property {string} [brand]
 * @property {string} uniqueId
 */

/**
 * @typedef {Object} PerformanceMetric
 * @property {string} id
 * @property {any} timestamp
 * @property {string} metricName
 * @property {number} value
 * @property {string} unit
 * @property {string} [userId]
 * @property {string} sessionId
 * @property {Object} [metadata]
 */

// ================================
// CORE LOGGER CLASS
// ================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class Logger {
  static instance;
  sessionId;
  deviceInfo;
  logQueue = [];
  performanceQueue = [];
  isOnline = true;
  batchSize = 10;
  flushInterval = 30000; // 30 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.getDeviceInfo();
    this.startPeriodicFlush();
    this.loadOfflineLogs();
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // ================================
  // LOYALTY SYSTEM LOGGING
  // ================================

  logLoyaltyPointsEarned(userId, orderId, points, orderAmount) {
    this.log(LogLevel.INFO, LogCategory.LOYALTY, 
      `User earned ${points} loyalty points from order`, {
      userId,
      orderId,
      pointsEarned: points,
      orderAmount,
      conversionRate: orderAmount / points
    });
  }

  logLoyaltyPointsRedeemed(userId, orderId, pointsRedeemed, discountAmount) {
    this.log(LogLevel.INFO, LogCategory.LOYALTY, 
      `User redeemed ${pointsRedeemed} loyalty points for ₹${discountAmount} discount`, {
      userId,
      orderId,
      pointsRedeemed,
      discountAmount,
      conversionRate: pointsRedeemed / discountAmount
    });
  }

  logLoyaltyBalanceUpdate(userId, previousBalance, newBalance, reason) {
    this.log(LogLevel.INFO, LogCategory.LOYALTY, 
      `Loyalty balance updated: ${previousBalance} → ${newBalance} (${reason})`, {
      userId,
      previousBalance,
      newBalance,
      difference: newBalance - previousBalance,
      reason
    });
  }

  logLoyaltyTransactionError(userId, orderId, error, context) {
    this.log(LogLevel.ERROR, LogCategory.LOYALTY, 
      `Failed to process loyalty transaction: ${error.message}`, {
      userId,
      orderId,
      error: error.message,
      context,
      stackTrace: error.stack
    });
  }

  // ================================
  // ORDER SYSTEM LOGGING
  // ================================

  logOrderCreated(userId, orderId, orderData) {
    this.log(LogLevel.INFO, LogCategory.ORDER, 
      `Order created successfully`, {
      userId,
      orderId,
      orderType: orderData.orderType,
      totalAmount: orderData.totalAmount,
      itemCount: orderData.items?.length || 0,
      paymentMode: orderData.paymentMode,
      tableNumber: orderData.tableNumber
    });
  }

  logOrderPaymentProcessed(userId, orderId, paymentMode, amount) {
    this.log(LogLevel.INFO, LogCategory.PAYMENT, 
      `Payment processed successfully`, {
      userId,
      orderId,
      paymentMode,
      amount,
      processingTime: Date.now()
    });
  }

  logOrderError(userId, orderId, error, stage) {
    this.log(LogLevel.ERROR, LogCategory.ORDER, 
      `Order processing failed at ${stage}: ${error.message}`, {
      userId,
      orderId,
      stage,
      error: error.message,
      stackTrace: error.stack
    });
  }

  // ================================
  // USER ACTION LOGGING
  // ================================

  logUserAction(userId, action, screen, metadata) {
    this.log(LogLevel.INFO, LogCategory.USER_ACTION, 
      `User performed action: ${action} on ${screen}`, {
      userId,
      action,
      screen,
      ...metadata
    });
  }

  logScreenNavigation(userId, fromScreen, toScreen, params) {
    this.log(LogLevel.DEBUG, LogCategory.USER_ACTION, 
      `Navigation: ${fromScreen} → ${toScreen}`, {
      userId,
      fromScreen,
      toScreen,
      navigationParams: params
    });
  }

  // ================================
  // PERFORMANCE LOGGING
  // ================================

  logPerformanceMetric(metricName, value, unit, userId, metadata) {
    const metric = {
      id: this.generateId(),
      timestamp: Timestamp.now(),
      metricName,
      value,
      unit,
      userId,
      sessionId: this.sessionId,
      metadata
    };
    
    this.performanceQueue.push(metric);
    this.checkAndFlushPerformance();
  }

  startTimer(name) {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.logPerformanceMetric(`${name}_duration`, duration, 'ms');
    };
  }

  // ================================
  // CORE LOGGING METHODS
  // ================================

  log(level, category, message, metadata, error) {
    const logEntry = {
      id: this.generateId(),
      timestamp: Timestamp.now(),
      level,
      category,
      message,
      sessionId: this.sessionId,
      metadata,
      stackTrace: error?.stack,
      deviceInfo: this.deviceInfo,
      appVersion: '1.0.0', // Get from app config
      environment: __DEV__ ? 'development' : 'production',
      ...metadata?.userId && { userId: metadata.userId },
      ...metadata?.orderId && { orderId: metadata.orderId }
    };

    // Console logging for development
    if (__DEV__) {
      this.consoleLog(logEntry);
    }

    this.logQueue.push(logEntry);
    this.saveToLocalStorage(logEntry);
    this.checkAndFlush();
  }

  consoleLog(entry) {
    const color = this.getConsoleColor(entry.level);
    const prefix = `[${entry.level}][${entry.category}]`;
    
    console.log(
      `%c${prefix} ${entry.message}`,
      `color: ${color}; font-weight: bold;`,
      entry.metadata || ''
    );
  }

  getConsoleColor(level) {
    switch (level) {
      case LogLevel.DEBUG: return '#6B7280';
      case LogLevel.INFO: return '#3B82F6';
      case LogLevel.WARN: return '#F59E0B';
      case LogLevel.ERROR: return '#EF4444';
      case LogLevel.CRITICAL: return '#DC2626';
      default: return '#000000';
    }
  }

  // ================================
  // QUEUE MANAGEMENT
  // ================================

  checkAndFlush() {
    if (this.logQueue.length >= this.batchSize || !this.isOnline) {
      this.flushLogs();
    }
  }

  checkAndFlushPerformance() {
    if (this.performanceQueue.length >= this.batchSize) {
      this.flushPerformanceMetrics();
    }
  }

  async flushLogs() {
    if (this.logQueue.length === 0) return;

    try {
      if (this.isOnline) {
        const batch = writeBatch(db);
        const logsToFlush = [...this.logQueue];
        
        logsToFlush.forEach(log => {
          const docRef = doc(collection(db, 'logs'));
          batch.set(docRef, log);
        });

        await batch.commit();
        this.logQueue = [];
        await this.clearLocalStorage();
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Keep logs in queue for retry
    }
  }

  async flushPerformanceMetrics() {
    if (this.performanceQueue.length === 0) return;

    try {
      if (this.isOnline) {
        const batch = writeBatch(db);
        const metricsToFlush = [...this.performanceQueue];
        
        metricsToFlush.forEach(metric => {
          const docRef = doc(collection(db, 'performance_metrics'));
          batch.set(docRef, metric);
        });

        await batch.commit();
        this.performanceQueue = [];
      }
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
    }
  }

  // ================================
  // OFFLINE STORAGE
  // ================================

  async saveToLocalStorage(logEntry) {
    try {
      const key = `log_${logEntry.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(logEntry));
    } catch (error) {
      console.error('Failed to save log to local storage:', error);
    }
  }

  async loadOfflineLogs() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const logKeys = keys.filter(key => key.startsWith('log_'));
      
      for (const key of logKeys) {
        const logData = await AsyncStorage.getItem(key);
        if (logData) {
          const logEntry = JSON.parse(logData);
          this.logQueue.push(logEntry);
        }
      }
    } catch (error) {
      console.error('Failed to load offline logs:', error);
    }
  }

  async clearLocalStorage() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const logKeys = keys.filter(key => key.startsWith('log_'));
      await AsyncStorage.multiRemove(logKeys);
    } catch (error) {
      console.error('Failed to clear local storage:', error);
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  startPeriodicFlush() {
    setInterval(() => {
      this.flushLogs();
      this.flushPerformanceMetrics();
    }, this.flushInterval);
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: Device.modelName || 'Unknown',
      brand: Device.brand || 'Unknown',
      uniqueId: this.sessionId // Use session ID as unique identifier
    };
  }

  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    if (isOnline) {
      this.flushLogs();
      this.flushPerformanceMetrics();
    }
  }

  // ================================
  // PUBLIC CONVENIENCE METHODS
  // ================================

  debug(category, message, metadata) {
    this.log(LogLevel.DEBUG, category, message, metadata);
  }

  info(category, message, metadata) {
    this.log(LogLevel.INFO, category, message, metadata);
  }

  warn(category, message, metadata) {
    this.log(LogLevel.WARN, category, message, metadata);
  }

  error(category, message, error, metadata) {
    this.log(LogLevel.ERROR, category, message, metadata, error);
  }

  critical(category, message, error, metadata) {
    this.log(LogLevel.CRITICAL, category, message, metadata, error);
  }
}

// ================================
// REACT HOOK FOR LOGGING
// ================================

import { useCallback, useEffect } from 'react';

export const useLogger = (userId, screenName) => {
  const logger = Logger.getInstance();

  useEffect(() => {
    if (screenName && userId) {
      logger.logScreenNavigation(userId, 'previous', screenName);
    }
  }, [screenName, userId]);

  const logAction = useCallback((action, metadata) => {
    if (userId && screenName) {
      logger.logUserAction(userId, action, screenName, metadata);
    }
  }, [userId, screenName]);

  const logError = useCallback((error, context) => {
    logger.error(LogCategory.SYSTEM, `Error in ${screenName}: ${error.message}`, error, {
      userId,
      screen: screenName,
      context
    });
  }, [userId, screenName]);

  const startTimer = useCallback((name) => {
    return logger.startTimer(`${screenName}_${name}`);
  }, [screenName]);

  return {
    logAction,
    logError,
    startTimer,
    logger
  };
};

// ================================
// UPDATED PAYMENT SCREEN WITH LOGGING
// ================================

// Add this to your PaymentScreen component:

/*
import { useLogger } from '../logging/Logger';

const PaymentScreen = () => {
  const { logAction, logError, startTimer, logger } = useLogger(userId, 'PaymentScreen');

  // Inside buttonPressHandler:
  const buttonPressHandler = async () => {
    const paymentTimer = startTimer('payment_processing');
    
    try {
      logAction('payment_initiated', {
        paymentMode,
        amount,
        orderType,
        itemCount: items.length
      });

      setShowAnimation(true);

      const orderData: OrderData = {
        // ... your existing order data
      };

      // Log order creation attempt
      logger.logOrderCreated(userId, 'pending', orderData);

      const newOrderId = await saveOrderToFirestore(orderData);
      
      // Log successful order creation
      logger.logOrderCreated(userId, newOrderId, orderData);
      
      // Log payment processing
      logger.logOrderPaymentProcessed(userId, newOrderId, paymentMode, amount);
      
      // Log loyalty points if applicable
      const pointsEarned = Math.floor(amount / 10);
      logger.logLoyaltyPointsEarned(userId, newOrderId, pointsEarned, amount);

      setOrderId(newOrderId);
      clearCart();
      
      paymentTimer(); // End timer
      
      logAction('payment_completed', {
        orderId: newOrderId,
        pointsEarned
      });

      setTimeout(() => {
        setShowAnimation(false);
        router.push({
          pathname: '/OrderStatusScreen',
          params: { 
            orderId: newOrderId,
            // ... other params
          }
        });
      }, 1500);

    } catch (error) {
      paymentTimer(); // End timer even on error
      
      logger.logOrderError(userId, 'unknown', error, 'payment_processing');
      logError(error, 'payment_processing');
      
      setShowAnimation(false);
      Alert.alert('Payment Failed', 'Failed to save order details. Please try again.');
    }
  };
};
*/

export default Logger;