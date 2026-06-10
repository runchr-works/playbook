# Pi Coding Agent Tool
## Agent tool 설치
https://pi.dev/에 접속해서 원하는 방식으로 설치한다.

## package 설치
### pi-skillful
필요한 스킬만 프롬프트에 노출해서 토큰 아끼고 모델 집중력을 높이는 도구
```
pi install npm:pi-skillful
```

### pi-intercom
같은 머신 내 Pi 세션 간에 1:1 직접 메시징이 가능
```
pi install npm:pi-intercom
```

### pi-subagents
pi-subagents를 사용하면 특정 작업에 집중하는 하위 에이전트에 작업을 위임 할 수 있음. 코드 검토, 탐색, 구현, 병렬 감사, 워크플로우, 백그라운드 작업 등
```
pi install npm:pi-subagents
```

### pi-web-access
Pi 에이전트용 웹 검색, 콘텐츠 추출 및 비디오 이해 기능을 제공.
```
pi install npm:pi-web-access
```

### pi-lens
pi-lens는 AI 에이전트를 위한 실시간 인라인 코드 피드백에 중점을 둠
```
pi install npm:pi-lens
```

### @juicesharp/rpiv-ask-user-question
모델이 추측하는 대신 구조화된 질문을 통해 답변을 명확히 하도록 도움을 줌.
```
pi install npm:@juicesharp/rpiv-ask-user-question
```

### @juicesharp/rpiv-todo
모델이 장시간 세션 동안 유지할 수 있는 할 일 목록을 제공.
```
pi install npm:@juicesharp/rpiv-todo
```

### pi-mcp-adaptor
Pi에서 MCP 서버 사용
```
pi install npm:pi-mcp-adapter
```

### context-mode
컨텍스트 저장, 세션 연속성, 코드 기반의 생각, 산문 스타일 비강제를 제공하여 컨텍스트 감소에 도움을 줌
```
pi install npm:context-mode
```

### pi-observational-memory
Pi 세션이 끝없이 이어지는 것처럼 느껴지도록 세션이 길어지더라도 에이전트가 작업 흐름을 놓치지 않게 도와줌
```
pi install npm:pi-observational-memory
```

### gentle-engram
기본적으로 로컬에 저장되고, 필요할 때는 클라우드에 저장하며, 모든 에이전트에서 검색할 수 있도록 도와주는 영구 메모리.
```
pi install npm:gentle-engram
```

### pi-rtk-optimizer
bash 도구 명령을 해당 명령과 동등한 것으로 자동 재작성하고 rtk 노이즈가 많은 도구 출력을 압축하여 컨텍스트 창 사용량을 줄이는 동시에 에이전트에 실행 가능한 정보를 보존시킴
```
pi install npm:pi-rtk-optimizer
```

### pi-gstack
YC Gerry Tan의 gstack기술을 Pi에서 사용할 수 있게 해주는 패키지
```
pi install npm:pi-gstack
```

### @vndv/pi-codegraph
codegraph에 Pi가 접근할 수 있도록 권한을 부여함. CodeGraph는 tree-sitter를 사용하여 프로젝트를 인덱싱하고 Pi는 기본확장 도구를 통해 심볼, 호출자, 피호출자, 종속성 영향, 파일 및 호출 경로를 쿼리 할 수 있음
```
npm install -g @colbymchenry/codegraph
cd /path/to/project
codegraph init -i
pi install npm:@vndv/pi-codegraph@0.1.7
pi
```

### gentle-pi
Pi를 강력한 코딩 도구에서 제어 가능한 개발 도구로 전환시킴
```
pi install npm:gentle-pi
```
