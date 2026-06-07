# Intentir

[English](README.md)

Intentir는 여러 코딩 에이전트가 공유 기억과 로컬 코드 인텔리전스를 하나의 MCP 인터페이스로
사용하게 해주는 게이트웨이입니다. [Hindsight](https://github.com/vectorize-io/hindsight)와
[CodeGraph](https://github.com/colbymchenry/codegraph)를 fork하지 않고 조합합니다.

- 저장소에 설정된 모든 에이전트가 해당 Hindsight bank를 직접 사용합니다.
- 사용자가 프로젝트 기억을 검토하고 잘못된 기억을 삭제할 수 있습니다.
- 저장소 코드와 CodeGraph 인덱스는 로컬 환경에만 유지됩니다.
- Hindsight의 공유 기억 저장소로 Supabase PostgreSQL을 사용할 수 있습니다.

## Intentir가 필요한 이유

코딩 에이전트는 강력하지만 고립되어 있습니다. 대화가 시작될 때마다 이전 결정, 프로젝트 컨벤션,
다른 에이전트가 이미 파악한 내용은 모두 사라집니다. 같은 맥락, 같은 규칙, 같은 "이것만 기억해줘"를
매번 반복해야 합니다.

Intentir는 저장소의 모든 에이전트에게 공유된 두뇌를 제공합니다.

- **공유 프로젝트 기억** — 한 에이전트가 패턴이나 컨벤션을 학습하면 모든 에이전트가 이를
  기억합니다. "새 엔드포인트는 항상 feature flag로 감싸", "마이그레이션은 하위 호환되어야 해" 같은
  말을 반복할 필요가 없어집니다.
- **영속적인 코드 인텔리전스** — 에이전트가 코드베이스 전체의 호출자, 피호출자, 의존 관계를
  매 세션마다 다시 인덱싱하지 않고 탐색합니다. 코드 그래프는 로컬에 유지되며 최신 상태를
  반영합니다.
- **사용자가 통제합니다** — 저장된 기억을 검토하고, 잘못된 내용을 수정하고, 불필요한 기억을
  삭제할 수 있습니다. 에이전트는 당신이 원하는 것만 기억합니다.
- **기존 도구를 그대로 활용** — Intentir는 Hindsight나 CodeGraph를 fork하지 않습니다.
  하나의 MCP 인터페이스로 두 도구를 조합하여, 검증된 기억 시스템과 코드 인텔리전스를
  새로 만들지 않고도 사용할 수 있습니다.

Pi, Claude Code, Cursor, Codex 등 MCP 호환 에이전트라면 무엇이든 동일한 프로젝트 지식에
연결됩니다.

```
                         AGENTS (MCP Clients)
     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
     │    Pi    │  │  Claude  │  │  Cursor  │  │  Codex   │  …
     └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
          │              │              │              │
          └──────────────┼──────────────┼──────────────┘
                         │  MCP stdio  │
                         ▼              ▼
               ┌─────────────────────────────────┐
               │           Intentir              │
               │                                 │
               │  ┌───────────────────────────┐  │
               │  │       MCP 도구            │  │
               │  │  memory_retain/recall     │  │
               │  │  memory_review/forget     │  │
               │  │  memory_sweep   ←──┐      │  │
               │  │  code_search/callers     │  │  │
               │  │  code_callees/deps       │  │  │
               │  │  intent_context          │  │  │
               │  └───────────┬──────────────┘  │  │
               │              │                  │  │
               │  ┌───────────┴───────────┐      │  │
               │  │    IntentirGateway    │      │  │
               │  └───┬───────┬───────┬──┘      │  │
               │      │       │       │          │  │
               └──────┼───────┼───────┼──────────┘  │
                      │       │       │              │
          ┌───────────┘       │       └──────────────┘
          ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
  │  Hindsight   │   │  CodeGraph   │   │  context-mode    │
  │  (기억)      │   │  (코드 구조) │   │  (세션 이벤트)   │
  │              │   │              │   │                  │
  │  • retain    │   │  • search    │   │  • ctx_execute   │
  │  • recall    │   │  • callers   │   │  • ctx_search    │
  │  • review    │   │  • callees   │   │  • 세션 추적     │
  │  • forget    │   │  • deps      │   │  • 결정 기록     │
  │              │   │              │   │  • 컨벤션 감지   │
  │  Supabase /  │   │  로컬        │   │  • 에러 해결     │
  │  local pg0   │   │  SQLite      │   │                  │
  └──────┬───────┘   └──────┬───────┘   │  로컬 SQLite     │
         │                  │           └────────┬─────────┘
         ▼                  ▼                    │
   공유 기억          코드 그래프          memory_sweep
   (영속적,           (머신별,             세션 DB를 읽어
    멀티 에이전트)     로컬 인덱스)         Hindsight로 승격 ─┘
```

- **왼쪽 경로**: 에이전트가 프로젝트 기억을 저장하고 조회합니다. 한 에이전트가 학습하면
  모든 에이전트가 기억합니다.
- **중앙 경로**: 에이전트가 코드 구조 — 호출자, 피호출자, 의존 관계 — 를 최신 로컬
  인덱스로 탐색합니다.
- **오른쪽 경로**: [context-mode](https://github.com/mksglu/context-mode)가 세션 결정,
  컨벤션, 에러 해결법을 캡처합니다. `memory_sweep`이 로컬 세션 DB를 읽어 의미 있는
  인사이트를 Hindsight로 승격하여, 에이전트별 세션 이벤트를 공유 프로젝트 지식으로
  전환합니다. context-mode는 선택 사항이며, 없어도 Intentir는 정상 동작합니다.

## 사전 준비

onboarding을 실행하기 전에 다음 항목을 설치하거나 준비합니다.

| 요구사항 | 필요한 경우 | 확인 방법 |
| --- | --- | --- |
| `npm`이 포함된 [Node.js](https://nodejs.org/) 22.5 이상 | 항상 | `node --version && npm --version` |
| [Git](https://git-scm.com/) | 항상; 설치와 repository identity 확인에 사용 | `git --version` |
| `curl` 또는 Windows PowerShell | 아래 명령으로 `uv`를 설치할 때 | `curl --version` 또는 `$PSVersionTable` |
| [`uv`](https://docs.astral.sh/uv/)와 `uvx` | local pg0 또는 Supabase; 두 방식 모두 Hindsight를 로컬 실행 | `uvx --version` |
| Hindsight URL과 선택적 API key | 기존 Hindsight server에 연결할 때만 | `curl <url>/health` |
| LLM provider 인증정보 | 지원되는 구독 또는 로컬 provider 외에는 Hindsight에 필요 | Provider별 확인 |
| Supabase PostgreSQL connection URL과 database password | Supabase 저장소를 사용할 때만 | Supabase Dashboard > **Connect** |
| 실행 중인 Ollama 또는 LM Studio | 해당 로컬 LLM provider를 선택할 때만 | Provider별 health 확인 |
| 지원되는 MCP coding agent | Agent에서 Intentir 도구를 사용할 때 | [지원 Agent Client](#지원-agent-client) 참고 |
| 외부 network 접근 | 최초 GitHub/npm/Python package 다운로드와 hosted LLM 또는 Supabase 사용 | 관련 endpoint 연결 확인 |

CodeGraph는 미리 설치하지 않아도 됩니다. onboarding에서 npm 전역 설치를 진행할 수 있습니다.
사용자 환경에서 전역 npm 설치에 관리자 권한이 필요하다면 user-writable npm prefix를 설정하거나
onboarding 전에 `@colbymchenry/codegraph`를 직접 설치합니다.

Supabase는 Hindsight의 PostgreSQL 데이터베이스로 구성되며 Intentir가 직접 접근하지 않습니다.

local pg0 또는 Supabase를 선택하기 전에 `uv`를 설치합니다.

```bash
# Linux 및 macOS
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```powershell
# Windows PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

설치 후 shell을 다시 시작하고 `uvx --version`으로 확인합니다. Intentir는 `uv`를 자동으로 설치하지
않습니다.

계속하기 전에 최소 로컬 toolchain을 확인합니다.

```bash
node --version
npm --version
git --version
curl --version
uvx --version
```

Windows에서 PowerShell installer를 사용한다면 `curl` 대신 PowerShell을 확인합니다. 기존 Hindsight
server에 연결하는 경우에는 `uvx`가 필요하지 않습니다.

## 빠른 시작

Intentir를 전역 설치하고 명령을 확인한 다음 대화형 onboarding을 실행합니다.

```bash
npm install --global --install-links=true github:runchr-works/intentir
intentir --help
```

전역 설치 없이 시험하려면 다음과 같이 실행합니다.

```bash
npx -y github:runchr-works/intentir
```

이제 대화형 onboarding을 실행합니다.

```bash
intentir onboard
```

다음 정보를 순서대로 입력합니다.

- Hindsight 저장소: embedded local pg0, Supabase PostgreSQL 또는 기존 서버
- Hindsight LLM provider, model, API key, 선택적 base URL
- CodeGraph 전역 설치 여부

> **⚠️ 중요:** Onboarding 후 로컬 Hindsight 프로세스는 재부팅 시 자동으로
> 시작되지 않습니다. 자동 시작 설정은 [Hindsight 데몬](#hindsight-데몬)을 참고하세요.

### LLM Provider 추천

onboarding은 Hindsight 공식 provider 기본 모델을 추천값으로 보여주며 사용자가 다른 모델로 변경할
수 있습니다.

| Provider | 추천 기본값 | Hindsight에서 검증된 다른 모델 | 참고 |
| --- | --- | --- | --- |
| OpenAI | `gpt-4o-mini` | `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1-mini` | 가장 단순한 hosted 기본값 |
| Anthropic | `claude-haiku-4-5-20251001` | `claude-sonnet-4-5-20250929`, `claude-sonnet-4-20250514` | Sonnet은 비용보다 품질에 적합 |
| Gemini | `gemini-2.5-flash` | `gemini-2.5-flash-lite`, `gemini-3-pro-preview` | 속도와 비용 균형 |
| Groq | `openai/gpt-oss-120b` | `openai/gpt-oss-20b` | OpenAI 호환 endpoint |
| OpenRouter | `qwen/qwen3.5-9b` | `anthropic/claude-sonnet-4-20250514` | 여러 model vendor 사용 가능 |
| Ollama | `gemma3:12b` | `gpt-oss:20b` | 완전 로컬, hardware 요구사항 확인 필요 |
| LM Studio | `local-model` | 사용자가 선택한 로컬 모델 | OpenAI 호환 로컬 서버 |
| OpenAI Codex | `gpt-5.4-mini` | provider 관리 | 개인 로컬 용도, Codex 로그인 사용 |
| Claude Code | `claude-sonnet-4-5-20250929` | provider 관리 | 개인 로컬 용도, Claude 로그인 사용 |

모델 제공 여부는 변경될 수 있습니다. 추천 기본값은
[Hindsight models 문서](https://hindsight.vectorize.io/developer/models)를 따르며, 실제 계정의 모델
사용 가능 여부와 가격은 각 provider dashboard를 기준으로 확인해야 합니다.

### Supabase 설정

> Onboarding에서 Supabase를 선택한 사용자를 위한 섹션입니다. embedded local pg0 또는
> 기존 Hindsight 서버를 선택했다면 [저장소 초기화](#저장소-명령)로 건너뛰세요.

Intentir와 Hindsight에는 Supabase API key가 필요하지 않습니다. `anon`, `service_role`,
`sb_publishable`, `sb_secret`, legacy JWT key, Personal Access Token을 입력하면 안 됩니다.

Hindsight는 PostgreSQL client로 직접 연결합니다.

1. Supabase project를 생성하거나 기존 project를 엽니다.
2. Database password를 설정하거나 확인합니다.
3. Project Dashboard에서 **Connect**를 선택합니다.
4. Runtime PostgreSQL URL을 복사합니다.
   - 실행 환경이 IPv6를 지원하거나 IPv4 add-on이 있다면 port `5432`의 Direct connection
   - IPv4-only 환경이면 port `5432`의 Shared Pooler **Session mode**
5. 연결 가능한 경우 migration용으로 port `5432`의 Direct connection URL을 복사합니다.
6. `intentir onboard`에서 두 URL을 입력합니다.

다음 Hindsight 설정으로 저장됩니다.

```text
HINDSIGHT_API_DATABASE_URL=<runtime PostgreSQL URL>
HINDSIGHT_API_MIGRATION_DATABASE_URL=<direct migration PostgreSQL URL>
```

상시 실행되는 Hindsight와 migration에는 port `6543`의 Transaction pooler를 사용하지 않는 것이
좋습니다. Connection URL에는 database password가 포함되며 사용자 설정 파일에 권한 `0600`으로
저장됩니다.

각 저장소는 별도로 초기화합니다.

```bash
cd /path/to/portal-api
intentir init --bank customer-portal
```

bank ID는 Hindsight 공유 기억의 경계입니다. 같은 Hindsight backend와 같은 bank ID를 사용하는
에이전트와 PC는 프로젝트 기억을 공유합니다. 서로 다른 bank ID는 격리됩니다. CodeGraph 인덱스는
각 PC에 로컬로 생성됩니다.

`intentir init`은 프로젝트 루트에 `.mcp.json`도 함께 생성합니다(기존 파일이 있다면 `intentir` 항목을
병합합니다). Pi, Claude Code, Cursor 등 `.mcp.json`을 읽는 에이전트는 init 이후 자동으로
Intentir를 인식하므로 추가 설정이 필요 없습니다.

`.mcp.json`을 사용하지 않는 에이전트나 수동 설정이 필요하다면 Intentir MCP 서버를
`intentir` 명령어로 추가합니다.

```text
# 지원되는 에이전트에게 요청:
Intentir MCP 서버를 "intentir" 명령어로 추가해줘.
```

에이전트가 적절한 설정 파일을 생성합니다. 직접 추가한다면:

```json
{
  "mcpServers": {
    "intentir": {
      "command": "intentir"
    }
  }
}
```

`INTENTIR_REPOSITORY_ROOT`는 에이전트의 작업 디렉터리를 기본값으로 사용하므로,
에이전트가 저장소 루트에서 실행된다면 별도로 설정할 필요가 없습니다.

MCP 클라이언트를 재시작하면 에이전트가 Intentir 도구를 자동으로 인식합니다.
자연어로 지시하면 에이전트가 알아서 적절한 MCP 도구를 호출합니다:

```text
# 코드 탐색 → code_search, code_callers, code_callees, code_dependencies
AuthService를 호출하는 코드와 의존 관계를 보여줘.
비밀번호 해싱이 어디에 구현되어 있는지 찾아줘.

# 프로젝트 기억 → memory_recall, memory_retain, memory_review, memory_forget
데이터베이스 마이그레이션은 항상 하위 호환되어야 한다고 기억해.
인증 관련 프로젝트 기억을 검색해줘.
이 프로젝트의 공유 기억 목록을 보여줘.
그 기억은 틀렸으니 삭제해.

# 통합 컨텍스트 → intent_context (기억 + 코드 그래프 병렬 조회)
프로젝트 기억과 코드 그래프를 이용해서 인증 흐름을 찾아줘.

# 상태 확인 → intentir_health
Intentir 상태를 확인해줘.
```

## 저장소 명령

Hindsight는 onboarding에서 한 번만 설정합니다. 그 다음 각 저장소를 명시적인 bank ID로
초기화해야 합니다. 이 명령은 `.intentir/config.json`에 bank ID를 저장하고 `.mcp.json`을
생성(또는 병합)한 후 로컬 CodeGraph 인덱스를 초기화합니다.

```bash
intentir init [path] --bank <bank-id>
```

초기화한 저장소의 workspace는 다음 명령으로 관리합니다.

```bash
intentir workspace status [path]
intentir workspace sync [path]
intentir workspace remove [path]
intentir workspace remove --purge-graph [path]
```

`[path]`는 선택 사항이며 생략하면 현재 디렉터리를 사용합니다. `--bank`는 필수입니다. 저장소를
초기화하지 않으면 해당 저장소에서 Hindsight와 CodeGraph 도구를 사용할 수 없습니다. 저장소 설정은
생성됐지만 CodeGraph 초기화가 실패한 경우에는 Hindsight를 계속 사용할 수 있고 코드 도구만
`workspace_not_initialized`를 반환합니다.

설치 상태 진단:

```bash
intentir doctor
intentir doctor --json
```

## Hindsight 데몬

Onboarding에서 관리 대상 로컬 Hindsight 프로세스를 시작할 수 있지만, 이 detached 프로세스는
재부팅 후 자동으로 다시 시작되도록 등록되지는 않습니다. 수동 관리는 다음 명령을 사용합니다.

```bash
intentir daemon start          # 백그라운드 시작 후 healthy 상태까지 대기
intentir daemon start --no-wait
intentir daemon status
intentir daemon stop
intentir daemon run            # OS 서비스 관리자용 foreground 모드
```

최초 `daemon start`에서는 `uvx`의 Hindsight 다운로드와 데이터베이스 초기화 때문에 시간이 걸릴 수
있습니다. 아래 OS별 자동 실행 설정에서는 `daemon run`을 사용합니다. Onboarding에서 기존 Hindsight
서버 사용을 선택했다면 `daemon status`로 서버 상태만 확인할 수 있고 나머지 데몬 명령은 사용할 수
없습니다. 외부 서버는 별도로 관리해야 합니다.

### Linux: systemd 사용자 서비스

`command -v intentir`로 실행 파일의 절대 경로를 확인한 다음
`~/.config/systemd/user/intentir-hindsight.service`를 생성합니다.

```ini
[Unit]
Description=Intentir Hindsight daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/absolute/path/to/intentir daemon run
Environment=PATH=/absolute/node/bin:/home/USER/.local/bin:/usr/local/bin:/usr/bin:/bin
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

`ExecStart`를 `command -v intentir` 결과로 바꿉니다. `PATH`에는
`dirname "$(command -v node)"`와 `dirname "$(command -v uvx)"`가 출력하는 디렉터리를 포함한 다음
서비스를 활성화합니다.

```bash
systemctl --user daemon-reload
systemctl --user enable --now intentir-hindsight.service
systemctl --user status intentir-hindsight.service
journalctl --user -u intentir-hindsight.service -f
```

사용자 서비스는 로그인할 때 시작됩니다. 로그인 전에도 시작해야 하고 시스템에서 허용한다면
`loginctl enable-linger "$USER"`로 lingering을 활성화합니다. Node 버전 관리자로 설치한 경로는 Node
업그레이드 후 바뀔 수 있으므로 이 경우 `ExecStart`를 갱신해야 합니다.

Linux 환경에 systemd가 없거나 WSL을 사용하는 경우에는 세션 시작 스크립트에서
`intentir daemon run`을 띄우면 됩니다. 가장 단순한 대안은 `crontab -e`에 다음 줄을 넣는 것입니다.

```cron
@reboot /absolute/path/to/intentir daemon run >> /home/USER/.config/intentir/hindsight.log 2>&1
```

여기서도 `PATH`는 중요합니다. `uvx`와 Node가 관리하는 실행 파일을 찾을 수 있어야 합니다.
`@reboot`가 환경상 안정적이지 않다면 셸 프로필이나 데스크톱 세션 시작 항목에서 실행하세요.

### macOS: launchd

`command -v intentir`로 실행 파일의 절대 경로를 확인한 다음
`~/Library/LaunchAgents/io.intentir.hindsight.plist`를 생성합니다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>io.intentir.hindsight</string>
  <key>ProgramArguments</key>
  <array>
    <string>/absolute/path/to/intentir</string>
    <string>daemon</string>
    <string>run</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/absolute/node/bin:/Users/NAME/.local/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

실행 파일 경로를 바꾸고 `PATH`에 `node`와 `uvx`가 설치된 디렉터리를 포함한 다음 등록합니다.

```bash
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/io.intentir.hindsight.plist
launchctl kickstart -k "gui/$(id -u)/io.intentir.hindsight"
```

등록 해제:

```bash
launchctl bootout "gui/$(id -u)" ~/Library/LaunchAgents/io.intentir.hindsight.plist
```

### Windows: 작업 스케줄러

PowerShell에서 `Get-Command intentir.cmd`로 절대 경로를 확인합니다. 작업 스케줄러에서 다음 조건으로
작업을 생성합니다.

- 트리거: **로그온할 때**
- 프로그램: `C:\Windows\System32\cmd.exe`
- 인수: `/d /c ""C:\absolute\path\to\intentir.cmd" daemon run"`
- 설정: 실패 시 자동 재시작 활성화

작업을 한 번 시작한 다음 `intentir daemon status`로 확인합니다. Node 업그레이드 후 npm 전역 설치
경로가 바뀌었다면 작업의 명령 경로도 갱신해야 합니다.

Hindsight 데이터와 저장소 인덱스를 보존하면서 전역 Intentir 설정만 제거:

```bash
intentir uninstall
```

관리 중인 local pg0 데이터까지 삭제할 때만 `intentir uninstall --purge`를 사용합니다.

## Identity와 격리

Intentir는 저장소에 설정된 Hindsight bank ID를 변형하지 않고 그대로 사용합니다.

```text
bankId
```

`bankId`는 `intentir init --bank <bank-id>`가 생성한 `.intentir/config.json`에서 읽습니다. Codex,
Claude, Cursor 등 해당 저장소에 설정된 모든 client가 같은 bank를 사용합니다. Intentir는 repository
또는 agent 식별자를 bank에 추가하지 않습니다.

## 기억 Metadata

기억 조회 결과는 다음 metadata 형식으로 정규화됩니다.

```text
provider, bank, revision, confidence, freshness,
evidenceRefs, createdByAgent, policyVersion
```

이 값들은 Hindsight가 반환한 metadata를 반영합니다.

## MCP 도구

| 도구 | 용도 |
| --- | --- |
| `intent_context` | Hindsight 기억과 CodeGraph context를 병렬 조회 |
| `memory_recall` | 설정된 Hindsight bank 검색 |
| `memory_retain` | 설정된 Hindsight bank에 기억 저장 |
| `memory_review` | 저장된 원문과 상태 조회 |
| `memory_forget` | 원문과 파생 기억 삭제 |
| `memory_sweep` | context-mode 세션을 스캔하여 중요 인사이트를 Hindsight 기억으로 승격 |
| `code_search` | 로컬 인덱스에서 symbol 검색 |
| `code_callers` | symbol 호출자 조회 |
| `code_callees` | symbol이 호출하는 대상 조회 |
| `code_dependencies` | callers, callees, impact traversal 통합 조회 |
| `intentir_health` | Hindsight와 CodeGraph 연결 상태 확인 |

`intent_context`는 provider 하나가 실패해도 성공한 provider의 결과를 반환합니다.

## 지원 Agent Client

Intentir의 지원 표는 모든 MCP client를 임의로 공식 지원한다고 간주하지 않고 Hindsight와 CodeGraph
upstream 문서를 기준으로 작성합니다.

| Agent | Hindsight upstream | CodeGraph upstream | Intentir 연결 |
| --- | --- | --- | --- |
| Codex | 전용 hooks integration | 문서화됨 | Native stdio MCP |
| Claude Code | 전용 plugin/hooks integration | 문서화됨 | Native stdio MCP |
| Cursor | 범용 MCP 호환 | 문서화됨 | Native stdio MCP |
| OpenCode (`openmcode`) | 범용 MCP 호환 | 문서화됨 | Native stdio MCP |
| Gemini CLI | 범용 MCP 호환 | 문서화됨 | Native stdio MCP |
| Antigravity | 범용 MCP 호환 | 문서화됨 | Raw MCP config, experimental |
| Kiro | 범용 MCP 호환 | 문서화됨 | Native stdio MCP |
| Hermes Agent | Community integration | 문서화됨 | Native stdio MCP |
| Reasonix (`resonix`) | 범용 MCP 호환 | 명시적으로 문서화되지 않음 | Native stdio MCP |
| Pi | 명시적으로 문서화되지 않음 | 명시적으로 문서화되지 않음 | pi-mcp-adapter 경유 |

Reasonix는 [DeepSeek API 문서](https://api-docs.deepseek.com/quick_start/agent_integrations/reasonix)에
등재된 DeepSeek-native terminal coding agent입니다. Native stdio MCP를 지원하므로 Intentir와 연결할
수 있지만, 이것이 CodeGraph의 전용 Reasonix integration을 의미하지는 않습니다.

지원 목록을 확인하거나 client별 설정을 생성할 수 있습니다.

```bash
intentir agents list
intentir agents config codex --root /path/to/repo
intentir agents config claude-code --root /path/to/repo
intentir agents config reasonix --root /path/to/repo
intentir agents config pi --root /path/to/repo
```

### Pi 설정

Pi는 [pi-mcp-adapter](https://github.com/nicopreme/pi-mcp-adapter)를 통해 stdio MCP 서버를 연결합니다.
Pi 내부에서 어댑터를 설치합니다.

```text
# Pi에게 요청 (일반 터미널이 아닌 Pi 내부에서 실행):
pi install npm:pi-mcp-adapter
```

`intentir init --bank <bank-id>`를 실행했다면 `.mcp.json`이 이미 프로젝트 루트에 있습니다.
아직 init을 하지 않았다면 Pi에게 설정을 요청합니다.

```text
# Pi에게 요청:
Intentir MCP 서버를 "intentir" 명령어로 추가하고 프로젝트 .mcp.json으로 저장해줘.
```

`.mcp.json` 파일은 다음과 같은 형식입니다.

```json
{
  "mcpServers": {
    "intentir": {
      "command": "intentir"
    }
  }
}
```

Pi를 재시작하고 `/mcp`로 연결된 서버를 확인합니다. 위 예시처럼 자연어로
에이전트에게 요청하면 필요할 때 MCP 도구를 자동으로 호출합니다.

같은 저장소에 설정된 모든 client는 같은 bank를 사용합니다.

Upstream 참고 자료:

- [Hindsight integrations](https://hindsight.vectorize.io/integrations)
- [Hindsight multi-agent shared memory](https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory)
- [CodeGraph supported agents](https://colbymchenry.github.io/codegraph/)
- [Reasonix MCP configuration](https://esengine.github.io/DeepSeek-Reasonix/configuration.html)

## 환경변수

주요 선택 환경변수:

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `INTENTIR_REPOSITORY_ROOT` | 현재 디렉터리 | `.codegraph`가 있는 저장소 경로 |
| `HINDSIGHT_BASE_URL` | `http://localhost:8888` | Hindsight API 주소 |
| `HINDSIGHT_API_KEY` | 없음 | Hindsight bearer token |
| `HINDSIGHT_TENANT` | `default` | Hindsight tenant |
| `CODEGRAPH_COMMAND` | `codegraph` | CodeGraph 실행 파일 |
| `CODEGRAPH_ARGS` | `serve,--mcp` | 쉼표로 구분한 CodeGraph 인자 |

전체 목록은 [.env.example](.env.example)을 참고합니다.

## 문제 해결

먼저 에이전트에게 `intentir_health` 실행을 요청합니다.

- Hindsight 연결 실패: `HINDSIGHT_BASE_URL`, 인증정보, `/health` 응답을 확인합니다.
- CodeGraph 연결 실패: `INTENTIR_REPOSITORY_ROOT`에서 `codegraph status`를 실행합니다. 인덱스가
  없다면 `intentir init --bank <bank-id>`를 실행합니다.

## 오픈소스 감사

Intentir는 다음 오픈소스 커뮤니티의 작업을 기반으로 만들 수 있었습니다.

| 프로젝트 | Intentir에서의 역할 | 라이선스 |
| --- | --- | --- |
| Vectorize의 [Hindsight](https://github.com/vectorize-io/hindsight) | 장기 기억 서비스, bank, recall, document lifecycle | MIT |
| Colby Mchenry의 [CodeGraph](https://github.com/colbymchenry/codegraph) | 로컬 코드 그래프, symbol 검색, 호출 관계, impact 분석 | MIT |
| [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MCP server와 client transport | MIT |
| [Zod](https://github.com/colinhacks/zod) | Runtime schema와 tool 입력 검증 | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) | 구현 언어와 compiler | Apache-2.0 |
| [Vitest](https://github.com/vitest-dev/vitest) | Test runner | MIT |

Hindsight와 CodeGraph는 독립적인 외부 provider로 유지됩니다. Intentir는 두 프로젝트를 fork하거나
구현을 재배포하지 않으며, 사용자는 각 프로젝트의 라이선스에 따라 별도로 설치하고 실행합니다.

이 프로젝트들을 만들고 유지하는 모든 maintainer와 contributor에게 감사드립니다. 이들의 작업
덕분에 Intentir는 memory, code intelligence, MCP infrastructure를 다시 만드는 대신 작은 조합 및
정책 계층에 집중할 수 있었습니다.

## 라이선스

Intentir는 [Apache License 2.0](LICENSE)으로 배포됩니다. 외부 프로젝트에는 각각의 라이선스가
적용됩니다.

## 개발

```bash
git clone https://github.com/runchr-works/intentir.git
cd intentir
npm install
npm run check
npm test
npm run smoke
```
