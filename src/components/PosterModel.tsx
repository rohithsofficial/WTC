//src/component/posterModel.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { COLORS, FONTFAMILY, FONTSIZE, SPACING } from "../theme/theme";
import { MaterialIcons } from "@expo/vector-icons";

interface Poster {
  id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  actionUrl?: string;
}

interface PosterModalProps {
  visible: boolean;
  onClose: () => void;
  posters: Poster[];
}

const { width } = Dimensions.get("window");

const PosterModal: React.FC<PosterModalProps> = ({
  visible,
  onClose,
  posters,
}) => {
  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
  const [remainingPosters, setRemainingPosters] = useState<Poster[]>([]);

  useEffect(() => {
    if (posters && posters.length > 0) {
      setRemainingPosters(posters);
      setCurrentPosterIndex(0);
    }
  }, [posters]);

  const handleClose = () => {
    if (currentPosterIndex < remainingPosters.length - 1) {
      // Show next poster
      setCurrentPosterIndex((prev) => prev + 1);
    } else {
      // No more posters to show
      setCurrentPosterIndex(0);
      setRemainingPosters([]);
      onClose();
    }
  };

  if (
    !remainingPosters.length ||
    currentPosterIndex >= remainingPosters.length
  ) {
    return null;
  }

  const currentPoster = remainingPosters[currentPosterIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: currentPoster.imageUrl }}
              style={styles.posterImage}
              resizeMode="contain"
              onLayout={(event) => {
                const { width: imageWidth, height: imageHeight } =
                  event.nativeEvent.layout;
                // Store image dimensions if needed
              }}
            />
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  position: "absolute",
                  top: 0,
                  right: 0,
                },
              ]}
              onPress={handleClose}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={COLORS.primaryWhiteHex}
              />
            </TouchableOpacity>
          </View>
          {currentPoster.title && (
            <Text style={styles.title}>{currentPoster.title}</Text>
          )}
          {currentPoster.description && (
            <Text style={styles.description}>{currentPoster.description}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: width * 0.9,
    alignItems: "center",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
  },
  posterImage: {
    width: "100%",
    height: width * 1.2,
  },
  closeButton: {
    zIndex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: SPACING.space_8,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: FONTFAMILY.poppins_semibold,
    fontSize: FONTSIZE.size_18,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_16,
    textAlign: "center",
  },
  description: {
    fontFamily: FONTFAMILY.poppins_regular,
    fontSize: FONTSIZE.size_14,
    color: COLORS.primaryWhiteHex,
    marginTop: SPACING.space_8,
    textAlign: "center",
  },
});

export default PosterModal;