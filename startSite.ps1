function Check-IsElevated {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Remove-Security {
    
}
if(Check-IsElevated){
    Write-Host "You have Administrator permissions for this machine"
}else{
    Write-Host "Insufficient permissions to run this script. Open the PowerShell console as an administrator and run this script again."
}
if (choco -?) {
    Write-Host "Choco Already Installed"
} else {
    try {
        Write-Host "Choco Not Installed. Installing..."
        Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        choco upgrade chocolatey -Confirm:$true
        SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
    } catch [Exception] {
        Write-Host "There was an exception."
        Write-Host "$_.message"
        exit
    }
}
if (php -v) {
    Write-Host "PHP Already Installed"
} else {
    try {
        Write-Host "PHP Not Installed Installing..."
        choco install php -Confirm:$true
        choco install php-service -Confirm:$true
        choco install composer -Confirm:$true
    } catch [Exception] {
        Write-Host "$_.message"
        exit
    }
}
Write-Host "Starting Apache service"
net start php
C:\Apache24\bin\httpd.exe -k start
Write-Host "Apache service started"
