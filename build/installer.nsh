!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER
  Var shortcutDialog
  Var desktopCheckbox
  Var startMenuCheckbox
  Var wantDesktop
  Var wantStartMenu
!endif

!macro customHeader
!macroend

!macro customInit
  !ifndef BUILD_UNINSTALLER
    StrCpy $wantDesktop 1
    StrCpy $wantStartMenu 1
  !endif
!macroend

!macro customPageAfterChangeDir
  !ifndef BUILD_UNINSTALLER
    Page custom ShortcutOptionsPage ShortcutOptionsLeave
  !endif
!macroend

!macro customInstall
  !ifndef BUILD_UNINSTALLER
    ${If} $wantDesktop == 0
      Delete "$newDesktopLink"
    ${EndIf}
    ${If} $wantStartMenu == 0
      Delete "$newStartMenuLink"
    ${EndIf}
    StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
Function ShortcutOptionsPage
  ${GetOptions} $CMDLINE "--updated" $R0
  ${IfNot} ${Errors}
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $shortcutDialog
  ${If} $shortcutDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "Choose shortcut options:"
  Pop $0

  ${NSD_CreateCheckBox} 0 28u 100% 14u "Create Desktop Shortcut"
  Pop $desktopCheckbox
  ${NSD_SetState} $desktopCheckbox $wantDesktop

  ${NSD_CreateCheckBox} 0 46u 100% 14u "Create Start Menu Shortcut"
  Pop $startMenuCheckbox
  ${NSD_SetState} $startMenuCheckbox $wantStartMenu

  nsDialogs::Show
FunctionEnd

Function ShortcutOptionsLeave
  ${NSD_GetState} $desktopCheckbox $wantDesktop
  ${NSD_GetState} $startMenuCheckbox $wantStartMenu
FunctionEnd
!endif
