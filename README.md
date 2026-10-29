# Rex Geschichten

Eine Geschichten-App für Kinder: Freunde und Ort antippen, eine Idee sagen, Claude erfindet die Geschichte, die App malt ein Klötzchen-Cover und liest vor.

Reine Webseite ohne Server, gedacht für GitHub Pages.

## Auf GitHub Pages veröffentlichen

1. Auf github.com ein neues Repository anlegen, zum Beispiel `rex-geschichten` (öffentlich, sonst braucht Pages ein bezahltes Konto).
2. Im Repository auf **Add file > Upload files** klicken und alle Dateien aus diesem Ordner hineinziehen: `index.html`, `manifest.json`, `icon.svg`, `icon-180.png`, `icon-512.png`, `README.md`. Dann **Commit changes**.
3. **Settings > Pages**: bei Source **Deploy from a branch** wählen, Branch `main`, Ordner `/ (root)`, **Save**.
4. Nach ein bis zwei Minuten ist die App erreichbar unter `https://<dein-name>.github.io/rex-geschichten/`.

## Einrichten auf Nicks Tablet

1. Die Adresse in Safari oder Chrome öffnen.
2. Über das Teilen-Menü **Zum Home-Bildschirm** hinzufügen. Dann startet die App wie eine echte App mit Rex als Symbol.
3. Beim ersten Druck auf den Mikrofon-Knopf das Mikrofon erlauben. Fertig, ein Schlüssel muss nicht eingetragen werden.

## Der API-Schlüssel (Cloudflare Worker)

* Die App fragt Claude nicht direkt, sondern über den Cloudflare Worker `rex-geschichten` (https://rex-geschichten.daniel-504.workers.dev). Der Code liegt in `worker/worker.js`.
* Der Claude-Schlüssel liegt dort als Secret `ANTHROPIC_API_KEY`. Er steht weder im Repository noch auf einem Gerät.
* Der Worker baut den Prompt selbst und antwortet nur dieser GitHub-Seite. Modell (`MODEL`), Tageslimit (`MAX_PER_DAY`, braucht ein KV-Binding `LIMITS`) und erlaubte Seiten (`ALLOWED_ORIGINS`) lassen sich unter Settings > Variables and Secrets ändern.
* Schlüssel wechseln: in der Claude Console einen neuen anlegen, beim Worker das Secret ersetzen, den alten sperren.
* Ohne Worker (Konstante `PROXY` in `index.html` leer) fällt die App auf einen Schlüssel im Eltern-Bereich zurück.

## Gut zu wissen

* **Spracheingabe:** Nick drückt auf den roten Mikrofon-Knopf und erzählt. Die App nimmt selbst auf, hört nach 2 Sekunden Stille automatisch auf und schaltet das Mikrofon danach ganz ab. Den Text erzeugt Whisper über den Worker (Workers-AI-Binding `AI`). Ohne Worker fällt die App auf die Spracherkennung des Browsers zurück.
* **Vorlesen:** Natürliche Stimmen von ElevenLabs über den Worker (Secret `ELEVENLABS_API_KEY`). Jeder Absatz wird einmal erzeugt und dann bei Cloudflare zwischengespeichert. Stimme wählbar im Eltern-Bereich, auch eine eigene Voice ID. Die Gerätestimme ist der Rückfall. Am iPhone muss der Lautlos-Schalter aus sein.
* **Figuren:** Neue Figuren aus Geschichten werden gespeichert und sind danach bei „Wer spielt mit?“ auswählbar. Im Eltern-Bereich lassen sich Figuren umbenennen, beschreiben, umfärben, löschen oder (eingebaute) ausblenden.
* **Geschichten:** im Eltern-Bereich löschbar. Geschichten und Figuren liegen im Browser des Geräts, ein anderes Gerät hat ein eigenes Regal.
* **Modell:** Claude Opus (`claude-opus-5-5`), eingestellt im Worker.
* Die Regeln für kindgerechte Geschichten stehen im Worker (`worker/worker.js`, Funktion `buildPrompt`).
