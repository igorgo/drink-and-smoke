@SETLOCAL
@SET PATHEXT=%PATHEXT:;.JS;=;%
npm install && node  "%~dp0\node_modules\bower\bin\bower" install