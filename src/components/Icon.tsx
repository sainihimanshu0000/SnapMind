import React from 'react';
import { StyleSheet, View } from 'react-native';

export type IconName =
  | 'home'
  | 'search'
  | 'collections'
  | 'cleanup'
  | 'settings'
  | 'star'
  | 'starOutline'
  | 'clock'
  | 'plus'
  | 'back'
  | 'close';

type IconProps = {
  name: IconName;
  color: string;
  size?: number;
};

export function Icon({ name, color, size = 18 }: IconProps) {
  if (name === 'home') {
    return (
      <View style={[styles.box, { width: size, height: size, borderColor: color }]}>
        <View style={[styles.homeRoof, { borderBottomColor: color }]} />
      </View>
    );
  }
  if (name === 'search') {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.circle,
            {
              width: size * 0.7,
              height: size * 0.7,
              borderColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.searchHandle,
            {
              backgroundColor: color,
              width: size * 0.38,
              right: 0,
              bottom: 1,
            },
          ]}
        />
      </View>
    );
  }
  if (name === 'collections') {
    const cell = size * 0.38;
    return (
      <View style={{ width: size, height: size, justifyContent: 'space-between' }}>
        <View style={styles.row}>
          <View style={[styles.cell, { width: cell, height: cell, borderColor: color }]} />
          <View style={[styles.cell, { width: cell, height: cell, borderColor: color }]} />
        </View>
        <View style={styles.row}>
          <View style={[styles.cell, { width: cell, height: cell, borderColor: color }]} />
          <View style={[styles.cell, { width: cell, height: cell, borderColor: color }]} />
        </View>
      </View>
    );
  }
  if (name === 'cleanup') {
    return (
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderColor: color, borderRadius: size / 2 },
        ]}
      />
    );
  }
  if (name === 'settings') {
    return (
      <View style={{ width: size, height: size, justifyContent: 'space-between', paddingVertical: 2 }}>
        <View style={[styles.line, { backgroundColor: color, width: size }]} />
        <View style={[styles.line, { backgroundColor: color, width: size * 0.7 }]} />
        <View style={[styles.line, { backgroundColor: color, width: size * 0.85 }]} />
      </View>
    );
  }
  if (name === 'star' || name === 'starOutline') {
    return (
      <View
        style={[
          styles.diamond,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderColor: color,
            backgroundColor: name === 'star' ? color : 'transparent',
          },
        ]}
      />
    );
  }
  if (name === 'clock') {
    return (
      <View style={[styles.circle, { width: size, height: size, borderColor: color, borderRadius: size / 2 }]}>
        <View style={[styles.clockHand, { backgroundColor: color, height: size * 0.32 }]} />
      </View>
    );
  }
  if (name === 'plus') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.plusBar, { backgroundColor: color, width: size * 0.7 }]} />
        <View
          style={[
            styles.plusBarVertical,
            { backgroundColor: color, height: size * 0.7 },
          ]}
        />
      </View>
    );
  }
  if (name === 'back') {
    return (
      <View
        style={[
          styles.chevron,
          { borderColor: color, width: size * 0.42, height: size * 0.42 },
        ]}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.plusBar, { backgroundColor: color, width: size * 0.55, transform: [{ rotate: '45deg' }] }]} />
      <View
        style={[
          styles.plusBarVertical,
          { backgroundColor: color, height: size * 0.55, transform: [{ rotate: '45deg' }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.8,
    borderRadius: 3,
  },
  homeRoof: {
    position: 'absolute',
    top: -5,
    left: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  circle: {
    borderWidth: 1.8,
    borderRadius: 99,
  },
  searchHandle: {
    position: 'absolute',
    height: 2,
    transform: [{ rotate: '40deg' }],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderWidth: 1.6,
    borderRadius: 2,
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
  diamond: {
    borderWidth: 1.8,
    transform: [{ rotate: '45deg' }],
    margin: 2,
  },
  clockHand: {
    width: 1.6,
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
  },
  plusBar: {
    height: 2.4,
    borderRadius: 1,
    position: 'absolute',
  },
  plusBarVertical: {
    width: 2.4,
    borderRadius: 1,
    position: 'absolute',
  },
  chevron: {
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginLeft: 6,
  },
});
