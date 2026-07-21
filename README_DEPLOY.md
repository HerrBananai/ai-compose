# AI Compose – Deploy auf dein iPhone (Windows, ohne Mac)

Du hast keinen Mac. Der Build läuft komplett in der **Expo-Cloud (EAS Build)**,
die fertige `.ipa` installierst du per **AltStore** oder **Sideloadly** mit deiner
kostenlosen Apple-ID (7-Tage-Signatur, Auto-Refresh).

---

## 0. Einmalig: Werkzeuge auf dem PC

```powershell
# Node LTS installieren (nodejs.org), dann:
npm install -g eas-cli
cd G:\ios_app_aicompose
npm install
```

Expo-Account (kostenlos) anlegen und einloggen:

```powershell
eas login
```

Danach das Projekt mit deinem EAS-Account verknüpfen (setzt automatisch die
`projectId` in `app.json`):

```powershell
eas init
```

> Der Wert `extra.eas.projectId` in `app.json` steht aktuell auf
> `REPLACE_WITH_YOUR_EAS_PROJECT_ID` – `eas init` ersetzt ihn für dich.

---

## 1. Dev-Build ziehen (früh auf dem iPhone testen)

VisionCamera + Frame Processors laufen **nicht in Expo Go**. Du brauchst einen
eigenen Dev-Build. Weil du sowieso ohne Mac baust: einfach das `preview`-Profil
nehmen – das ist eine echte, installierbare `.ipa`.

```powershell
eas build -p ios --profile preview
```

Beim ersten iOS-Build fragt EAS nach Signing:

- **"Do you want EAS to handle code signing?" → Yes.**
- Apple-ID eingeben (deine kostenlose reicht für internal distribution / Ad-hoc).
- EAS legt Distribution-Zertifikat + Provisioning-Profil automatisch an.
- Dein iPhone muss als Gerät registriert sein: EAS führt dich durch
  `eas device:create` (QR-Code am iPhone öffnen → Profil installieren). Ohne
  registriertes Gerät startet die App nach der Installation nicht.

Wenn der Build durch ist, bekommst du einen **Download-Link zur `.ipa`** (auch unter
[expo.dev](https://expo.dev) → dein Projekt → Builds). Lade sie auf den PC.

---

## 2. `.ipa` aufs iPhone – AltStore ODER Sideloadly

### Voraussetzungen auf dem PC (für beide Wege)

1. **iTunes** – NICHT die Microsoft-Store-Version, sondern die klassische von
   apple.com (die Store-Version funktioniert mit AltStore/Sideloadly oft nicht).
2. **iCloud für Windows** – ebenfalls die Version von apple.com.
   Beide liefern die "Apple Mobile Device"-Treiber + **Bonjour**, die zum
   Erkennen/Signieren des iPhones nötig sind.
3. iPhone per USB anstöpseln, am iPhone **"Diesem Computer vertrauen"** bestätigen.

### iPhone: Developer Mode aktivieren (iOS 16+)

`Einstellungen → Datenschutz & Sicherheit → Entwicklermodus → an → iPhone neu
starten`. (Der Punkt taucht erst auf, nachdem einmal eine sideloaded App
installiert wurde – zur Not: erst installieren, dann Developer Mode anschalten.)

### Weg A – Sideloadly (am einfachsten für einen Einmal-Install)

1. [sideloadly.io](https://sideloadly.io) installieren, starten.
2. iPhone auswählen, `AI Compose.ipa` reinziehen.
3. Apple-ID (deine kostenlose) eintragen → **Start**.
4. App landet auf dem iPhone. Danach auf dem iPhone:
   `Einstellungen → Allgemein → VPN & Geräteverwaltung → dein Apple-ID-Profil →
   Vertrauen`.
5. Signatur gilt **7 Tage**. Zum Verlängern die `.ipa` einfach erneut mit
   Sideloadly installieren.

### Weg B – AltStore (bequemer, weil Auto-Refresh)

1. [altstore.io](https://altstore.io) → **AltServer** auf dem PC installieren.
2. AltServer starten (Icon in der Taskleiste) → **Install AltStore** → iPhone
   auswählen → Apple-ID eingeben. AltStore-App landet aufs iPhone.
3. Am iPhone das Apple-ID-Profil unter *Geräteverwaltung* **vertrauen**.
4. `AI Compose.ipa` per AltStore installieren:
   AltServer-Icon → **Install .ipa** → Datei wählen. (Oder in der AltStore-App
   am iPhone unter "My Apps" → **+**.)
5. **Auto-Refresh**: Solange AltServer auf dem PC läuft und iPhone + PC im selben
   WLAN sind (Bonjour!), erneuert AltStore die 7-Tage-Signatur automatisch im
   Hintergrund. Einmal eingerichtet = fertig.

---

## 3. In der App: Gemini-Key eintragen

1. App öffnen → **Zahnrad oben rechts**.
2. Kostenlosen Key holen: <https://aistudio.google.com/app/apikey>
3. Key einfügen → **Speichern**. Liegt sicher im iOS-Keychain (secure-store).
4. Modell wählen: Standard **gemini-3-flash**, Fallback **gemini-2.5-flash**.

---

## 4. Neue Version bauen (nach Code-Änderungen)

```powershell
eas build -p ios --profile preview
```

Neue `.ipa` runterladen und wie in Schritt 2 installieren. Bei AltStore reicht
"Install .ipa" über die neue Datei.

---

## ⚠️ Datenschutz-Hinweis (wichtig)

- Beim Antippen von **"AI Compose"** wird das **aktuelle Kamera-Frame an Google
  Gemini** gesendet. Nur dann – die Echtzeit-Führung (Ring/Pfeil) läuft
  **komplett on-device** und schickt nichts ins Netz.
- Im **Gemini Free-Tier** kann Google die gesendeten Inhalte **zum Training der
  Modelle verwenden**. Für private Nutzung ok – aber **fotografiere damit keine
  sensiblen/privaten Motive**, die du nicht bei Google sehen willst.
- Willst du das ausschließen: bezahlter Gemini-Tier (kein Training) oder ein
  eigenes Backend. Beides ist hier bewusst nicht eingebaut (Ziel: kostenlos).

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| App startet nicht / "could not verify" | Apple-ID-Profil am iPhone unter *Geräteverwaltung* vertrauen; Developer Mode an. |
| Build-Fehler bei Signing | `eas device:create` erneut, iPhone-UDID muss im Profil sein; danach neu bauen. |
| Kamera schwarz | App einmal komplett schließen und neu öffnen; Kamera-Berechtigung in iOS-Einstellungen prüfen. |
| "Rate-Limit erreicht" | Free-Tier-Limit von Gemini – kurz warten, erneut antippen. |
| iPhone wird am PC nicht erkannt | Klassisches iTunes **und** iCloud von apple.com installieren (bringen Bonjour + Treiber); USB-Kabel/Port wechseln. |
| Signatur nach 7 Tagen abgelaufen | Sideloadly: `.ipa` neu installieren. AltStore: AltServer am PC laufen lassen (Auto-Refresh). |
