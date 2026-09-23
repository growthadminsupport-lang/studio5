<#
    ทดสอบระบบยืนยันตัวตนทั้งชุดผ่าน HTTP จริง

    ต้องสตาร์ทเซิร์ฟเวอร์ก่อน:
        venv\Scripts\python.exe -m uvicorn main:app

    แล้วรัน:
        powershell -File tests\auth_api_smoke_test.ps1

    สคริปต์ลบบัญชีที่ตัวเองสร้างทิ้งตอนจบ (CASCADE เก็บ session/token ให้เอง)
    ฐานข้อมูลจึงไม่มีขยะค้าง รันซ้ำได้

    โทเคนรีเซ็ตรหัสผ่านไม่เคยอยู่ใน HTTP response (ตั้งใจ) เทสต์จึงอ่านจาก
    response ไม่ได้ — ที่นี่ใช้วิธีให้ psql สร้างโทเคนใหม่ลงฐานข้อมูลโดยตรง

    ระบบไม่มีการยืนยันอีเมลแล้ว สมัครเสร็จได้ token กลับมาเลย ไม่ต้องกดลิงก์อะไร

    หมายเหตุ 1: Invoke-WebRequest บน Windows PowerShell 5.1 ต้องใส่ -UseBasicParsing
    ไม่งั้นจะพยายามเรียก engine ของ Internet Explorer มา parse แล้วพังใน NonInteractive mode

    หมายเหตุ 2: ไฟล์นี้ต้องบันทึกเป็น UTF-8 *พร้อม BOM* เท่านั้น
    Windows PowerShell 5.1 อ่านไฟล์ .ps1 ที่ไม่มี BOM เป็น ANSI ตาม codepage ของระบบ
    ตัวอักษรไทยจะเพี้ยนจนสคริปต์แตกไวยากรณ์ ถ้าแก้ไฟล์นี้ด้วยเครื่องมือที่บันทึกแบบ
    ไม่มี BOM ให้แปลงกลับด้วย:
        $c = Get-Content tests\auth_api_smoke_test.ps1 -Raw -Encoding UTF8
        Set-Content tests\auth_api_smoke_test.ps1 -Value $c -Encoding UTF8
#>

param(
    [string]$BaseUrl = "http://127.0.0.1:8000",
    [string]$Psql    = "D:\Postgre\bin\psql.exe",
    [string]$Db      = "growth_db",
    [string]$DbUser  = "postgres",
    [string]$Python  = ".\venv\Scripts\python.exe"
)

$ErrorActionPreference = "Stop"
$failed  = 0
$passed  = 0
$password    = "ParentPhrase2026"
$newPassword = "AnotherPhrase2026"
$email       = "smoke$(Get-Random -Maximum 999999)@example.com"

function J($o) { $o | ConvertTo-Json -Compress -Depth 5 }

function Say($name, $ok, $detail) {
    if ($ok) {
        Write-Host ("  ok   {0}{1}" -f $name, $(if ($detail) { " — $detail" } else { "" }))
        $script:passed++
    } else {
        Write-Host ("  FAIL {0} — {1}" -f $name, $detail) -ForegroundColor Red
        $script:failed++
    }
}

function StatusOf($err) {
    if ($err.Exception.Response) { [int]$err.Exception.Response.StatusCode } else { 0 }
}

# Invoke-RestMethod ของ PowerShell 5.1 ถอด response ที่ไม่ระบุ charset เป็น ISO-8859-1
# ภาษาไทยจะเพี้ยนทันที ต้องอ่าน byte ดิบแล้วถอดเป็น UTF-8 เอง
function Decode($resp) {
    [Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray()) | ConvertFrom-Json
}

function Post($path, $body, $token) {
    $h = @{}
    if ($token) { $h["Authorization"] = "Bearer $token" }
    $resp = Invoke-WebRequest "$BaseUrl$path" -Method Post -UseBasicParsing -Headers $h `
        -ContentType "application/json; charset=utf-8" `
        -Body ([Text.Encoding]::UTF8.GetBytes((J $body)))
    Decode $resp
}

