import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'solid' | 'ghost' | 'danger';
};

const DANGER = '#E5544B';

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
  const fg = ghost ? Brand : '#fff';
  const bg = variant === 'danger' ? { backgroundColor: DANGER } : { backgroundColor: Brand };

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        ghost ? styles.ghost : bg,
        { opacity: blocked ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
          <Text style={[styles.text, { color: fg }]}>{title}</Text>
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
