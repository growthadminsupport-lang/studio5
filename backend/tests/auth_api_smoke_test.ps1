# Run against a disposable PostgreSQL database with a matching running API.
# Example: powershell -File tests/auth_api_smoke_test.ps1 -Psql C:/Postgre/bin/psql.exe -Database growth_auth_test
param(
    [Parameter(Mandatory=$true)][string]$Psql,
    [Parameter(Mandatory=$true)][string]$Database,
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"
$email = "auth-smoke-$([guid]::NewGuid().ToString('N'))@example.com"
$password = "blue cedar river 2026"
$newPassword = "violet forest path 2026"

function Sql([string]$query) {
    $value = & $Psql -X -q -h $DbHost -p $DbPort -U $DbUser -d $Database -v ON_ERROR_STOP=1 -t -A -c $query
    if ($LASTEXITCODE -ne 0) { throw "psql failed" }
    return ($value | Out-String).Trim()
}

function TokenHash([string]$raw) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($raw)
    $digest = [Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ([BitConverter]::ToString($digest).Replace('-', '').ToLowerInvariant())
}

function Post([string]$path, $body) {
    $response = Invoke-WebRequest "$BaseUrl$path" -Method Post -UseBasicParsing `
        -ContentType "application/json; charset=utf-8" `
        -Body ([Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress -Depth 5)))
    return $response
}

function MustFail([string]$path, $body, [int]$expected) {
    try {
        Post $path $body | Out-Null
        throw "Expected HTTP $expected from $path"
    } catch {
        if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne $expected) { throw }
    }
}

try {
    $registration = Post "/api/auth/register" @{
        full_name="Smoke Parent"; email=$email; password=$password; terms_accepted=$true
    }
    if ($registration.StatusCode -ne 202) { throw "Registration did not return 202" }
    if (($registration.Content | ConvertFrom-Json).access_token) { throw "Registration returned a session" }
    MustFail "/api/auth/login" @{ email=$email; password=$password } 403

    $verification = [guid]::NewGuid().ToString('N')
    $verificationHash = TokenHash $verification
    Sql "INSERT INTO usr_email_verifications (usr_id,token_hash,expires_at) SELECT usr_id,'$verificationHash',now()+interval '1 hour' FROM usr_accounts WHERE email='$email'" | Out-Null
    MustFail "/api/auth/email/verify" @{ token=$verification; password="incorrect password" } 401
    Post "/api/auth/email/verify" @{ token=$verification; password=$password } | Out-Null
    MustFail "/api/auth/email/verify" @{ token=$verification; password=$password } 401
    $login = (Post "/api/auth/login" @{ email=$email; password=$password }).Content | ConvertFrom-Json
    if (-not $login.access_token) { throw "Verified password login failed" }

    # Simulate a legacy account whose password was cleared while retaining Google.
    $subject = "smoke-$([guid]::NewGuid().ToString('N'))"
    Sql "INSERT INTO usr_identities (usr_id,provider,subject,email) SELECT usr_id,'google','$subject',email FROM usr_accounts WHERE email='$email'" | Out-Null
    Sql "UPDATE usr_accounts SET password_hash=NULL WHERE email='$email'" | Out-Null
    MustFail "/api/auth/login" @{ email=$email; password=$password } 401
    $reset = [guid]::NewGuid().ToString('N')
    $resetHash = TokenHash $reset
    Sql "INSERT INTO usr_password_resets (usr_id,token_hash,expires_at) SELECT usr_id,'$resetHash',now()+interval '1 hour' FROM usr_accounts WHERE email='$email'" | Out-Null
    Post "/api/auth/password/reset" @{ token=$reset; new_password=$newPassword } | Out-Null
    $recovered = (Post "/api/auth/login" @{ email=$email; password=$newPassword }).Content | ConvertFrom-Json
    if (-not $recovered.access_token) { throw "Password recovery failed" }
    $identityCount = Sql "SELECT count(*) FROM usr_identities i JOIN usr_accounts a USING (usr_id) WHERE a.email='$email' AND i.subject='$subject'"
    if ($identityCount -ne "1") { throw "Google identity was lost during reset" }
    Write-Host "PASS: pending registration, verification, password login, and legacy password recovery"
} finally {
    Sql "DELETE FROM usr_accounts WHERE email='$email'" | Out-Null
}
