<#
.SYNOPSIS
    PostgreSQL แบบ portable สำหรับทดสอบ — ไม่ติดตั้งลงเครื่อง ไม่ลง service ไม่ต้องใช้ admin

.DESCRIPTION
    เครื่องพัฒนาปัจจุบันไม่มี PostgreSQL ติดตั้งไว้ (ดู README หัวข้อ "วิธีรัน database")
    สคริปต์นี้โหลด zip ของ EDB มาแตกไว้ในโฟลเดอร์เดียว สร้าง cluster สตาร์ท โหลด schema
    ให้ครบในคำสั่งเดียว — ลบโฟลเดอร์ทิ้งก็หายหมด ไม่มีอะไรค้างในเครื่อง

    ค่าเริ่มต้นเก็บที่ %LOCALAPPDATA%\growth-pg (นอกโปรเจกต์ ไม่ติด git)
    รหัสผ่าน postgres = devpass · พอร์ต 5432 · ฐานข้อมูล growth_db

.EXAMPLE
    powershell -File tests\pg_portable.ps1 setup     # ครั้งแรก: โหลด + initdb + start + โหลด schema
    powershell -File tests\pg_portable.ps1 start     # ครั้งถัดไป
    powershell -File tests\pg_portable.ps1 stop
    powershell -File tests\pg_portable.ps1 status
    powershell -File tests\pg_portable.ps1 reset     # ลบ growth_db แล้วโหลด schema ใหม่ (ข้อมูลหาย)
    powershell -File tests\pg_portable.ps1 psql      # เปิด psql เข้า growth_db

    แล้วรัน API ด้วย   $env:PGPASSWORD = "devpass"; venv\Scripts\python.exe -m uvicorn main:app --reload
    (asyncpg อ่าน PGPASSWORD เอง ไม่ต้องแก้ .env)
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet("setup", "start", "stop", "status", "reset", "psql")]
    [string]$Action = "status",

    [string]$Root = "$env:LOCALAPPDATA\growth-pg",
    [string]$Password = "devpass",
    [int]$Port = 5432,
    [string]$Database = "growth_db",
    [string]$Version = "18.1-1"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$Bin  = "$Root\pgsql\bin"
$Data = "$Root\data"
$Log  = "$Root\pg.log"
$ProjectRoot = Split-Path -Parent $PSScriptRoot   # โฟลเดอร์ backend/

$env:PGPASSWORD = $Password
$env:PGCLIENTENCODING = "UTF8"

function Say($msg) { Write-Host ">> $msg" }

function Ensure-Binaries {
    if (Test-Path "$Bin\postgres.exe") { return }
    Say "ยังไม่มี PostgreSQL ที่ $Root — กำลังโหลด (ประมาณ 320 MB)"
    New-Item -ItemType Directory -Force $Root | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $zip = "$Root\pg.zip"
    Invoke-WebRequest "https://get.enterprisedb.com/postgresql/postgresql-$Version-windows-x64-binaries.zip" `
        -OutFile $zip -UseBasicParsing
    Say "แตกไฟล์ (ข้าม pgAdmin/docs ที่ไม่ได้ใช้ — path ยาวเกิน 260 ตัวจน Expand-Archive พัง จึงใช้ tar)"
    Push-Location $Root
    try {
        tar -xf pg.zip --exclude="pgsql/pgAdmin 4/*" --exclude="pgsql/symbols/*" `
            --exclude="pgsql/doc/*" --exclude="pgsql/include/*" --exclude="pgsql/StackBuilder/*"
    } finally { Pop-Location }
    Remove-Item $zip
    Say "ได้ $(& "$Bin\postgres.exe" --version)"
}

function Ensure-Cluster {
    if (Test-Path "$Data\PG_VERSION") { return }
    Say "สร้าง cluster ใหม่ที่ $Data"
    $pw = "$Root\pw.txt"
    Set-Content -Path $pw -Value $Password -Encoding ascii -NoNewline
    try {
        & "$Bin\initdb.exe" -D $Data -U postgres --pwfile=$pw -E UTF8 --locale=C | Out-Null
    } finally { Remove-Item $pw -ErrorAction SilentlyContinue }
}

