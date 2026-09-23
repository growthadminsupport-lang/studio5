<#
    ทดสอบ endpoint เด็กและผลวัดผ่าน HTTP จริง — /api/children และ /api/children/{id}/growth

    ต้องสตาร์ทเซิร์ฟเวอร์ก่อน:
        $env:PGPASSWORD = "devpass"; venv\Scripts\python.exe -m uvicorn main:app

    แล้วรัน:
        powershell -File tests\children_growth_api_smoke_test.ps1 -Psql "<path ของ psql.exe>"

    สคริปต์ลบบัญชีที่ตัวเองสร้างทิ้งตอนจบ (CASCADE ลบเด็กและผลวัดให้เอง)

    ทำไมต้องมีไฟล์นี้: endpoint กลุ่มนี้เคยตอบ 500 ทุกครั้งอยู่นานโดยไม่มีใครรู้
    เพราะเทสต์ใน tests/test_*.py ใช้ stub ไม่แตะฐานข้อมูลจริง — ORM ประกาศ sex เป็น
    String ทั้งที่คอลัมน์เป็น ENUM แล้ว PostgreSQL หา operator ไม่เจอ (พบ 2026-09-15)
    ของแบบนี้จับได้ทางเดียวคือยิงกับฐานข้อมูลจริง

    หมายเหตุ: ref_growth_lms ยังว่าง percentile/SDS จึงเป็น null ตามที่คาด
    ไฟล์นี้ต้องบันทึกเป็น UTF-8 พร้อม BOM (ดูหมายเหตุใน auth_api_smoke_test.ps1)
#>