function GetJson($path, $token) {
    $h = @{}
    if ($token) { $h["Authorization"] = "Bearer $token" }
    $resp = Invoke-WebRequest "$BaseUrl$path" -Method Get -UseBasicParsing -Headers $h
    Decode $resp
}

function PostExpectFail($name, $path, $body, $expectStatus) {
    try {
        Invoke-RestMethod "$BaseUrl$path" -Method Post -ContentType "application/json; charset=utf-8" -Body (J $body) | Out-Null
        Say $name $false "ผ่านไปได้ทั้งที่ควรถูกปฏิเสธ"
    } catch {
        Say $name ((StatusOf $_) -eq $expectStatus) "HTTP $(StatusOf $_)"
    }
}

function Sql($query) {
    (& $Psql -h localhost -U $DbUser -d $Db -t -A -c $query).Trim()
}

# สร้างโทเคนรีเซ็ตรหัสผ่านลงฐานข้อมูลโดยตรง แล้วคืนค่าดิบกลับมา
# ใช้แทนการอ่านอีเมล เพราะ endpoint ไม่เคยคืนโทเคนให้ผู้เรียก
function MintResetToken {
    $raw = & $Python -c "import secrets; print(secrets.token_urlsafe(32))"
    $raw = $raw.Trim()
    $hash = & $Python -c "import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())" $raw
    $hash = $hash.Trim()
    Sql "INSERT INTO usr_password_resets (usr_id, token_hash, expires_at) SELECT usr_id, '$hash', now() + interval '1 hour' FROM usr_accounts WHERE email = '$email';" | Out-Null
    return $raw
}

Write-Host "`n=== สภาพระบบ ==="
$health = Invoke-RestMethod "$BaseUrl/health"
Say "ต่อฐานข้อมูลได้" ($health.status -eq "ok") "postgres $($health.postgres) · $($health.tables) ตาราง"

Write-Host "`n=== สมัครสมาชิก (เข้าสู่ระบบให้เลย ไม่ต้องยืนยันอีเมล) ==="
$reg = Post "/api/auth/register" @{ full_name="สมชาย ใจดี"; email=$email; password=$password; terms_accepted=$true }
Say "สมัครแล้วได้ access token กลับมาเลย" ($null -ne $reg.access_token) ""
Say "ได้ refresh token มาด้วย" ($null -ne $reg.refresh_token) ""
Say "ตอบ expires_in ตามธรรมเนียม OAuth" ($reg.expires_in -eq 900) "$($reg.expires_in) วินาที"

$dbCount = Sql "SELECT count(*) FROM usr_accounts WHERE email = '$email';"
Say "บัญชีถูกสร้างจริงในฐานข้อมูล" ($dbCount -eq "1") "$dbCount แถว"

# token ที่ได้ตอนสมัครต้องใช้งานได้จริงทันที ไม่ใช่แค่คืนค่ามาเฉย ๆ
$meNew = GetJson "/api/auth/me" $reg.access_token
Say "token จากการสมัครใช้เรียก /me ได้ทันที" ($meNew.email -eq $email) $meNew.full_name

# ไม่มีการยืนยันอีเมลแล้ว จึงต้องบอกตรง ๆ ว่าอีเมลซ้ำ ไม่งั้นผู้ใช้ไม่รู้ว่าต้องทำอะไรต่อ
PostExpectFail "สมัครซ้ำต้องได้ 409 ไม่ใช่ข้อความกำกวม" "/api/auth/register" `
    @{ full_name="คนอื่น"; email=$email.ToUpper(); password=$password; terms_accepted=$true } 409
$dbCount2 = Sql "SELECT count(*) FROM usr_accounts WHERE email = '$email';"
Say "และต้องไม่สร้างบัญชีซ้ำ" ($dbCount2 -eq "1") "$dbCount2 แถว"

Write-Host "`n=== นโยบายรหัสผ่าน (NIST SP 800-63B) ==="
PostExpectFail "รหัสสั้นกว่า 8 ตัวต้องไม่ผ่าน" "/api/auth/register" `
    @{ full_name="ทดสอบ"; email="p1$(Get-Random)@example.com"; password="Ab1!"; terms_accepted=$true } 422
PostExpectFail "รหัสที่ติดรายการเดาบ่อยต้องไม่ผ่าน" "/api/auth/register" `
    @{ full_name="ทดสอบ"; email="p2$(Get-Random)@example.com"; password="password123"; terms_accepted=$true } 422
