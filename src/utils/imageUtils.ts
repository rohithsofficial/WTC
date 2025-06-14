import { ImageSourcePropType } from 'react-native';

export const getImageSource = (uri: string | undefined | null): ImageSourcePropType => {
  if (uri && uri.trim() !== '') {
    return { uri };
  }
  return require('../../assets/icon.png');
};

export const getImageBackgroundSource = (uri: string | undefined | null): ImageSourcePropType => {
  if (uri && uri.trim() !== '') {
    return { uri };
  }
  return require('../../assets/icon.png');
}; 