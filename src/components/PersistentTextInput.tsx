import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';

interface PersistentTextInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

type TextInputRef = {
  focus: () => void;
  clear: () => void;
  // Add other methods you need to expose
};

const PersistentTextInput = forwardRef<TextInputRef, PersistentTextInputProps>(
  ({ value, onChangeText, ...props }, ref) => {
    const inputRef = useRef<RNTextInput>(null);

    // Expose only necessary methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => inputRef.current?.clear()
    }));

    return (
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="characters"
        keyboardType="default"
        returnKeyType="next"
        blurOnSubmit={false}
        style={styles.input}
        {...props}
      />
    );
  }
);

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default PersistentTextInput;
