import * as FileSystem from 'expo-file-system';
import { ImageFormat, Skia } from '@shopify/react-native-skia';

import { IDENTITY_COLOR_MATRIX } from './filters';

function isIdentity(matrix: number[]): boolean {
  if (matrix.length !== IDENTITY_COLOR_MATRIX.length) return false;
  for (let i = 0; i < matrix.length; i++) {
    if (Math.abs((matrix[i] ?? 0) - (IDENTITY_COLOR_MATRIX[i] ?? 0)) > 1e-4) return false;
  }
  return true;
}

/**
 * Rendert das aufgenommene JPEG mit der Filter-Color-Matrix per Skia-Offscreen
 * neu und schreibt es in den Cache. So landet exakt der Look im gespeicherten
 * Foto, den die Vorschau zeigt. Bei neutralem Filter wird das Original genutzt.
 *
 * @returns file:// URI des zu speichernden Bildes.
 */
export async function applyFilterToPhoto(path: string, matrix: number[]): Promise<string> {
  const srcUri = path.startsWith('file://') ? path : `file://${path}`;
  if (isIdentity(matrix)) return srcUri;

  try {
    const data = await Skia.Data.fromURI(srcUri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return srcUri;

    const w = image.width();
    const h = image.height();
    const surface = Skia.Surface.MakeOffscreen(w, h);
    if (!surface) return srcUri;

    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
    canvas.drawImage(image, 0, 0, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 95);

    const outUri = `${FileSystem.cacheDirectory}aicompose_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(outUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return outUri;
  } catch {
    // Im Zweifel lieber das Original speichern als gar nichts.
    return srcUri;
  }
}
