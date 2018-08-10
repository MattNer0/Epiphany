# Epiphany

*Epiphany is a Digital Journal to write down and organize your ideas.*
*Markdown Editor, Outliner, Local File Syncing.*

---

**Original Project**: https://github.com/hirokiky/pilemd

---

## Quick list of features

- file system folder structure with **racks**, **folders** and `.md` note files for easy access
- `.rack` and `.folder` files to store metadata like display order
- **note** contents are only loaded when the **folder** or the **note** itself is opened (instead of loading everything on startup)
- sidebar with expandable tree menu list (**folders** and **racks**)
- resize sidebar width (could use more work but it's there)
- note menu with option to change font size, insert tables and more
- properties window with word/line count
- application settings saved inside `appData` folder (window size, last open folder, preview toggle, etc.) 
- added more items to the right click menu in preview mode (toggle, copy, etc.)
- checkbox display and interaction in preview mode
- style changes all around for the heck of it
- choose between different themes (light,dark)
- **encrypted** notes (password protected)

## Run (development)

```
npm install
npm run build
npm run start
```

or

```
npm install
npm run develop
```

## Build (production)

```
npm run linux
```

or

```
npm run linux && npm run deb64
```

or

```
npm run windows
```

or

```
npm run darwin
```