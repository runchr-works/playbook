# Intentir

[English](README.md)

Intentir는 여러 코딩 에이전트가 공유 기억과 로컬 코드 인텔리전스를 하나의 MCP 인터페이스로
사용하게 해주는 게이트웨이입니다. [Hindsight](https://github.com/vectorize-io/hindsight)와
[CodeGraph](https://github.com/colbymchenry/codegraph)를 fork하지 않고 조합합니다.

- 에이전트마다 전용 기억을 유지합니다.
- 유용한 기억을 자동 또는 명시적으로 프로젝트 공유 기억에 승격합니다.
- 사용자가 프로젝트 기억을 검토하고 잘못된 기억을 삭제할 수 있습니다.
- 저장소 코드와 CodeGraph 인덱스는 로컬 환경에만 유지됩니다.
- Hindsight의 공유 기억 저장소로 Supabase PostgreSQL을 사용할 수 있습니다.

## 사전 준비

onboarding을 실행하기 전에 다음 항목을 설치하거나 준비합니다.

| 요구사항 | 필요한 경우 | 확인 방법 |
| --- | --- | --- |
| `npm`, `npx`가 포함된 [Node.js](https://nodejs.org/) 22.5 이상 | 항상 | `node --version && npm --version && npx --version` |
| [Git](https://git-scm.com/) | 항상; `npx github:...` 실행과 repository identity 확인에 사용 | `git --version` |
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
npx --version
git --version
curl --version
uvx --version
```

Windows에서 PowerShell installer를 사용한다면 `curl` 대신 PowerShell을 확인합니다. 기존 Hindsight
server에 연결하는 경우에는 `uvx`가 필요하지 않습니다.

## 빠른 시작

대화형 onboarding을 실행합니다.

```bash
npx github:runchr-works/intentir onboard
```

다음 정보를 순서대로 입력합니다.

- Hindsight 저장소: embedded local pg0, Supabase PostgreSQL 또는 기존 서버
- Hindsight LLM provider, model, API key, 선택적 base URL
- 자동 승격 사용 여부
- 승격 판정에서 Hindsight LLM을 재사용할지 여부
- CodeGraph 전역 설치 여부

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

자동 승격은 현재 OpenAI 호환 chat-completions endpoint를 필요로 합니다. 따라서 onboarding은
OpenAI, Groq, OpenRouter, Ollama, LM Studio처럼 호환되는 provider에서만 Hindsight LLM 재사용을
제안합니다. Anthropic, Gemini, Codex 구독, Claude Code를 Hindsight에 사용하는 경우 자동 승격용
호환 endpoint를 별도로 설정합니다.

### Supabase 설정

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
npx github:runchr-works/intentir workspace init --org acme --project customer-portal
```

사용하는 MCP 클라이언트 설정에 Intentir를 추가합니다.

```json
{
  "mcpServers": {
    "intentir": {
      "command": "npx",
      "args": ["-y", "github:runchr-works/intentir"],
      "env": {
        "INTENTIR_AGENT_ID": "codex",
        "INTENTIR_REPOSITORY_ROOT": "/absolute/path/to/portal-api"
      }
    }
  }
}
```

MCP 클라이언트를 재시작한 다음 에이전트에게 자연어로 요청할 수 있습니다.

```text
Intentir 상태를 확인해줘.
프로젝트 기억과 코드 그래프를 이용해서 인증 흐름을 찾아줘.
데이터베이스 마이그레이션은 항상 하위 호환되어야 한다고 기억해.
이 프로젝트의 공유 기억 목록을 보여줘.
방금 기억을 프로젝트 공유 기억으로 올려.
그 기억은 틀렸으니 삭제해.
AuthService를 호출하는 코드와 의존 관계를 보여줘.
```

GitHub 저장소에서 직접 실행:

```bash
npx github:runchr-works/intentir
```

전역 설치:

```bash
npm install --global github:runchr-works/intentir
intentir onboard
```

## Workspace 명령

Hindsight는 onboarding에서 한 번만 설정하며 저장소별로 초기화하지 않습니다. CodeGraph와 저장소
identity만 workspace 단위로 관리합니다.

```bash
intentir workspace init [path]     # identity 생성 및 codegraph init -i
intentir workspace status [path]   # identity와 graph 상태 확인
intentir workspace sync [path]     # CodeGraph 인덱스 갱신
intentir workspace remove [path]   # .intentir 제거, .codegraph 보존
intentir workspace remove --purge-graph [path]
```

`workspace init`을 하지 않아도 identity 환경변수를 모두 직접 설정하면 memory 도구는 사용할 수
있습니다. CodeGraph 도구는 `workspace_not_initialized`를 반환하고, `intent_context`는 memory 결과와
CodeGraph 오류를 함께 반환합니다.

설치 상태 진단:

```bash
intentir doctor
intentir doctor --json
```

Hindsight 데이터와 저장소 인덱스를 보존하면서 전역 Intentir 설정만 제거:

```bash
intentir uninstall
```

관리 중인 local pg0 데이터까지 삭제할 때만 `intentir uninstall --purge`를 사용합니다.

## 자동 기억 승격

`memory_retain`은 새로운 내용을 항상 에이전트 전용 bank에 먼저 저장합니다. 비동기 자동 승격을
사용하려면 OpenAI 호환 모델을 설정합니다.

```json
{
  "PROMOTION_ENABLED": "true",
  "PROMOTION_LLM_BASE_URL": "https://api.openai.com/v1",
  "PROMOTION_LLM_API_KEY": "...",
  "PROMOTION_LLM_MODEL": "...",
  "PROMOTION_CONFIDENCE_THRESHOLD": "0.85"
}
```

worker는 모델을 호출하기 전에 비밀값, 개인정보, 추측성 내용, 임시 작업 상태를 차단합니다.
사용자의 명시적 `memory_promote` 요청은 모델 판정을 생략하지만 결정론적 보안 검사는 우회하지
않습니다.

## Identity와 격리

Intentir는 다음 계층으로 호출자를 식별합니다.

```text
orgId -> projectId -> workspaceId -> repositoryId -> agentId -> sessionId
```

org, project, workspace, repository identity는 일반적으로 `workspace init`이 생성한
`.intentir/config.json`에서 읽습니다. `agentId`는 onboarding 또는 MCP 환경변수에서 읽습니다.
`sessionId`는 선택값이며 생략하면 호출마다 생성됩니다.

## 기억 Metadata

기억 조회 결과는 다음 metadata 형식으로 정규화됩니다.

```text
provider, scope, bank, repository, revision, confidence, freshness,
evidenceRefs, createdByAgent, policyVersion
```

기억을 저장할 때 호출자는 `confidence`, `freshness`, `evidenceRefs`, `repositoryRevision`을 전달할 수
있습니다. `createdByAgent`와 `policyVersion`은 위조할 수 없도록 Intentir가 결정합니다.

## MCP 도구

| 도구 | 용도 |
| --- | --- |
| `intent_context` | Hindsight 기억과 CodeGraph context를 병렬 조회 |
| `memory_recall` | 에이전트 전용 및 프로젝트 공유 기억 검색 |
| `memory_retain` | 전용 기억 저장 및 선택적 자동 승격 대기열 등록 |
| `memory_promote` | `sourceId`를 사용해 전용 기억을 명시적으로 승격 |
| `memory_review` | 전용 또는 공유 기억의 원문과 상태 조회 |
| `memory_forget` | 원문과 파생 기억을 삭제하고 대기 중인 자동 승격 취소 |
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
| Pi | 명시적으로 문서화되지 않음 | 명시적으로 문서화되지 않음 | Community adapter 필요 |

Reasonix는 [DeepSeek API 문서](https://api-docs.deepseek.com/quick_start/agent_integrations/reasonix)에
등재된 DeepSeek-native terminal coding agent입니다. Native stdio MCP를 지원하므로 Intentir와 연결할
수 있지만, 이것이 CodeGraph의 전용 Reasonix integration을 의미하지는 않습니다.

지원 목록을 확인하거나 client별 설정을 생성할 수 있습니다.

```bash
intentir agents list
intentir agents config codex --persona backend-engineer --root /path/to/repo
intentir agents config claude-code --persona backend-engineer --root /path/to/repo
intentir agents config reasonix --persona code-reviewer --root /path/to/repo
```

`agentId`는 client 제품명이 아니라 논리적 persona입니다. Codex와 Claude가 같은 에이전트 전용
기억을 사용해야 하면 동일한 persona를 사용하고, 경험을 격리하려면 서로 다른 persona를 사용합니다.
저장소 지식은 계속 project-shared bank로 모입니다.

Upstream 참고 자료:

- [Hindsight integrations](https://hindsight.vectorize.io/integrations)
- [Hindsight multi-agent shared memory](https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory)
- [CodeGraph supported agents](https://colbymchenry.github.io/codegraph/)
- [Reasonix MCP configuration](https://esengine.github.io/DeepSeek-Reasonix/configuration.html)

## 환경변수

필수 환경변수:

| 환경변수 | 설명 |
| --- | --- |
| `INTENTIR_AGENT_ID` | 현재 에이전트 식별자 |

workspace config가 없을 때만 `INTENTIR_ORG_ID`, `INTENTIR_PROJECT_ID`,
`INTENTIR_WORKSPACE_ID`, `INTENTIR_REPOSITORY_ID`를 직접 설정해야 합니다.

주요 선택 환경변수:

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `INTENTIR_REPOSITORY_ROOT` | 현재 디렉터리 | `.codegraph`가 있는 저장소 경로 |
| `INTENTIR_REPOSITORY_REVISION` | 없음 | 기억 metadata에 기록할 commit SHA 또는 revision |
| `HINDSIGHT_BASE_URL` | `http://localhost:8888` | Hindsight API 주소 |
| `HINDSIGHT_API_KEY` | 없음 | Hindsight bearer token |
| `HINDSIGHT_TENANT` | `default` | Hindsight tenant |
| `CODEGRAPH_COMMAND` | `codegraph` | CodeGraph 실행 파일 |
| `CODEGRAPH_ARGS` | `serve,--mcp` | 쉼표로 구분한 CodeGraph 인자 |
| `PROMOTION_ENABLED` | `true` | 모델 설정이 있을 때 자동 승격 사용 |
| `PROMOTION_DATABASE_PATH` | `.intentir/outbox.db` | 로컬 승격 상태 저장 경로 |
| `PROMOTION_CONFIDENCE_THRESHOLD` | `0.85` | 자동 승격 최소 confidence |

전체 목록은 [.env.example](.env.example)을 참고합니다.

## 문제 해결

먼저 에이전트에게 `intentir_health` 실행을 요청합니다.

- Hindsight 연결 실패: `HINDSIGHT_BASE_URL`, 인증정보, `/health` 응답을 확인합니다.
- CodeGraph 연결 실패: `INTENTIR_REPOSITORY_ROOT`에서 `codegraph status`를 실행합니다. 인덱스가
  없다면 `intentir workspace init`을 실행합니다.
- 자동 승격이 동작하지 않음: `PROMOTION_LLM_API_KEY`와 `PROMOTION_LLM_MODEL`을 모두 설정합니다.
- 승격할 기억을 찾지 못함: `memory_retain` 또는 `memory_review`가 반환한 `sourceId`를 사용하고,
  org, project, workspace, repository, agent identity가 동일한지 확인합니다.

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