param(
    [string]$BaseUrl = "http://127.0.0.1:8000",
    [string]$Psql    = "$env:LOCALAPPDATA\growth-pg\pgsql\bin\psql.exe",
    [string]$Db      = "growth_db",
    [string]$DbUser  = "postgres"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$failed = 0
$passed = 0
$password = "ParentPhrase2026"
$emailA = "childA$(Get-Random -Maximum 999999)@example.com"
$emailB = "childB$(Get-Random -Maximum 999999)@example.com"

function J($o) { $o | ConvertTo-Json -Compress -Depth 5 }

function Say($name, $ok, $detail) {
    if ($ok) { $script:passed++; Write-Host "  ok   $name" -NoNewline; if ($detail) { Write-Host " — $detail" -ForegroundColor DarkGray } else { Write-Host "" } }
    else     { $script:failed++; Write-Host "  FAIL $name — $detail" -ForegroundColor Red }
}

function StatusOf($err) { try { [int]$err.Exception.Response.StatusCode } catch { -1 } }
function Detail($err) {
    try { $s = $err.Exception.Response.GetResponseStream(); $s.Position = 0
          $r = New-Object IO.StreamReader($s, [Text.Encoding]::UTF8); ($r.ReadToEnd() | ConvertFrom-Json).detail }
    catch { "" }
}

function Call($method, $path, $body, $token) {
    $h = @{}
    if ($token) { $h["Authorization"] = "Bearer $token" }
    $args = @{ Uri = "$BaseUrl$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
    if ($null -ne $body) {
        $args["ContentType"] = "application/json; charset=utf-8"
        $args["Body"] = [Text.Encoding]::UTF8.GetBytes((J $body))
    }
    $resp = Invoke-WebRequest @args
    if ($resp.Content) { [Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray()) | ConvertFrom-Json } else { $null }
}

function Expect($name, $method, $path, $body, $token, $expectStatus) {
    try { Call $method $path $body $token | Out-Null; Say $name $false "ควรได้ $expectStatus แต่ผ่านไปได้" }
    catch { $s = StatusOf $_; Say $name ($s -eq $expectStatus) "HTTP $s $(if ($s -ne $expectStatus) { Detail $_ })" }
}

function Sql($query) { (& $Psql -h localhost -U $DbUser -d $Db -t -A -c $query).Trim() }

Write-Host "`n=== เตรียมผู้ใช้สองคน ==="
$a = Call POST "/api/auth/register" @{ full_name="ผู้ปกครอง เอ"; email=$emailA; password=$password; terms_accepted=$true }
$b = Call POST "/api/auth/register" @{ full_name="ผู้ปกครอง บี"; email=$emailB; password=$password; terms_accepted=$true }
$tA = $a.access_token; $tB = $b.access_token
Say "สมัครผู้ใช้ A และ B" ($tA -and $tB) ""

Write-Host "`n=== สร้างโปรไฟล์เด็ก (เคย 500 เพราะ ENUM) ==="
$child = Call POST "/api/children" @{ name="  น้องเอ  "; sex="male"; date_of_birth="2020-06-15" } $tA
Say "POST /api/children ได้ 201 พร้อม id" ($null -ne $child.id) "sex=$($child.sex) dob=$($child.date_of_birth)"
Say "ชื่อเด็กถูกตัดช่องว่างหัวท้ายก่อนบันทึก" ($child.name -eq "น้องเอ") ""
$cid = $child.id

Expect "ชื่อเด็กว่างล้วนต้องได้ 422" POST "/api/children" @{ name="   "; sex="male"; date_of_birth="2020-01-01" } $tA 422
Expect "แก้ชื่อเป็นช่องว่างล้วนต้องได้ 422" PATCH "/api/children/$cid" @{ name="   " } $tA 422

Expect "sex ที่ไม่ใช่ male/female ต้องได้ 422" POST "/api/children" @{ name="x"; sex="other"; date_of_birth="2020-01-01" } $tA 422
Expect "วันเกิดในอนาคตต้องได้ 422" POST "/api/children" @{ name="x"; sex="male"; date_of_birth="2099-01-01" } $tA 422
Expect "ไม่มี token ต้องได้ 401" POST "/api/children" @{ name="x"; sex="male"; date_of_birth="2020-01-01" } $null 401

Write-Host "`n=== อ่านและแก้ไข ==="
$list = Call GET "/api/children" $null $tA
Say "GET /api/children เห็นเด็ก 1 คน" ($list.Count -eq 1 -and $list[0].id -eq $cid) "$($list.Count) คน"
$one = Call GET "/api/children/$cid" $null $tA
Say "GET /api/children/{id}" ($one.name -eq "น้องเอ") $one.name

$patched = Call PATCH "/api/children/$cid" @{ name="น้องเอ (แก้)"; sex="female" } $tA
Say "PATCH ชื่อ + sex (เคย 500 เพราะ ENUM ตอน UPDATE)" ($patched.name -eq "น้องเอ (แก้)" -and $patched.sex -eq "female") "sex=$($patched.sex)"

Write-Host "`n=== การแยกบัญชี (FR-24) — B ต้องมองไม่เห็นเด็กของ A ==="
Expect "B อ่านเด็กของ A ต้องได้ 404" GET "/api/children/$cid" $null $tB 404
Expect "B แก้เด็กของ A ต้องได้ 404" PATCH "/api/children/$cid" @{ name="แฮก" } $tB 404
Expect "B ลบเด็กของ A ต้องได้ 404" DELETE "/api/children/$cid" $null $tB 404
Expect "B บันทึกผลวัดให้เด็กของ A ต้องได้ 404" POST "/api/children/$cid/growth" @{ measurement_date="2024-01-01"; height_cm=100; weight_kg=15 } $tB 404
$listB = Call GET "/api/children" $null $tB
Say "B เห็นรายการว่าง" ($listB.Count -eq 0) "$($listB.Count) คน"

Write-Host "`n=== บันทึกผลวัด (เคย 500 เพราะ ENUM ใน LMS lookup) ==="
$g = Call POST "/api/children/$cid/growth" @{ measurement_date="2024-01-15"; height_cm=101.5; weight_kg=16.2 } $tA
Say "POST growth ได้ 201" ($null -ne $g.id) "bmi=$($g.bmi) height_percentile=$($g.height_percentile) (null ตามคาด ref_growth_lms ว่าง)"
Say "BMI คำนวณถูก" ([math]::Abs($g.bmi - 15.72) -lt 0.05) "$($g.bmi)"
Say "percentile เป็น null เพราะยังไม่มีข้อมูลอ้างอิง" ($null -eq $g.height_percentile) ""
Say "ไม่มี reference ต้องไม่สรุปว่าปกติ" ($g.guidance_message -notmatch "ปกติ" -and $g.guidance_message -match "ข้อมูลอ้างอิง") ""

Expect "วันเดิมซ้ำต้องได้ 409" POST "/api/children/$cid/growth" @{ measurement_date="2024-01-15"; height_cm=100; weight_kg=15 } $tA 409
Expect "วัดก่อนเกิดต้องได้ 422" POST "/api/children/$cid/growth" @{ measurement_date="2019-01-01"; height_cm=50; weight_kg=3 } $tA 422
Expect "วัดในอนาคตต้องได้ 422" POST "/api/children/$cid/growth" @{ measurement_date="2099-01-01"; height_cm=100; weight_kg=15 } $tA 422
Expect "ส่วนสูง 0 ต้องได้ 422" POST "/api/children/$cid/growth" @{ measurement_date="2024-02-01"; height_cm=0; weight_kg=15 } $tA 422
Expect "ส่วนสูง 0.001 (ปัดเป็น 0.00 ในฐานข้อมูล) ต้องได้ 422 ไม่ใช่ 409 หลอก" POST "/api/children/$cid/growth" @{ measurement_date="2024-02-01"; height_cm=0.001; weight_kg=15 } $tA 422
Expect "ส่วนสูง 30 + น้ำหนัก 300 (BMI 3333 ล้นคอลัมน์) ต้องได้ 422 ไม่ใช่ 500" POST "/api/children/$cid/growth" @{ measurement_date="2024-02-01"; height_cm=30; weight_kg=300 } $tA 422

$hist = Call GET "/api/children/$cid/growth" $null $tA
Say "GET growth history เห็น 1 รายการ" ($hist.Count -eq 1) "$($hist.Count) รายการ"

Write-Host "`n=== PATCH วันเกิดต้องไม่ทับผลวัดที่มีอยู่ ==="
Expect "เลื่อนวันเกิดไปหลังผลวัด 2024-01-15 ต้องได้ 422" PATCH "/api/children/$cid" @{ date_of_birth="2024-06-01" } $tA 422
$ok = Call PATCH "/api/children/$cid" @{ date_of_birth="2020-07-01" } $tA
Say "เลื่อนวันเกิดที่ยังอยู่ก่อนผลวัดได้" ($ok.date_of_birth -eq "2020-07-01") $ok.date_of_birth

Write-Host "`n=== ลบ ==="
Call DELETE "/api/children/$cid" $null $tA | Out-Null
Expect "ลบแล้ว GET ต้องได้ 404" GET "/api/children/$cid" $null $tA 404
$left = Sql "SELECT count(*) FROM chd_growth_records WHERE chd_id = '$cid';"
Say "ผลวัดถูกลบตาม CASCADE" ($left -eq "0") "เหลือ $left แถว"

Write-Host "`n=== เก็บกวาด ==="
Sql "DELETE FROM usr_accounts WHERE email IN ('$emailA', '$emailB');" | Out-Null
$leftUsers = Sql "SELECT count(*) FROM usr_accounts WHERE email IN ('$emailA', '$emailB');"
Say "ลบผู้ใช้ทดสอบเรียบร้อย" ($leftUsers -eq "0") ""

Write-Host ""
if ($failed -eq 0) { Write-Host "ผ่านทั้งหมด $passed เคส" -ForegroundColor Green; exit 0 }
else { Write-Host "ผ่าน $passed · ไม่ผ่าน $failed" -ForegroundColor Red; exit 1 }
