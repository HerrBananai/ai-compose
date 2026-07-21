# AI Compose – Deploy auf dein iPhone (Windows, ohne Mac, kostenlos)

Du hast keinen Mac und willst **kein** bezahltes Apple-Developer-Program ($99/J).
Der Trick: eine **unsignierte `.ipa`** wird kostenlos auf einem **GitHub-macOS-Runner**
gebaut, und **Sideloadly** signiert sie lokal auf deinem PC mit deiner **kostenlosen
Apple-ID** (7-Tage-Free-Provisioning).

> **Warum nicht EAS Build?** EAS signiert iOS-Builds in der Cloud und braucht dafür
> Credentials aus dem **kostenpflichtigen** Apple Developer Program. Ein kostenloser
> Apple-Account kann die nicht erzeugen (daher der Fehler „Your developer account
> needs to be updated"). Deshalb bauen wir hier **unsigniert** und signieren lokal.
> Wenn du später $99/Jahr zahlst, funktioniert stattdessen einfach
> `eas build -p ios --profile preview` – dann ist dieser GitHub-Actions-Umweg unnötig.

---

## 0. Repo zu GitHub pushen (einmalig)

Der Build läuft in **GitHub Actions**, also muss der Code auf GitHub liegen.

```powershell
cd G:\ios_app_aicompose
# GitHub-Repo anlegen: github.com/new  (Name z.B. "ai-compose")
git remote add origin https://github.com/<DEIN-USER>/ai-compose.git
git branch -M main
git push -u origin main
```

> **Tipp:** Mach das Repo **public** – dann sind die macOS-Runner-Minuten
> **unbegrenzt kostenlos**. Bei einem *private* Repo zählen macOS-Minuten 10×
> gegen dein Gratis-Kontingent (~200 macOS-Min/Monat = ca. 10 Builds). Dein
> **Gemini-Key liegt NICHT im Code** (du gibst ihn in der App ein), public ist
> also unbedenklich.

---

## 1. Unsignierte `.ipa` in der Cloud bauen

1. GitHub → dein Repo → Tab **Actions**.
2. Links **„Build unsigned iOS IPA"** wählen → **Run workflow** → **Run**.
   (Alternativ lokal: `git tag ipa-1 && git push --tags` startet den Build auch.)
3. Warten (~15–20 Min). Wenn grün: unten unter **Artifacts** liegt
   **`AI-Compose-unsigned-ipa`** → herunterladen und die ZIP entpacken →
   darin `AI-Compose-unsigned.ipa`.

Der Workflow macht `expo prebuild` → `pod install` → `xcodebuild` **ohne Signing**
→ packt das `.app` als `.ipa`. Details: `.github/workflows/ios-unsigned.yml`.

---

## 2. `.ipa` aufs iPhone – Sideloadly (signiert lokal mit Gratis-ID)

### Voraussetzungen auf dem PC

1. **iTunes** – die klassische Version von **apple.com**, NICHT aus dem Microsoft
   Store (die Store-Version funktioniert mit Sideloadly/AltStore oft nicht).
2. **iCloud für Windows** – ebenfalls von apple.com.
   Beide liefern die „Apple Mobile Device"-Treiber + **Bonjour**, die zum Erkennen
   und Signieren des iPhones nötig sind.
3. iPhone per USB anstöpseln, am iPhone **„Diesem Computer vertrauen"** bestätigen.

### iPhone: Developer Mode aktivieren (iOS 16+)

`Einstellungen → Datenschutz & Sicherheit → Entwicklermodus → an → iPhone neu
starten`. (Taucht ggf. erst auf, nachdem einmal eine sideloaded App installiert
wurde – zur Not: erst installieren, dann Developer Mode anschalten.)

### Sideloadly

1. [sideloadly.io](https://sideloadly.io) installieren und starten.
2. iPhone auswählen, `AI-Compose-unsigned.ipa` ins Fenster ziehen.
3. Deine **kostenlose Apple-ID** eintragen → **Start**. Sideloadly erzeugt das
   Free-Provisioning-Profil und installiert die App.
4. Am iPhone: `Einstellungen → Allgemein → VPN & Geräteverwaltung → dein
   Apple-ID-Profil → Vertrauen`.
5. Signatur gilt **7 Tage**. Zum Verlängern die `.ipa` einfach erneut mit
   Sideloadly installieren (App-Daten/Key bleiben erhalten).

### Alternative: AltStore (bequemer, mit Auto-Refresh)

1. [altstore.io](https://altstore.io) → **AltServer** auf dem PC installieren + starten.
2. AltServer-Icon (Taskleiste) → **Install AltStore** → iPhone → Apple-ID eingeben.
3. Am iPhone das Apple-ID-Profil unter *Geräteverwaltung* **vertrauen**.
4. AltServer-Icon → **Install .ipa** → `AI-Compose-unsigned.ipa` wählen.
5. **Auto-Refresh:** Solange AltServer am PC läuft und iPhone + PC im selben WLAN
   sind (Bonjour!), erneuert AltStore die 7-Tage-Signatur automatisch.

---

## 3. In der App: Gemini-Key eintragen

1. App öffnen → **Zahnrad oben rechts**.
2. Kostenlosen Key holen: <https://aistudio.google.com/app/apikey>
3. Key einfügen → **Speichern** (liegt sicher im iOS-Keychain / secure-store).
4. Modell wählen: Standard **gemini-3-flash**, Fallback **gemini-2.5-flash**.

---

## 4. Neue Version bauen (nach Code-Änderungen)

```powershell
git add -A && git commit -m "..." && git push
```

Dann in **Actions** erneut **Run workflow** → neue `.ipa` aus den Artifacts laden
→ mit Sideloadly/AltStore installieren.

---

## ⚠️ Datenschutz-Hinweis (wichtig)

- Beim Antippen von **„AI Compose"** wird das **aktuelle Kamera-Frame an Google
  Gemini** gesendet. Nur dann – die Echtzeit-Führung (Ring/Pfeil) läuft
  **komplett on-device** und schickt nichts ins Netz.
- Im **Gemini Free-Tier** kann Google die gesendeten Inhalte **zum Training** der
  Modelle verwenden. Für private Nutzung ok – aber **fotografiere damit keine
  sensiblen/privaten Motive**, die du nicht bei Google sehen willst.
- Ausschließen lässt sich das nur mit bezahltem Gemini-Tier oder eigenem Backend –
  beides ist hier bewusst nicht eingebaut (Ziel: kostenlos).

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| Actions-Build rot bei `pod install` / `xcodebuild` | Log im fehlgeschlagenen Step öffnen; oft ein Versions-Mismatch. `npx expo install --fix` lokal laufen lassen, committen, neu pushen. |
| Kein `.app` gefunden | Scheme falsch erkannt – im Log den Step „Workspace & Scheme ermitteln" prüfen. Melde dich, dann passe ich den Workflow an. |
| App startet nicht / „could not verify" | Apple-ID-Profil am iPhone unter *Geräteverwaltung* vertrauen; Developer Mode an. |
| Kamera schwarz | App einmal komplett schließen und neu öffnen; Kamera-Berechtigung in iOS-Einstellungen prüfen. |
| „Rate-Limit erreicht" | Gemini-Free-Tier-Limit – kurz warten, erneut antippen. |
| iPhone am PC nicht erkannt | Klassisches iTunes **und** iCloud von apple.com installieren (Bonjour + Treiber); USB-Kabel/Port wechseln. |
| Signatur nach 7 Tagen abgelaufen | Sideloadly: `.ipa` neu installieren. AltStore: AltServer am PC laufen lassen (Auto-Refresh). |
| macOS-Minuten aufgebraucht (private Repo) | Repo auf **public** stellen → macOS-Runner sind dann unbegrenzt kostenlos. |
