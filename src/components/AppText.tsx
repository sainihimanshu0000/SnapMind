import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { fonts } from '../constants/theme';

/**
 * Default app text uses Plus Jakarta Sans Regular.
 * Pass fontFamily via style to override weight (medium/semiBold/bold).
 */
export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[styles.text, style]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return (
    <RNTextInput
      {...props}
      style={[styles.input, style]}
      placeholderTextColor={
        props.placeholderTextColor ?? undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.regular,
  } as TextStyle,
  input: {
    fontFamily: fonts.regular,
  } as TextStyle,
});
