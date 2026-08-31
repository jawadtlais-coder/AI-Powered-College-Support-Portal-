param(
  [string]$ReferenceDeck = "C:\Users\Admin\Downloads\Lebanon_Crisis_Coordination.pptx",
  [string]$OutputDeck = "C:\Users\Admin\Desktop\Multi-Agent\Transcendence-main\docs\College_Support_Multi_Agent_Presentation.pptx"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$assetDir = Join-Path $root "tmp_presentation_assets"
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null

function ExtractMedia($deck, $entryName, $fileName) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($deck)
  try {
    $entry = $zip.GetEntry($entryName)
    if ($null -eq $entry) { throw "Could not find $entryName in $deck" }
    $target = Join-Path $assetDir $fileName
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
    return $target
  }
  finally {
    $zip.Dispose()
  }
}

function C([int]$r, [int]$g, [int]$b) {
  return $r + ($g * 256) + ($b * 65536)
}

$liuLogo = ExtractMedia $ReferenceDeck "ppt/media/image4.png" "liu-logo.png"
$engLogo = ExtractMedia $ReferenceDeck "ppt/media/image5.png" "engineering-logo.png"

$navy = C 5 57 94
$navyDark = C 4 47 79
$teal = C 72 170 173
$ink = C 35 47 64
$muted = C 88 101 120
$paper = C 245 245 245
$white = C 255 255 255
$line = C 226 233 240
$blueSoft = C 221 235 252
$greenSoft = C 211 248 230
$yellowSoft = C 255 244 197
$pinkSoft = C 255 224 224
$purpleSoft = C 235 226 255
$blue = C 75 135 230
$green = C 20 170 112
$orange = C 225 145 20
$red = C 230 63 63
$purple = C 120 70 220

$msoFalse = 0
$msoTrue = -1
$blank = 12
$rect = 1
$oval = 9
$connectorStraight = 1
$textHorizontal = 1
$leftAlign = 1
$centerAlign = 2

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $msoTrue
$deck = $ppt.Presentations.Add()
$deck.PageSetup.SlideWidth = 720
$deck.PageSetup.SlideHeight = 405

function Slide() {
  return $deck.Slides.Add($deck.Slides.Count + 1, $blank)
}

function Box($s, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill, $stroke = $null) {
  $shape = $s.Shapes.AddShape($rect, $x, $y, $w, $h)
  $shape.Fill.ForeColor.RGB = $fill
  if ($null -eq $stroke) {
    $shape.Line.Visible = $msoFalse
  }
  else {
    $shape.Line.Visible = $msoTrue
    $shape.Line.ForeColor.RGB = [int]$stroke
  }
  return $shape
}

function Text($s, [string]$value, [double]$x, [double]$y, [double]$w, [double]$h, [double]$size, [int]$color, [bool]$bold = $false, [int]$align = 1, [string]$font = "Open Sans") {
  $shape = $s.Shapes.AddTextbox($textHorizontal, $x, $y, $w, $h)
  $shape.TextFrame.MarginLeft = 0
  $shape.TextFrame.MarginRight = 0
  $shape.TextFrame.MarginTop = 0
  $shape.TextFrame.MarginBottom = 0
  $shape.TextFrame.WordWrap = $msoTrue
  $range = $shape.TextFrame.TextRange
  $range.Text = $value
  $range.Font.Name = $font
  $range.Font.Size = $size
  $range.Font.Color.RGB = $color
  $range.Font.Bold = if ($bold) { $msoTrue } else { $msoFalse }
  $range.ParagraphFormat.Alignment = $align
  return $shape
}

function Header($s, [string]$icon, [string]$title, [int]$num) {
  Box $s 0 0 720 4 $navy | Out-Null
  Box $s 0 401 720 4 $teal | Out-Null
  Text $s $icon 36 42 34 28 20 $navy $true $centerAlign "Montserrat" | Out-Null
  Text $s $title 74 43 560 34 23 $navy $true $leftAlign "Montserrat" | Out-Null
  Text $s "College Support Multi-Agent Portal" 36 374 260 12 7.5 (C 75 90 110) $false $leftAlign "Open Sans" | Out-Null
  Text $s ([string]$num) 680 374 20 12 7.5 (C 75 90 110) $false $centerAlign "Open Sans" | Out-Null
}

function Icon($s, [string]$value, [double]$x, [double]$y, [int]$fill, [int]$color) {
  $circle = $s.Shapes.AddShape($oval, $x, $y, 24, 24)
  $circle.Fill.ForeColor.RGB = $fill
  $circle.Line.Visible = $msoFalse
  Text $s $value ($x + 3) ($y + 3) 18 18 10 $color $true $centerAlign "Open Sans" | Out-Null
}

