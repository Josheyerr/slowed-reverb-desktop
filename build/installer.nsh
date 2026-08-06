; Ask whether to keep Electron userData (presets/settings) on uninstall.
; Default is wipe (No). Electron name "slowed-reverb-desktop" → %APPDATA%\slowed-reverb-desktop

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
    "Keep saved presets and settings?$\r$\n$\r$\nClick Yes to keep them, or No to remove all app data." \
    IDYES keep_userdata
  RMDir /r "$APPDATA\slowed-reverb-desktop"
  RMDir /r "$LOCALAPPDATA\slowed-reverb-desktop"
  keep_userdata:
!macroend
