# Comic Pack Template

Copy this folder, replace the image files and transcript text, then zip the folder contents so `manifest.json` is at the ZIP root.

PowerShell example from inside the copied folder:

```powershell
Compress-Archive -Path manifest.json,chapters,images -DestinationPath my-comic.comicpack.zip
```

Do not zip the parent folder itself, or the app will not find `manifest.json`.
