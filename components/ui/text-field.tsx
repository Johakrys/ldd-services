import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = TextInputProps & {
  label: string;
  /** Marca visual de campo obligatorio. */
  required?: boolean;
};

/** Campo de texto etiquetado, adaptado al tema claro/oscuro. */
export function TextField({ label, required, style, ...rest }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.text }]}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={c.icon}
        style={[
          styles.input,
          { backgroundColor: c.inputBg, borderColor: c.border, color: c.text },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  req: { color: '#E5544B' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
});