function Is-Running {
    & "$Bin\pg_isready.exe" -h localhost -p $Port 2>$null | Out-Null
    return $LASTEXITCODE -eq 0
}

function Start-Pg {
    if (Is-Running) { Say "PostgreSQL รันอยู่แล้วที่พอร์ต $Port"; return }
    Say "สตาร์ท PostgreSQL พอร์ต $Port"
    # ห้าม pipe output ของ pg_ctl — process ลูกจะสืบทอด handle แล้วทำให้คำสั่งค้าง
    & "$Bin\pg_ctl.exe" -D $Data -l $Log -o "-p $Port" -w start
    if (-not (Is-Running)) { throw "สตาร์ทไม่สำเร็จ ดู $Log" }
}

function Db-Exists {
    $r = & "$Bin\psql.exe" -h localhost -p $Port -U postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$Database';"
    return $r -eq "1"
}

function Load-Schema {
    Say "สร้างฐานข้อมูล $Database แล้วโหลด growth_schema.sql + admin_schema.sql"
    & "$Bin\psql.exe" -h localhost -p $Port -U postgres -q -c "CREATE DATABASE $Database;"
    & "$Bin\psql.exe" -h localhost -p $Port -U postgres -d $Database -q -v ON_ERROR_STOP=1 -f "$ProjectRoot\growth_schema.sql"
    & "$Bin\psql.exe" -h localhost -p $Port -U postgres -d $Database -q -v ON_ERROR_STOP=1 -f "$ProjectRoot\admin_schema.sql"
    $n = & "$Bin\psql.exe" -h localhost -p $Port -U postgres -d $Database -t -A -c `
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
    Say "โหลด schema แล้ว — $n ตาราง"
}

switch ($Action) {
    "setup" {
        Ensure-Binaries
        Ensure-Cluster
        Start-Pg
        if (Db-Exists) { Say "$Database มีอยู่แล้ว ไม่โหลด schema ซ้ำ (ใช้ reset ถ้าต้องการล้าง)" }
        else { Load-Schema }
        Say "พร้อมใช้ — DATABASE_URL ใน .env ชี้ localhost:5432 อยู่แล้ว แค่ตั้ง `$env:PGPASSWORD = `"$Password`" ก่อนรัน uvicorn"
    }
    "start" {
        if (-not (Test-Path "$Bin\postgres.exe")) { throw "ยังไม่ได้ setup — รัน: pg_portable.ps1 setup" }
        Start-Pg
    }
    "stop" {
        if (-not (Test-Path "$Data\PG_VERSION")) { Say "ไม่มี cluster ที่ $Data"; break }
        if (-not (Is-Running)) { Say "ไม่ได้รันอยู่"; break }
        & "$Bin\pg_ctl.exe" -D $Data -w stop
        Say "หยุดแล้ว"
    }
    "status" {
        if (-not (Test-Path "$Bin\postgres.exe")) { Say "ยังไม่ได้ setup (ไม่มี $Bin)"; break }
        if (Is-Running) {
            Say "รันอยู่ที่พอร์ต $Port · $(& "$Bin\postgres.exe" --version)"
            if (Db-Exists) { Say "ฐานข้อมูล $Database มีอยู่" } else { Say "ยังไม่มีฐานข้อมูล $Database" }
        } else { Say "ไม่ได้รัน (มี binaries ที่ $Root) — สั่ง start" }
    }
    "reset" {
        Start-Pg
        Say "ลบ $Database ทิ้ง (ข้อมูลทดสอบหายหมด)"
        & "$Bin\psql.exe" -h localhost -p $Port -U postgres -q -c "DROP DATABASE IF EXISTS $Database WITH (FORCE);"
        Load-Schema
    }
    "psql" {
        Start-Pg
        & "$Bin\psql.exe" -h localhost -p $Port -U postgres -d $Database
    }
}
