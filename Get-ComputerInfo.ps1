# Computer Information Report
$separator = "=" * 60

function Get-SectionHeader($title) {
    Write-Host "`n$separator" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Yellow
    Write-Host "$separator" -ForegroundColor Cyan
}

# System Info
Get-SectionHeader "SYSTEM"
$cs = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem
[PSCustomObject]@{
    "Computer Name"  = $env:COMPUTERNAME
    "Domain/Workgroup" = if ($cs.PartOfDomain) { $cs.Domain } else { "$($cs.Workgroup) (Workgroup)" }
    "Manufacturer"   = $cs.Manufacturer
    "Model"          = $cs.Model
    "OS"             = $os.Caption
    "OS Version"     = $os.Version
    "OS Architecture"= $os.OSArchitecture
    "Install Date"   = $os.InstallDate
    "Last Boot"      = $os.LastBootUpTime
    "Uptime"         = (Get-Date) - $os.LastBootUpTime | ForEach-Object { "$($_.Days)d $($_.Hours)h $($_.Minutes)m" }
} | Format-List

# CPU
Get-SectionHeader "PROCESSOR"
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors,
    MaxClockSpeed, CurrentClockSpeed,
    @{N="Load (%)"; E={$_.LoadPercentage}} | Format-List

# Memory
Get-SectionHeader "MEMORY"
$ram = Get-CimInstance Win32_PhysicalMemory
$totalGB = [math]::Round(($ram | Measure-Object Capacity -Sum).Sum / 1GB, 2)
$availGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
Write-Host "Total RAM : $totalGB GB"
Write-Host "Available : $availGB GB"
Write-Host "Used      : $([math]::Round($totalGB - $availGB, 2)) GB`n"
$ram | Select-Object BankLabel, Manufacturer, PartNumber,
    @{N="Capacity (GB)"; E={[math]::Round($_.Capacity/1GB,2)}},
    Speed | Format-Table -AutoSize

# Disk
Get-SectionHeader "DISK"
Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,
    @{N="Total (GB)";  E={[math]::Round($_.Size/1GB,2)}},
    @{N="Free (GB)";   E={[math]::Round($_.FreeSpace/1GB,2)}},
    @{N="Used (GB)";   E={[math]::Round(($_.Size-$_.FreeSpace)/1GB,2)}},
    @{N="Used (%)";    E={[math]::Round(($_.Size-$_.FreeSpace)/$_.Size*100,1)}} |
    Format-Table -AutoSize

# Network
Get-SectionHeader "NETWORK"
Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" |
    Select-Object Description,
        @{N="IP Address";    E={$_.IPAddress -join ", "}},
        @{N="Subnet Mask";   E={$_.IPSubnet -join ", "}},
        @{N="Default GW";    E={$_.DefaultIPGateway -join ", "}},
        @{N="DNS Servers";   E={$_.DNSServerSearchOrder -join ", "}},
        MACAddress | Format-List

# GPU
Get-SectionHeader "GRAPHICS"
Get-CimInstance Win32_VideoController | Select-Object Name,
    @{N="VRAM (MB)"; E={[math]::Round($_.AdapterRAM/1MB,0)}},
    VideoModeDescription, DriverVersion | Format-List

# BIOS
Get-SectionHeader "BIOS"
Get-CimInstance Win32_BIOS | Select-Object Manufacturer, Name, Version, ReleaseDate | Format-List

# Logged-on Users
Get-SectionHeader "LOGGED-ON USERS"
query user 2>$null | Write-Host

Write-Host "`n$separator`n" -ForegroundColor Cyan
