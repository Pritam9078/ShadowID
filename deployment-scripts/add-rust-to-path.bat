@echo off
echo Adding Rust to system PATH...
echo.
echo Run this script as Administrator to permanently add Rust to your PATH
echo.
pause

REM Add Rust to system PATH permanently
setx PATH "%PATH%;%USERPROFILE%\.cargo\bin" /M

echo.
echo Rust has been added to system PATH.
echo Please restart your terminal or VS Code to use rust commands without the temporary PATH fix.
echo.
pause