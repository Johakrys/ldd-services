import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

/** Muestra una foto a pantalla completa con opción de descargar/compartir. */
export function PhotoViewer({
  uri,
  visible,
  onClose,
}: {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!uri || downloading) return;
    setDownloading(true);
    try {
      const filename = fileName(uri);
      if (Platform.OS === 'web') {
        const blob = await fetch(uri).then((r) => r.blob());
        const g: any = globalThis;
        const url = g.URL.createObjectURL(blob);
        const a = g.document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => g.URL.revokeObjectURL(url), 1500);
      } else {
        const dest = FileSystem.cacheDirectory + filename;
        const { uri: localUri } = await FileSystem.downloadAsync(uri, dest);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri, { mimeType: 'image/jpeg', dialogTitle: filename });
        }
      }
    } catch {
      // ignorar errores de descarga
    }
    setDownloading(false);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.toolbar}>
          <Pressable onPress={download} hitSlop={12} style={styles.tBtn}>
            {downloading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={26} color="#fff" />
            )}
          </Pressable>
          <Pressable onPress={onClose} hitSlop={12} style={styles.tBtn}>
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>
        </View>
        <Pressable style={styles.imageWrap} onPress={onClose}>
          {uri ? <Image source={{ uri }} style={styles.image} contentFit="contain" /> : null}
        </Pressable>
      </View>
    </Modal>
  );
}

function fileName(uri: string): string {
  const path = uri.split('?')[0];
  const base = path.substring(path.lastIndexOf('/') + 1);
  return base && base.includes('.') ? base : 'foto.jpg';
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingTop: Platform.OS === 'web' ? 16 : 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tBtn: { padding: 8 },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  image: { width: '100%', height: '100%' },
});
