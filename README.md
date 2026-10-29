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

* **Spracheingabe:** Nick drückt auf den roten Mikrofon-Knopf und erzählt seine Idee. Der Browser fragt beim ersten Mal, ob das Mikrofon benutzt werden darf, das bitte einmal erlauben. Funktioniert in Safari (iPad, iPhone), Chrome und Edge, nicht in Firefox. Chrome und Edge schicken die Sprache zur Erkennung an Google beziehungsweise Microsoft, Safari an Apple.
* **Modell:** Claude Opus (`claude-opus-5-5`), eingestellt im Worker.
* **Vorlesestimme:** Im Eltern-Bereich lässt sich die Stimme des Geräts auswählen. Das Cover bleibt beim Vorlesen oben stehen.
* Geschichten werden im Browser des Geräts gespeichert. Ein anderes Gerät hat ein eigenes Regal.
* Vorlesen nutzt die Stimme des Geräts. Am iPhone oder iPad muss der Lautlos-Schalter aus sein. Schöne deutsche Stimmen gibt es unter iOS bei Einstellungen > Bedienungshilfen > Gesprochene Inhalte > Stimmen > Deutsch (zum Beispiel Anna, verbessert).
* Die Regeln für kindgerechte Geschichten stehen in `index.html` in der Funktion `buildPrompt`.