PostExpectFail "ตัวเลขเรียงติดกันต้องไม่ผ่าน" "/api/auth/register" `
    @{ full_name="ทดสอบ"; email="p3$(Get-Random)@example.com"; password="12345678"; terms_accepted=$true } 422
PostExpectFail "ตัวอักษรเดียวซ้ำทั้งหมดต้องไม่ผ่าน" "/api/auth/register" `
    @{ full_name="ทดสอบ"; email="p4$(Get-Random)@example.com"; password="aaaaaaaaaa"; terms_accepted=$true } 422
PostExpectFail "รหัสที่มีชื่ออีเมลตัวเองต้องไม่ผ่าน" "/api/auth/register" `
    @{ full_name="ทดสอบ"; email="somchaidee@example.com"; password="somchaidee99"; terms_accepted=$true } 422
PostExpectFail "รหัสยาวเกิน 72 ไบต์ต้องไม่ผ่าน" "/api/auth/register" `
    @{ full_name="ทดสอบ"; email="p5$(Get-Random)@example.com"; password=("ก" * 25); terms_accepted=$true } 422
PostExpectFail "ไม่ยอมรับเงื่อนไขต้องสมัครไม่ได้" "/api/auth/register" `
    @{ full_name="ทดสอบ"; email="p6$(Get-Random)@example.com"; password=$password; terms_accepted=$false } 400

Write-Host "`n=== เลิกใช้ endpoint ยืนยันอีเมลแล้ว ==="
# ถ้ายังตอบอยู่แปลว่าลบไม่หมด — เป็นทางเข้าที่ไม่มีใครดูแลแล้ว
PostExpectFail "POST /verify-email ต้องไม่มีอยู่แล้ว" "/api/auth/verify-email" @{ token="x" } 404
PostExpectFail "POST /resend-verification ต้องไม่มีอยู่แล้ว" "/api/auth/resend-verification" `
    @{ email=$email } 404

Write-Host "`n=== เข้าสู่ระบบ ==="
$login = Post "/api/auth/login" @{ email=$email.ToUpper(); password=$password }
Say "เข้าสู่ระบบด้วยอีเมลตัวพิมพ์ใหญ่ (CITEXT)" ($null -ne $login.access_token) ""
Say "ตอบ expires_in มาด้วยตามธรรมเนียม OAuth" ($login.expires_in -eq 900) "$($login.expires_in) วินาที = 15 นาที"

$me = GetJson "/api/auth/me" $login.access_token
Say "GET /me คืนข้อมูลบัญชีถูกต้อง" ($me.email -eq $email) "$($me.full_name)"
Say "/me ต้องไม่มี email_verified แล้ว" `
    (-not ($me.PSObject.Properties.Name -contains "email_verified")) "ไม่มีฟิลด์ที่ไร้ความหมาย"

try {
    Invoke-RestMethod "$BaseUrl/api/auth/me" | Out-Null
    Say "เรียก /me โดยไม่มี token ต้องไม่ได้" $false "ผ่านไปได้"
} catch { Say "เรียก /me โดยไม่มี token ต้องไม่ได้" ((StatusOf $_) -eq 401) "HTTP $(StatusOf $_)" }

PostExpectFail "รหัสผ่านผิดต้องไม่ผ่าน" "/api/auth/login" @{ email=$email; password="WrongPhrase2026" } 401

Write-Host "`n=== การหมุน refresh token และตรวจจับการใช้ซ้ำ ==="
$r1 = Post "/api/auth/refresh" @{ refresh_token=$login.refresh_token }
Say "ขอ access token ใหม่ได้" ($null -ne $r1.access_token) ""
Say "ได้ refresh token ใบใหม่ ไม่ใช่ใบเดิม" ($r1.refresh_token -ne $login.refresh_token) "หมุนแล้ว"

