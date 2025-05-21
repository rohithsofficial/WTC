import { NavigatorScreenParams } from '@react-navigation/native';
import { Store, Product } from './interfaces';

export type MainTabParamList = {
  Home: undefined;
  Menu: undefined;
  Order: { product?: Product };
  Rewards: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  StoreLocator: { store?: Store };
  Cart: undefined;
  OrderHistory: undefined;
}; 