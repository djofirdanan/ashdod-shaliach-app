// ============================================================
// INPUT COMPONENT - אשדוד-שליח Courier App
// ============================================================

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  isPassword?: boolean;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      isPassword = false,
      required = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const hasError = !!error;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.focused,
            hasError && styles.errorBorder,
          ]}
        >
          {leftIcon && (
            <Ionicons
              name={leftIcon as any}
              size={20}
              color={hasError ? Colors.error : isFocused ? Colors.primary : Colors.textSecondary}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={ref}
            style={[styles.input, leftIcon && styles.inputWithLeftIcon, inputStyle]}
            placeholderTextColor={Colors.textTertiary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isPassword && !showPassword}
            textAlign="right"
            {...props}
          />

          {(isPassword || rightIcon) && (
            <TouchableOpacity
              onPress={isPassword ? () => setShowPassword(!showPassword) : onRightIconPress}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons
                name={
                  isPassword
                    ? showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                    : (rightIcon as any)
                }
                size={20}
                color={Colors.textSecondary}
                style={styles.rightIcon}
              />
            </TouchableOpacity>
          )}
        </View>

        {hasError && <Text style={styles.error}>{error}</Text>}
        {hint && !hasError && <Text style={styles.hint}>{hint}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.labelLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'right',
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  focused: {
    borderColor: Colors.borderFocus,
    backgroundColor: Colors.white,
  },
  errorBorder: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'center',
  },
  inputWithLeftIcon: {
    marginLeft: Spacing.sm,
  },
  leftIcon: {
    marginRight: Spacing.xs,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
  error: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  hint: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});

export default Input;