$r2 = Post "/api/auth/refresh" @{ refresh_token=$r1.refresh_token }
Say "หมุนต่อได้อีกรอบ" ($null -ne $r2.refresh_token) ""

# เอาใบแรกที่ถูกยกเลิกไปแล้วกลับมาใช้ = สัญญาณว่ามีคนขโมย token
PostExpectFail "ใช้ refresh token ใบเก่าซ้ำต้องไม่ได้" "/api/auth/refresh" `
    @{ refresh_token=$login.refresh_token } 401

# และต้องยกเลิกทั้ง family ไม่ใช่แค่ใบที่ถูกใช้ซ้ำ
PostExpectFail "ใบล่าสุดต้องถูกยกเลิกไปด้วย (ยกทั้ง family)" "/api/auth/refresh" `
    @{ refresh_token=$r2.refresh_token } 401

# การยกทั้ง family ต้องยกเฉพาะสายที่มีปัญหา ห้ามลามไปเซสชันของการเข้าสู่ระบบครั้งอื่น
# ตอนนี้ /register ออก refresh token ให้ด้วย บัญชีจึงมีเซสชันจากตอนสมัครค้างอยู่ 1 ใบ
# ซึ่งเป็นคนละ family กับที่เพิ่งถูกยก จึงต้องรอดมาได้ — ถ้าเหลือ 0 แปลว่ายกเกินขอบเขต
$activeCount = Sql "SELECT count(*) FROM usr_sessions s JOIN usr_accounts a USING (usr_id) WHERE a.email = '$email' AND s.revoked_at IS NULL;"
Say "ยก family ที่ถูกขโมยทิ้ง แต่ไม่ลามไป family อื่น" ($activeCount -eq "1") "เหลือ $activeCount เซสชัน (ใบที่ได้ตอนสมัคร)"

Write-Host "`n=== ดูและตัดอุปกรณ์ที่เข้าสู่ระบบอยู่ ==="
$s1 = Post "/api/auth/login" @{ email=$email; password=$password }
$s2 = Post "/api/auth/login" @{ email=$email; password=$password }
# 3 = ใบจากตอนสมัคร + เข้าสู่ระบบอีก 2 ครั้ง
$sessions = GetJson "/api/auth/sessions" $s2.access_token
Say "เห็นอุปกรณ์ที่เข้าสู่ระบบอยู่ทั้งหมด" ($sessions.Count -eq 3) "$($sessions.Count) อุปกรณ์"

$out = Post "/api/auth/logout-all" @{} $s2.access_token
Say "ออกจากระบบทุกอุปกรณ์" ($out.message -like "*3 อุปกรณ์*") $out.message
PostExpectFail "refresh token หลัง logout-all ใช้ไม่ได้" "/api/auth/refresh" @{ refresh_token=$s1.refresh_token } 401

Write-Host "`n=== เปลี่ยนรหัสผ่าน ==="
$s3 = Post "/api/auth/login" @{ email=$email; password=$password }
$hdr = @{ Authorization = "Bearer $($s3.access_token)" }

try {
    Invoke-RestMethod "$BaseUrl/api/auth/password/change" -Method Post -Headers $hdr `
        -ContentType "application/json; charset=utf-8" `
        -Body (J @{ current_password="WrongPhrase2026"; new_password=$newPassword }) | Out-Null
    Say "รหัสปัจจุบันผิดต้องเปลี่ยนไม่ได้" $false "ผ่านไปได้"
} catch { Say "รหัสปัจจุบันผิดต้องเปลี่ยนไม่ได้" ((StatusOf $_) -eq 401) "HTTP $(StatusOf $_)" }

try {
    Invoke-RestMethod "$BaseUrl/api/auth/password/change" -Method Post -Headers $hdr `
        -ContentType "application/json; charset=utf-8" `
        -Body (J @{ current_password=$password; new_password=$password }) | Out-Null
    Say "ตั้งรหัสใหม่ซ้ำรหัสเดิมต้องไม่ได้" $false "ผ่านไปได้"
} catch { Say "ตั้งรหัสใหม่ซ้ำรหัสเดิมต้องไม่ได้" ((StatusOf $_) -eq 422) "HTTP $(StatusOf $_)" }

