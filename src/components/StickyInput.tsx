import React, { forwardRef, useRef, useEffect } from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';

interface StickyInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

const StickyInput = forwardRef<RNTextInput, StickyInputProps>(({ value, onChangeText, ...props }, ref) => {
  const inputRef = useRef<RNTextInput>(null);
  
  // Keep the input focused
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && !inputRef.current.isFocused()) {
        inputRef.current.focus();
      }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [value]);

  // Forward the ref
  React.useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => inputRef.current?.clear()
  }));

  return (
    <RNTextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      autoCorrect={false}
      keyboardType="default"
      returnKeyType="done"
      blurOnSubmit={false}
      style={styles.input}
      {...props}
    />
  );
});

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

export default StickyInput;
