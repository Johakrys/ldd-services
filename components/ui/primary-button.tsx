import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'solid' | 'ghost';
};

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  variant = 'solid',
}: Props) {
  const blocked = disabled || loading;
  const ghost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        ghost ? styles.ghost : { backgroundColor: Brand },
        { opacity: blocked ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={ghost ? Brand : '#fff'} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={ghost ? Brand : '#fff'} /> : null}
          <Text style={[styles.text, { color: ghost ? Brand : '#fff' }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Brand },
  text: { fontSize: 16, fontWeight: '700' },
});