$chg = Post "/api/auth/password/change" @{ current_password=$password; new_password=$newPassword } $s3.access_token
Say "เปลี่ยนรหัสผ่านสำเร็จ" ($chg.message -like "*เรียบร้อย*") $chg.message

# นี่คือจุดที่ปิดช่องโหว่ของ JWT — access token เดิมต้องใช้ไม่ได้ทันที
try {
    Invoke-RestMethod "$BaseUrl/api/auth/me" -Headers $hdr | Out-Null
    Say "access token เดิมต้องใช้ไม่ได้ทันทีหลังเปลี่ยนรหัส" $false "ยังใช้ได้อยู่"
} catch { Say "access token เดิมต้องใช้ไม่ได้ทันทีหลังเปลี่ยนรหัส" ((StatusOf $_) -eq 401) "HTTP $(StatusOf $_)" }

PostExpectFail "รหัสเดิมเข้าสู่ระบบไม่ได้แล้ว" "/api/auth/login" @{ email=$email; password=$password } 401
$loginNew = Post "/api/auth/login" @{ email=$email; password=$newPassword }
Say "รหัสใหม่เข้าสู่ระบบได้" ($null -ne $loginNew.access_token) ""

Write-Host "`n=== ลืมรหัสผ่าน / ตั้งรหัสใหม่ ==="
$forgot = Post "/api/auth/password/forgot" @{ email=$email }
Say "ขอลิงก์ตั้งรหัสใหม่ ตอบข้อความกลาง ๆ" ($forgot.message -like "*ถ้าอีเมลนี้มีบัญชี*") ""
$forgotUnknown = Post "/api/auth/password/forgot" @{ email="nobody$(Get-Random)@example.com" }
Say "อีเมลที่ไม่มีในระบบต้องตอบเหมือนกันเป๊ะ" ($forgotUnknown.message -eq $forgot.message) "ไม่รั่วว่าใครเป็นสมาชิก"

$resetToken = MintResetToken
PostExpectFail "รหัสใหม่ที่อ่อนเกินต้องไม่ผ่านตอนรีเซ็ต" "/api/auth/password/reset" `
    @{ token=$resetToken; new_password="password" } 422
$reset = Post "/api/auth/password/reset" @{ token=$resetToken; new_password=$password }
Say "ตั้งรหัสผ่านใหม่ด้วยโทเคนสำเร็จ" ($reset.message -like "*เรียบร้อย*") $reset.message
PostExpectFail "โทเคนรีเซ็ตใช้ซ้ำไม่ได้" "/api/auth/password/reset" `
    @{ token=$resetToken; new_password=$newPassword } 400

$loginBack = Post "/api/auth/login" @{ email=$email; password=$password }
Say "เข้าสู่ระบบด้วยรหัสที่เพิ่งตั้งใหม่ได้" ($null -ne $loginBack.access_token) ""

# เมื่อไม่บังคับยืนยันอีเมล การพิมพ์อีเมลผิดตอนสมัครจะทำให้กู้บัญชีไม่ได้เลย
# endpoint นี้จึงเป็นทางแก้เดียวที่เหลืออยู่ ต้องทำงานได้จริง
Write-Host "`n=== เปลี่ยนอีเมล ==="
$newEmail   = "changed$(Get-Random -Maximum 999999)@example.com"
$otherEmail = "other$(Get-Random -Maximum 999999)@example.com"
$hdrE = @{ Authorization = "Bearer $($loginBack.access_token)" }

try {
    Invoke-RestMethod "$BaseUrl/api/auth/email/change" -Method Post -Headers $hdrE `
        -ContentType "application/json; charset=utf-8" `
        -Body (J @{ current_password="WrongPhrase2026"; new_email=$newEmail }) | Out-Null
    Say "รหัสผ่านผิดต้องเปลี่ยนอีเมลไม่ได้" $false "ผ่านไปได้"
} catch { Say "รหัสผ่านผิดต้องเปลี่ยนอีเมลไม่ได้" ((StatusOf $_) -eq 401) "HTTP $(StatusOf $_)" }

