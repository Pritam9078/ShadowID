@echo off
echo Starting ShadowID Backend deployment...
cd backend
call npm install
echo Dependencies installed successfully
call npm start