function Card($s, [double]$x, [double]$y, [double]$w, [double]$h) {
  Box $s $x $y $w $h $white | Out-Null
}

function ListItems($s, [string[]]$items, [double]$x, [double]$y, [double]$w, [double]$gap = 23) {
  for ($i = 0; $i -lt $items.Count; $i++) {
    $yy = $y + ($i * $gap)
    Text $s "+" $x $yy 16 15 10 $green $true $centerAlign "Open Sans" | Out-Null
    Text $s $items[$i] ($x + 22) $yy ($w - 22) 17 9.8 $ink $false $leftAlign "Open Sans" | Out-Null
  }
}

function ThreeCards($s, [object[]]$items, [double]$top) {
  $xs = @(108, 270, 432)
  for ($i = 0; $i -lt $items.Count; $i++) {
    $it = $items[$i]
    Card $s $xs[$i] $top 146 116
    Box $s $xs[$i] $top 3 116 $teal | Out-Null
    Icon $s $it.Icon ($xs[$i] + 17) ($top + 16) $it.Fill $it.Color
    Text $s $it.Title ($xs[$i] + 17) ($top + 52) 112 20 12.2 $navy $true $leftAlign "Montserrat" | Out-Null
    Text $s $it.Body ($xs[$i] + 17) ($top + 78) 112 35 9.2 $muted $false $leftAlign "Open Sans" | Out-Null
  }
}

function Dark($s) {
  Box $s 0 0 720 405 $navyDark | Out-Null
}

function Logos($s) {
  $s.Shapes.AddPicture($liuLogo, $msoFalse, $msoTrue, 27, 17, 74, 62) | Out-Null
  $s.Shapes.AddPicture($engLogo, $msoFalse, $msoTrue, 616, 20, 63, 63) | Out-Null
}

