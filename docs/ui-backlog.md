# UI-Backlog (AI Compose)

Merker für die Kamera-UI-Arbeit. Reihenfolge = grobe Priorität.

## Erledigt
- **Gyro-Zielring: echtes World-Anchoring** – fester Weltvektor aus fusionierter
  Geräte-Lage, volle 3D-Projektion (kein Drift, kein „im Kreis wandern").
- **Ring-Glättung** – One-Euro-Filter (ruhig im Stand, reaktiv beim Schwenken),
  60 Hz. Zoom-korrigiert: Ring klebt auch reingezoomt an der Szene.
- **UI #1: 4:3-Kamerafeld mittig**, Bedien-Elemente isoliert im Panel darunter,
  Seitenrand links/rechts. Overlay liegt im Feld -> Ring-Koordinaten = echtes Foto.
- **Icon-Kontrast** oben (Glyphen waren schwarz auf schwarz -> jetzt sichtbar).

## Offen
1. **Frontkamera + Blitz** – Umschalter vorne/hinten. Front-„Blitz" = heller
   weißer Screen-Flash (Display kurz auf Weiß + max. Helligkeit).
2. **Zoom-Leiste `0.5x · 1x · 2x · 3x · Makro`** mit echten Objektiven
   (Lens-Switch statt reinem Digitalzoom, wo vorhanden).
3. **Smooth Zooming** – weiche/animierte Zoom-Übergänge statt harter Sprünge
   zwischen den Stufen (und Pinch-to-Zoom butterweich).
4. **Auto-Zoom beim Einrasten** – wenn der Gyro-Ring unter dem Fadenkreuz
   einrastet, automatisch passend zoomen.
5. **Querformat** – Landscape-Layout (später, Konzept offen).
