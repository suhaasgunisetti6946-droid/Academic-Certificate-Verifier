@echo off
title Opening CertiChain in Visual Studio Code...
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" (
    start "" "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" "%~dp0"
) else (
    code .
)
exit
