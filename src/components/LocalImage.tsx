import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import RNFS from 'react-native-fs';
import { colors } from '../constants/theme';
import { stripFileScheme, toDisplayUri } from '../utils/imageUri';

type LocalImageProps = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
};

export function LocalImage({
  uri,
  style,
  resizeMode = 'cover',
}: LocalImageProps) {
  const [source, setSource] = useState(toDisplayUri(uri));

  useEffect(() => {
    setSource(toDisplayUri(uri));
  }, [uri]);

  return (
    <Image
      source={{ uri: source }}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      onError={() => {
        void (async () => {
          if (source.startsWith('data:')) {
            return;
          }
          try {
            const path = stripFileScheme(uri);
            const exists = await RNFS.exists(path);
            if (!exists) {
              return;
            }
            const base64 = await RNFS.readFile(path, 'base64');
            const lower = path.toLowerCase();
            const mime = lower.endsWith('.png')
              ? 'image/png'
              : lower.endsWith('.webp')
                ? 'image/webp'
                : 'image/jpeg';
            setSource(`data:${mime};base64,${base64}`);
          } catch {
            // Keep the broken image background rather than crashing.
          }
        })();
      }}
    />
  );
}

export function LocalImagePlaceholder({
  style,
}: {
  style?: StyleProp<ImageStyle>;
}) {
  return <View style={[styles.image, style]} />;
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.softLavender,
  },
});
