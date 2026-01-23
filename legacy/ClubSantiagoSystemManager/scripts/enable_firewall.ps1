$ports = @(3000, 5173)
$ruleNamePrefix = "SMCBS_Port"

foreach ($port in $ports) {
    $ruleName = "${ruleNamePrefix}_${port}"
    $exists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if ($exists) {
        Write-Host "Firewall rule '$ruleName' already exists."
    }
    else {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow
        Write-Host "Firewall rule '$ruleName' created on port $port."
    }
}
