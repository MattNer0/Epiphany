# Epiphany

*Epiphany is a Digital Journal to write down and organize your ideas.*
*Markdown Editor, Outliner, Local File Syncing.*

---

**Originally a fork from**: https://github.com/hirokiky/pilemd

---

## Quick list of features

- file system folder structure with **racks**, **folders** and `.md` note files for easy access
- auxiliary json files to store additional metadata (like display order)
- **note** contents are only loaded when the **folder** or the **note** itself is opened (instead of loading everything on startup)
- even if the note isn't loaded, the body preview is cached inside a sqlite DB
- sidebar with expandable tree menu list (**folders** and **racks**)
- resize sidebar width (could use more work but it's there)
- note menu with option to change font size, insert tables and more
- properties window with words/lines count
- application settings saved inside `appData` folder (window size, last open folder, preview toggle, etc.) 
- added more items to the right click menu in preview mode (toggle, copy, etc.)
- checkbox display and interaction in preview mode
- choose between different themes (light, dark, custom)
- **encrypted** notes (password protected)
- android app available on separate repo

## Run (development)

```
npm install
yarn dev
```

## Build (production)

```
yarn dist
```