Post "/api/auth/register" @{ full_name="คนอื่น"; email=$otherEmail; password=$password; terms_accepted=$true } | Out-Null
try {
    Invoke-RestMethod "$BaseUrl/api/auth/email/change" -Method Post -Headers $hdrE `
        -ContentType "application/json; charset=utf-8" `
        -Body (J @{ current_password=$password; new_email=$otherEmail }) | Out-Null
    Say "เปลี่ยนไปเป็นอีเมลที่คนอื่นใช้อยู่ต้องไม่ได้" $false "ผ่านไปได้"
} catch { Say "เปลี่ยนไปเป็นอีเมลที่คนอื่นใช้อยู่ต้องไม่ได้" ((StatusOf $_) -eq 409) "HTTP $(StatusOf $_)" }

$em = Post "/api/auth/email/change" @{ current_password=$password; new_email=$newEmail } $loginBack.access_token
Say "เปลี่ยนอีเมลสำเร็จ" ($em.message -like "*เรียบร้อย*") $em.message

PostExpectFail "อีเมลเดิมเข้าสู่ระบบไม่ได้แล้ว" "/api/auth/login" @{ email=$email; password=$password } 401
$loginNewEmail = Post "/api/auth/login" @{ email=$newEmail; password=$password }
Say "อีเมลใหม่เข้าสู่ระบบได้" ($null -ne $loginNewEmail.access_token) $newEmail

$email = $newEmail   # ส่วนเก็บกวาดข้างล่างจะได้ตามลบถูกบัญชี

Write-Host "`n=== ล็อกบัญชีเมื่อเดารหัสผิดซ้ำ ==="
$lockEmail = "lock$(Get-Random -Maximum 999999)@example.com"
Post "/api/auth/register" @{ full_name="ทดสอบล็อก"; email=$lockEmail; password=$password; terms_accepted=$true } | Out-Null

$lockedAt = 0
for ($i = 1; $i -le 6; $i++) {
    try {
        Invoke-RestMethod "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" `
            -Body (J @{ email=$lockEmail; password="DefinitelyWrong$i" }) | Out-Null
    } catch {
        if ((StatusOf $_) -eq 429 -and $lockedAt -eq 0) { $lockedAt = $i }
    }
}
Say "ล็อกบัญชีหลังกรอกผิดครบ 5 ครั้ง" ($lockedAt -eq 6) "โดนล็อกตอนครั้งที่ $lockedAt"
PostExpectFail "ถูกล็อกแล้วรหัสถูกก็เข้าไม่ได้" "/api/auth/login" @{ email=$lockEmail; password=$password } 429

$attempts = Sql "SELECT count(*) FROM usr_login_attempts WHERE email = '$lockEmail';"
Say "บันทึกความพยายามเข้าสู่ระบบไว้ครบ" ([int]$attempts -ge 6) "$attempts ครั้ง"

Write-Host "`n=== เก็บกวาด ==="
Sql "DELETE FROM usr_accounts WHERE email IN ('$email', '$lockEmail', '$otherEmail') OR email LIKE 'p%@example.com';" | Out-Null
# นับเฉพาะบัญชีที่สคริปต์นี้สร้างเอง ไม่ใช่ทั้งตาราง — ฐานข้อมูลอาจมีบัญชีจากการทดสอบด้วยมือ
# (growth_demo.html) อยู่ก่อนแล้ว ซึ่งไม่ใช่ความผิดของโค้ดที่กำลังทดสอบ
$left = Sql "SELECT count(*) FROM usr_accounts WHERE email IN ('$email', '$lockEmail', '$otherEmail') OR email LIKE 'p%@example.com';"
Sql "DELETE FROM usr_login_attempts;" | Out-Null
Say "ลบบัญชีทดสอบเรียบร้อย" ($left -eq "0") "เหลือ $left บัญชี"

Write-Host ""
if ($failed -eq 0) {
    Write-Host "ผ่านทั้งหมด $passed เคส" -ForegroundColor Green
    exit 0
} else {
    Write-Host "ผ่าน $passed · ไม่ผ่าน $failed" -ForegroundColor Red
    exit 1
}
