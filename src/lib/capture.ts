import * as ImageManipulator from 'expo-image-manipulator';
import type { Camera } from 'react-native-vision-camera';

/**
 * Nimmt schnell ein Frame auf und liefert es als (verkleinertes) Base64-JPEG
 * für den Gemini-Call. Bewusst niedrigere Auflösung/Qualität:
 * spart Upload, Tokens und Zeit – der Look wird an der Vorschau angewandt,
 * nicht an diesem Analyse-Frame.
 */
export async function captureFrameBase64(camera: Camera): Promise<string> {
  const photo = await camera.takePhoto({
    flash: 'off',
    enableShutterSound: false,
    qualityPrioritization: 'speed',
  });

  const manipulated = await ImageManipulator.manipulateAsync(
    `file://${photo.path}`,
    [{ resize: { width: 1024 } }],
    {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!manipulated.base64) {
    throw new Error('base64 encode failed');
  }
  return manipulated.base64;
}