function WriteUseCaseSvg() {
  $path = Join-Path $assetDir "use-case-diagram.svg"
  @'
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="760" viewBox="0 0 1400 760">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#26c93d"/>
    </marker>
    <style>
      .actor { stroke:#111; stroke-width:2; fill:none; }
      .oval { fill:#fff; stroke:#111; stroke-width:1.6; }
      .txt { font-family:Arial, Helvetica, sans-serif; font-size:16px; fill:#111; text-anchor:middle; dominant-baseline:middle; }
      .actorTxt { font-family:Arial, Helvetica, sans-serif; font-size:15px; fill:#111; text-anchor:middle; }
      .line { stroke:#111; stroke-width:1.6; fill:none; }
      .inc { stroke:#26c93d; stroke-width:1.4; stroke-dasharray:8 8; fill:none; marker-end:url(#arrow); }
      .incTxt { font-family:Arial, Helvetica, sans-serif; font-size:14px; fill:#26c93d; font-style:italic; text-anchor:middle; }
      .boundary { stroke:#111; stroke-width:1.6; stroke-dasharray:9 9; }
    </style>
  </defs>
  <rect width="1400" height="760" fill="#fff"/>
  <line class="boundary" x1="95" y1="0" x2="95" y2="760"/>
  <line class="boundary" x1="1296" y1="0" x2="1296" y2="760"/>

  <!-- Actors -->
  <circle class="actor" cx="42" cy="118" r="10"/><line class="actor" x1="42" y1="128" x2="42" y2="175"/>
  <line class="actor" x1="42" y1="142" x2="20" y2="162"/><line class="actor" x1="42" y1="142" x2="74" y2="160"/>
  <line class="actor" x1="42" y1="175" x2="25" y2="207"/><line class="actor" x1="42" y1="175" x2="61" y2="207"/>
  <text class="actorTxt" x="42" y="235">Student</text>

  <circle class="actor" cx="42" cy="600" r="10"/><line class="actor" x1="42" y1="610" x2="42" y2="657"/>
  <line class="actor" x1="42" y1="624" x2="20" y2="644"/><line class="actor" x1="42" y1="624" x2="74" y2="642"/>
  <line class="actor" x1="42" y1="657" x2="25" y2="689"/><line class="actor" x1="42" y1="657" x2="61" y2="689"/>
  <text class="actorTxt" x="42" y="718">Staff</text>

  <circle class="actor" cx="1358" cy="290" r="10"/><line class="actor" x1="1358" y1="300" x2="1358" y2="347"/>
  <line class="actor" x1="1358" y1="314" x2="1325" y2="332"/><line class="actor" x1="1358" y1="314" x2="1385" y2="332"/>
  <line class="actor" x1="1358" y1="347" x2="1338" y2="379"/><line class="actor" x1="1358" y1="347" x2="1378" y2="379"/>
  <text class="actorTxt" x="1358" y="407">Admin</text>

  <!-- Student use cases -->
  <ellipse class="oval" cx="240" cy="70" rx="108" ry="38"/><text class="txt" x="240" y="70">View / Update<tspan x="240" dy="18">Profile</tspan></text>
  <ellipse class="oval" cx="330" cy="190" rx="95" ry="38"/><text class="txt" x="330" y="190">Login</text>
  <ellipse class="oval" cx="500" cy="42" rx="118" ry="35"/><text class="txt" x="500" y="42">Create Ticket with Details</text>
  <ellipse class="oval" cx="560" cy="128" rx="120" ry="36"/><text class="txt" x="560" y="128">Ask Assistant Question</text>
  <ellipse class="oval" cx="610" cy="210" rx="118" ry="36"/><text class="txt" x="610" y="210">View Unread<tspan x="610" dy="18">Notifications</tspan></text>
  <ellipse class="oval" cx="610" cy="300" rx="118" ry="36"/><text class="txt" x="610" y="300">Search Knowledge<tspan x="610" dy="18">Base</tspan></text>
  <ellipse class="oval" cx="235" cy="450" rx="118" ry="36"/><text class="txt" x="235" y="450">Receive Answer from<tspan x="235" dy="18">Knowledge Agent</tspan></text>
  <ellipse class="oval" cx="430" cy="435" rx="100" ry="34"/><text class="txt" x="430" y="435">Add<tspan x="430" dy="18">Attachment</tspan></text>
  <ellipse class="oval" cx="585" cy="430" rx="108" ry="36"/><text class="txt" x="585" y="430">View My Tickets</text>

  <line class="line" x1="74" y1="160" x2="240" y2="190"/>
  <path class="inc" d="M330,152 C300,130 270,110 250,92"/><text class="incTxt" x="253" y="145">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M355,154 C390,98 435,68 490,55"/><text class="incTxt" x="420" y="98">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M420,178 C455,150 498,138 540,132"/><text class="incTxt" x="460" y="155">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M425,195 C480,196 535,204 595,210"/><text class="incTxt" x="505" y="188">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M405,218 C460,245 520,276 595,300"/><text class="incTxt" x="490" y="244">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M310,228 C285,285 260,355 238,415"/><text class="incTxt" x="245" y="307">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M340,228 C365,300 398,378 425,402"/><text class="incTxt" x="376" y="330">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M365,226 C425,298 502,370 570,408"/><text class="incTxt" x="470" y="345">&lt;&lt;include&gt;&gt;</text>

  <!-- Staff use cases -->
  <ellipse class="oval" cx="285" cy="570" rx="92" ry="35"/><text class="txt" x="285" y="570">Login</text>
  <ellipse class="oval" cx="652" cy="505" rx="118" ry="36"/><text class="txt" x="652" y="505">Update Ticket<tspan x="652" dy="18">Information</tspan></text>
  <ellipse class="oval" cx="684" cy="590" rx="110" ry="36"/><text class="txt" x="684" y="590">View Ticket<tspan x="684" dy="18">Queue</tspan></text>
  <ellipse class="oval" cx="665" cy="660" rx="108" ry="36"/><text class="txt" x="665" y="660">Claim<tspan x="665" dy="18">Ticket</tspan></text>
  <ellipse class="oval" cx="670" cy="730" rx="115" ry="36"/><text class="txt" x="670" y="730">Update Ticket<tspan x="670" dy="18">Status</tspan></text>
  <line class="line" x1="74" y1="642" x2="210" y2="580"/>
  <path class="inc" d="M360,555 C445,520 548,507 635,505"/><text class="incTxt" x="475" y="522">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M370,578 C460,584 570,588 670,590"/><text class="incTxt" x="494" y="574">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M355,598 C440,630 550,650 648,660"/><text class="incTxt" x="485" y="628">&lt;&lt;include&gt;&gt;</text>
  <path class="inc" d="M335,602 C430,680 548,710 652,730"/><text class="incTxt" x="456" y="675">&lt;&lt;include&gt;&gt;</text>

  <!-- Admin use cases -->
  <ellipse class="oval" cx="1012" cy="160" rx="105" ry="36"/><text class="txt" x="1012" y="160">Create FAQ<tspan x="1012" dy="18">Entry</tspan></text>
  <ellipse class="oval" cx="1012" cy="250" rx="110" ry="36"/><text class="txt" x="1012" y="250">Upload Knowledge<tspan x="1012" dy="18">Document</tspan></text>
  <ellipse class="oval" cx="1012" cy="340" rx="118" ry="36"/><text class="txt" x="1012" y="340">Provision Staff<tspan x="1012" dy="18">Admin Use</tspan></text>
  <ellipse class="oval" cx="1012" cy="430" rx="108" ry="36"/><text class="txt" x="1012" y="430">View Ticket<tspan x="1012" dy="18">Queue</tspan></text>
  <ellipse class="oval" cx="1012" cy="520" rx="105" ry="36"/><text class="txt" x="1012" y="520">Claim<tspan x="1012" dy="18">Ticket</tspan></text>
  <ellipse class="oval" cx="1012" cy="610" rx="110" ry="36"/><text class="txt" x="1012" y="610">Update Ticket<tspan x="1012" dy="18">Status</tspan></text>
  <ellipse class="oval" cx="1012" cy="690" rx="118" ry="36"/><text class="txt" x="1012" y="690">Generate API Key</text>
  <ellipse class="oval" cx="1012" cy="745" rx="132" ry="34"/><text class="txt" x="1012" y="745">Review Orchestrator Traces</text>

  <line class="line" x1="1110" y1="165" x2="1325" y2="305"/>
  <line class="line" x1="1118" y1="250" x2="1325" y2="308"/>
  <line class="line" x1="1128" y1="340" x2="1325" y2="313"/>
  <line class="line" x1="1118" y1="430" x2="1325" y2="318"/>
  <line class="line" x1="1115" y1="520" x2="1325" y2="322"/>
  <line class="line" x1="1118" y1="610" x2="1325" y2="327"/>
  <line class="line" x1="1130" y1="690" x2="1325" y2="333"/>
  <line class="line" x1="1135" y1="745" x2="1325" y2="339"/>
</svg>
'@ | Set-Content -LiteralPath $path -Encoding UTF8
  return $path
}

# 1. Title
$s = Slide
Dark $s
Logos $s
Box $s 66 139 70 58 $white | Out-Null
Text $s "CS" 80 151 42 30 19 (C 54 89 140) $true $centerAlign "Montserrat" | Out-Null
Text $s "College Support Multi-Agent Portal" 146 146 512 42 27 $white $true $leftAlign "Montserrat" | Out-Null
Text $s "AI" 230 209 28 18 13 $teal $true $centerAlign "Montserrat" | Out-Null
Text $s "Chat-first platform for Registration and IT support" 265 210 315 18 12.5 $teal $false $leftAlign "Open Sans" | Out-Null
Box $s 146 258 4 95 $teal | Out-Null
Text $s "Presented by:" 160 274 82 14 10 $white $true $leftAlign "Open Sans" | Out-Null
Text $s "Your Team Name" 244 274 140 14 10 $white $false $leftAlign "Open Sans" | Out-Null
Text $s "Supervised by:" 160 296 82 14 10 $white $true $leftAlign "Open Sans" | Out-Null
Text $s "Instructor Name" 244 296 140 14 10 $white $false $leftAlign "Open Sans" | Out-Null
Text $s "School Of Engineering - Department of Computer and Communication Engineering" 160 331 460 14 10 $white $true $leftAlign "Open Sans" | Out-Null
Text $s "College Support Multi-Agent Portal" 572 370 120 12 7.5 $white $false $leftAlign "Open Sans" | Out-Null

# 2. Outline
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "[]" "Outline" 2
$outline = @("Introduction", "Problem Statement", "Similar Systems", "System Design", "Implementation", "Conclusion", "Future Work", "Demo Video")
for ($i = 0; $i -lt $outline.Count; $i++) {
  $y = 100 + ($i * 31)
  Text $s ("{0}." -f ($i + 1)) 48 $y 24 18 12.5 $teal $true $leftAlign "Open Sans" | Out-Null
  Text $s $outline[$i] 82 $y 260 18 11.5 $ink $false $leftAlign "Open Sans" | Out-Null
}

# 3. Introduction
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "O" "Introduction" 3
Text $s "Student Support at LIU" 55 108 300 25 16 $teal $true $leftAlign "Montserrat" | Out-Null
$intro = @(
  @{Icon = "1"; Title = "Registration"; Text = "Admission, course registration, documents, NSSF clearance, transfer-credit questions."},
  @{Icon = "2"; Title = "IT Support"; Text = "Login, account access, Wi-Fi, email, portal, classroom technology, uploads, errors."},
  @{Icon = "3"; Title = "Student Experience"; Text = "Students need quick answers, clear routing, and traceable follow-up when the case is personal."}
)
for ($i = 0; $i -lt $intro.Count; $i++) {
  $y = 147 + ($i * 45)
  Icon $s $intro[$i].Icon 55 $y $blueSoft $blue
  Text $s $intro[$i].Title 88 ($y + 2) 128 16 10.2 $ink $true $leftAlign "Open Sans" | Out-Null
  Text $s $intro[$i].Text 228 ($y + 2) 260 30 9.4 $muted $false $leftAlign "Open Sans" | Out-Null
}
Card $s 520 125 145 190
Text $s "Impact" 560 145 74 20 13.5 $teal $true $leftAlign "Montserrat" | Out-Null
$impact = @(
  @{Icon = "+"; Text = "Less reception load"; Fill = $pinkSoft; Color = $red},
  @{Icon = ">"; Text = "Faster first response"; Fill = $yellowSoft; Color = $orange},
  @{Icon = "#"; Text = "Central knowledge"; Fill = $blueSoft; Color = $blue},
  @{Icon = "->"; Text = "Escalation to staff"; Fill = $greenSoft; Color = $green}
)
for ($i = 0; $i -lt $impact.Count; $i++) {
  $y = 182 + ($i * 34)
  Icon $s $impact[$i].Icon 535 $y $impact[$i].Fill $impact[$i].Color
  Text $s $impact[$i].Text 570 ($y + 5) 92 16 9.5 $ink $false $leftAlign "Open Sans" | Out-Null
}
Text $s "The project turns repeated student questions into a guided digital workflow: answer when knowledge is enough, create a ticket when the request needs staff action." 55 302 500 44 12 $ink $false $leftAlign "Open Sans" | Out-Null

# 4. Problem statement
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "!" "Problem Statement" 4
ThreeCards $s @(
  @{Icon = "!"; Title = "Fragmented Support"; Body = "Students move between offices, emails, and informal messages without a single support path."; Fill = $pinkSoft; Color = $red},
  @{Icon = "?"; Title = "Unclear Answers"; Body = "Policy questions repeat often, but answers depend on approved documents and current rules."; Fill = $yellowSoft; Color = $orange},
  @{Icon = ">"; Title = "Manual Escalation"; Body = "Personal cases need routing, ownership, status updates, and attachments for evidence."; Fill = $blueSoft; Color = $blue}
) 113
Text $s "Impact of These Problems" 126 262 250 24 15.5 $teal $true $leftAlign "Montserrat" | Out-Null
Text $s "AI" 126 300 34 30 20 $teal $true $centerAlign "Montserrat" | Out-Null
Text $s "Without a central portal, support becomes slower, harder to track, and inconsistent across Registration and IT. The platform addresses this with role-based access, knowledge retrieval, and ticket workflows." 168 298 420 52 12 $ink $false $leftAlign "Open Sans" | Out-Null

# 5. Similar systems
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "#" "Similar Systems" 5
ThreeCards $s @(
  @{Icon = "+"; Title = "Zendesk"; Body = "Enterprise helpdesk with ticket queues, automation, and multi-channel support."; Fill = $pinkSoft; Color = $red},
  @{Icon = "+"; Title = "Freshdesk"; Body = "Cloud support platform focused on ticket management, SLAs, and team workflows."; Fill = $blueSoft; Color = $blue},
  @{Icon = "+"; Title = "Intercom"; Body = "Chat-first customer support with messaging, bots, and knowledge base tools."; Fill = $greenSoft; Color = $green}
) 105
Text $s "Our Integrated Approach" 92 252 250 24 15.5 $teal $true $leftAlign "Montserrat" | Out-Null
Text $s "The system combines the strengths of each approach while covering the missing links:" 92 284 300 28 11.5 $ink $false $leftAlign "Open Sans" | Out-Null
ListItems $s @("Ticket routing like Zendesk", "Workflow tracking like Freshdesk", "Chat-first support like Intercom") 94 318 260 22
Text $s "Additional unique features:" 410 284 180 18 11.5 $ink $false $leftAlign "Open Sans" | Out-Null
ListItems $s @("Multi-agent orchestration", "Academic department routing", "API-key protected public endpoints") 410 318 260 22

# 6. System design
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s ">" "System Design" 6
Card $s 37 78 311 294
Text $s "Key Actors" 50 92 120 20 13.5 $teal $true $leftAlign "Montserrat" | Out-Null
$actors = @(
  @{Icon = "S"; Text = "Students"; Fill = $blueSoft; Color = $blue; X = 50; Y = 130},
  @{Icon = "T"; Text = "Staff"; Fill = $greenSoft; Color = $green; X = 190; Y = 130},
  @{Icon = "A"; Text = "Admin"; Fill = $pinkSoft; Color = $red; X = 50; Y = 172},
  @{Icon = "P"; Text = "Public API Client"; Fill = $purpleSoft; Color = $purple; X = 190; Y = 172}
)
foreach ($a in $actors) {
  Icon $s $a.Icon $a.X $a.Y $a.Fill $a.Color
  Text $s $a.Text ($a.X + 32) ($a.Y + 5) 112 16 10.2 $ink $false $leftAlign "Open Sans" | Out-Null
}
Text $s "Key Diagrams" 50 223 120 20 13.5 $teal $true $leftAlign "Montserrat" | Out-Null
ListItems $s @("Use Case Diagram", "Class Diagram", "Activity Diagram", "Sequence Diagram", "ER Diagram") 52 248 220 18
Card $s 386 78 297 294
Text $s "3-Layer Architecture" 405 102 210 22 14 $teal $true $leftAlign "Montserrat" | Out-Null
$layers = @(
  @{Name = "Web UI Layer"; Detail = "Next.js + TypeScript"; Tech = "Student, Staff, Admin screens"; Fill = $blueSoft; Y = 140},
  @{Name = "Backend Layer"; Detail = "NestJS business logic"; Tech = "Auth, Assistant, Tickets, Knowledge"; Fill = $greenSoft; Y = 202},
  @{Name = "Data + AI Layer"; Detail = "PostgreSQL + pgvector"; Tech = "Prisma, Gemini API, uploads"; Fill = $yellowSoft; Y = 264}
)
foreach ($layer in $layers) {
  Box $s 410 $layer.Y 247 46 $layer.Fill | Out-Null
  Text $s $layer.Name 424 ($layer.Y + 10) 110 16 10.5 $navy $true $leftAlign "Open Sans" | Out-Null
  Text $s $layer.Detail 424 ($layer.Y + 27) 115 12 8.5 $ink $false $leftAlign "Open Sans" | Out-Null
  Text $s $layer.Tech 538 ($layer.Y + 16) 105 24 8.5 $muted $false $centerAlign "Open Sans" | Out-Null
}
Text $s "The design separates presentation, business rules, data storage, and AI services while preserving a single support flow for users." 405 329 250 34 10.8 $ink $false $centerAlign "Open Sans" | Out-Null

# 7. System architecture
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "[]" "System Architecture" 7
Card $s 40 82 640 280
Text $s "System`nArchitecture" 54 105 125 72 19 $teal $true $leftAlign "Montserrat" | Out-Null
$boxes = @(
  @{Title = "Students / Staff / Admin"; Sub = "Browser UI"; X = 58; Y = 225; W = 110; H = 52; Fill = $blueSoft},
  @{Title = "Next.js Web"; Sub = "Pages + components"; X = 205; Y = 126; W = 130; H = 58; Fill = $white},
  @{Title = "NestJS API"; Sub = "REST controllers + guards"; X = 390; Y = 126; W = 130; H = 58; Fill = $white},
  @{Title = "PostgreSQL"; Sub = "Prisma schema + pgvector"; X = 552; Y = 232; W = 100; H = 52; Fill = $yellowSoft},
  @{Title = "Gemini API"; Sub = "LLM answers"; X = 390; Y = 250; W = 130; H = 52; Fill = $greenSoft},
  @{Title = "Knowledge Base"; Sub = "FAQ + documents"; X = 205; Y = 250; W = 130; H = 52; Fill = $purpleSoft}
)
foreach ($b in $boxes) {
  Box $s $b.X $b.Y $b.W $b.H $b.Fill $ink | Out-Null
  Text $s $b.Title ($b.X + 8) ($b.Y + 10) ($b.W - 16) 17 10.5 $navy $true $centerAlign "Open Sans" | Out-Null
  Text $s $b.Sub ($b.X + 8) ($b.Y + 30) ($b.W - 16) 16 8.5 $muted $false $centerAlign "Open Sans" | Out-Null
}
foreach ($c in @(@(168,251,205,155), @(335,155,390,155), @(520,155,552,245), @(455,184,455,250), @(335,279,390,279), @(270,184,270,250))) {
  $ln = $s.Shapes.AddConnector($connectorStraight, $c[0], $c[1], $c[2], $c[3])
  $ln.Line.ForeColor.RGB = $muted
  $ln.Line.Weight = 1.4
  $ln.Line.EndArrowheadStyle = 3
}
Text $s "Authentication, role permissions, ticket queues, knowledge retrieval, notifications, file uploads, and public API endpoints all sit behind the NestJS API." 184 320 420 26 10.5 $ink $false $centerAlign "Open Sans" | Out-Null

# 8. Use case diagram
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "O" "Use Case Diagram" 8
$useCaseSvg = WriteUseCaseSvg
Card $s 44 76 632 292
$s.Shapes.AddPicture($useCaseSvg, $msoFalse, $msoTrue, 52, 84, 616, 276) | Out-Null

# 9. Implementation
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "*" "Implementation" 9
Text $s "Technology Stack" 36 84 210 22 15.5 $teal $true $leftAlign "Montserrat" | Out-Null
$stack = @(
  @{Title = "Frontend"; Items = @("Next.js", "TypeScript"); X = 36; Y = 120; Fill = $blueSoft},
  @{Title = "Backend"; Items = @("NestJS", "JWT guards"); X = 206; Y = 120; Fill = $greenSoft},
  @{Title = "Database"; Items = @("PostgreSQL", "pgvector"); X = 36; Y = 213; Fill = $yellowSoft},
  @{Title = "Tools"; Items = @("Prisma", "Docker Compose"); X = 206; Y = 213; Fill = $purpleSoft}
)
foreach ($sc in $stack) {
  Card $s $sc.X $sc.Y 151 78
  Text $s $sc.Title ($sc.X + 14) ($sc.Y + 14) 100 16 11.5 $navy $true $leftAlign "Montserrat" | Out-Null
  Icon $s "." ($sc.X + 16) ($sc.Y + 39) $sc.Fill $navy
  Text $s $sc.Items[0] ($sc.X + 50) ($sc.Y + 43) 90 14 9.5 $ink $false $leftAlign "Open Sans" | Out-Null
  Icon $s "." ($sc.X + 16) ($sc.Y + 62) $sc.Fill $navy
  Text $s $sc.Items[1] ($sc.X + 50) ($sc.Y + 66) 90 14 9.5 $ink $false $leftAlign "Open Sans" | Out-Null
}
Text $s "Key Features" 386 84 210 22 15.5 $teal $true $leftAlign "Montserrat" | Out-Null
Card $s 386 120 300 220
$features = @(
  @{Icon = "A"; Title = "Multi-Agent Assistant"; Text = "Orchestrator routes to knowledge or workflow behavior."; Fill = $blueSoft; Color = $blue},
  @{Icon = "K"; Title = "Knowledge Retrieval"; Text = "FAQ and uploaded documents are searched for trusted answers."; Fill = $greenSoft; Color = $green},
  @{Icon = "T"; Title = "Ticket Workflow"; Text = "Create, claim, update, attach files, and notify users."; Fill = $yellowSoft; Color = $orange},
  @{Icon = "P"; Title = "Public API"; Text = "API-key protected endpoints for docs, search, and tickets."; Fill = $pinkSoft; Color = $red}
)
for ($i = 0; $i -lt $features.Count; $i++) {
  $y = 140 + ($i * 47)
  Icon $s $features[$i].Icon 405 $y $features[$i].Fill $features[$i].Color
  Text $s $features[$i].Title 445 ($y + 1) 200 15 10.5 $navy $true $leftAlign "Open Sans" | Out-Null
  Text $s $features[$i].Text 445 ($y + 18) 210 22 8.8 $muted $false $leftAlign "Open Sans" | Out-Null
}
Text $s "The implementation focuses on scalability, security, and student experience for effective campus support." 392 348 282 18 9.5 $ink $false $centerAlign "Open Sans" | Out-Null

# 10. Conclusion
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s "*" "Conclusion" 10
Text $s "Key Benefits" 318 95 120 22 15.5 $teal $true $leftAlign "Montserrat" | Out-Null
$benefits = @(
  @{Icon = "1"; Title = "Faster Student Guidance"; Text = "Common questions receive immediate, source-grounded responses."; X = 126; Y = 140; Fill = $blueSoft; Color = $blue},
  @{Icon = "2"; Title = "Clear Staff Ownership"; Text = "Tickets can be claimed, updated, and tracked by role."; X = 126; Y = 200; Fill = $greenSoft; Color = $green},
  @{Icon = "3"; Title = "Trusted Knowledge"; Text = "Admins control FAQs and document ingestion for reliable answers."; X = 126; Y = 260; Fill = $purpleSoft; Color = $purple},
  @{Icon = "4"; Title = "Reduced Reception Load"; Text = "Routine answers and guided ticket creation reduce repeated manual work."; X = 405; Y = 140; Fill = $yellowSoft; Color = $orange},
  @{Icon = "5"; Title = "Better Transparency"; Text = "Students see status, events, and notifications."; X = 405; Y = 200; Fill = $pinkSoft; Color = $red},
  @{Icon = "6"; Title = "Extensible Platform"; Text = "Public API and modular backend support future integrations."; X = 405; Y = 260; Fill = $blueSoft; Color = $blue}
)
foreach ($b in $benefits) {
  Icon $s $b.Icon $b.X $b.Y $b.Fill $b.Color
  Text $s $b.Title ($b.X + 34) $b.Y 210 16 10.5 $navy $true $leftAlign "Open Sans" | Out-Null
  Text $s $b.Text ($b.X + 34) ($b.Y + 18) 220 27 8.8 $muted $false $leftAlign "Open Sans" | Out-Null
}
Text $s "The College Support Multi-Agent Portal gives students one place to ask, escalate, and follow up while giving staff an organized queue and admins control over the knowledge base." 154 337 420 32 11.5 $ink $false $centerAlign "Open Sans" | Out-Null

# 11. Future work
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s ">" "Future Work" 11
$future = @(
  @{Title = "Mobile Experience"; Text = "Build a mobile-first interface or native app for quicker support access and attachment capture."; Fill = $blueSoft; Color = $blue; Icon = "M"},
  @{Title = "Analytics Dashboard"; Text = "Add reporting for ticket volume, response time, unresolved categories, and knowledge gaps."; Fill = $greenSoft; Color = $green; Icon = "D"},
  @{Title = "Push Notifications"; Text = "Send real-time alerts for ticket updates, assignment changes, and important campus announcements."; Fill = $yellowSoft; Color = $orange; Icon = "N"},
  @{Title = "Arabic / French Support"; Text = "Expand multilingual answers to better serve LIU students across campuses."; Fill = $purpleSoft; Color = $purple; Icon = "L"}
)
for ($i = 0; $i -lt $future.Count; $i++) {
  $x = if ($i % 2 -eq 0) { 132 } else { 390 }
  $y = if ($i -lt 2) { 126 } else { 236 }
  Card $s $x $y 210 75
  Icon $s $future[$i].Icon ($x + 15) ($y + 18) $future[$i].Fill $future[$i].Color
  Text $s $future[$i].Title ($x + 52) ($y + 16) 135 17 10.8 $navy $true $leftAlign "Open Sans" | Out-Null
  Text $s $future[$i].Text ($x + 52) ($y + 35) 140 33 8.4 $muted $false $leftAlign "Open Sans" | Out-Null
}

# 12. Demo
$s = Slide
Box $s 0 0 720 405 $paper | Out-Null
Header $s ">" "Demo Video" 12
Card $s 126 104 468 212
Text $s "Demo Video" 260 160 200 36 28 $navy $true $centerAlign "Montserrat" | Out-Null
Text $s "Recommended flow: login, ask a registration question, trigger ticket escalation, staff claim/update, admin knowledge management, and public API sample." 174 216 372 42 12 $muted $false $centerAlign "Open Sans" | Out-Null
Text $s "Place your recording or live demo link here" 238 278 244 18 11 $teal $true $centerAlign "Open Sans" | Out-Null

# 13. Thank you
$s = Slide
Dark $s
Text $s "Thank You" 230 62 260 48 34 $white $true $centerAlign "Montserrat" | Out-Null
Text $s "Questions & Answers" 240 122 240 24 15 $teal $false $centerAlign "Open Sans" | Out-Null
Text $s "?" 330 176 60 44 35 (C 0 0 0) $true $centerAlign "Open Sans" | Out-Null
Box $s 144 250 432 78 (C 37 76 110) | Out-Null
Text $s "College Support Multi-Agent Portal" 208 268 304 18 12 $white $false $centerAlign "Open Sans" | Out-Null
Text $s "Registration and IT support through a multi-agent assistant" 190 298 340 18 10.5 $white $false $centerAlign "Open Sans" | Out-Null
Text $s "College Support Multi-Agent Portal" 550 365 140 12 7.5 $white $false $leftAlign "Open Sans" | Out-Null

if (Test-Path $OutputDeck) {
  Remove-Item -LiteralPath $OutputDeck -Force
}

$deck.SaveAs($OutputDeck)
$deck.Close()
$ppt.Quit()

Write-Output $OutputDeck
