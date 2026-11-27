# 눈 내린 한옥마을 — 교실용 3D 방탈출

선생님이 **교과 문제 7개**를 넣어 만드는 3D 웹 방탈출 게임입니다.
학생은 눈 내린 한옥마을을 돌아다니며 문제를 풀어 자물쇠를 열고, 일곱 조각을 모아
마지막 **방위 석단 퍼즐**(8번째)을 풀면 지하 보물창고로 내려가 탈출합니다.
기록(걸린 시간 + 힌트 벌점)은 서버가 재고, 구성마다 순위표가 만들어집니다.

| 주소 | 누가 | 하는 일 |
|---|---|---|
| `/` | 학생 | 구성 코드 + 이름 입력 → 게임 → 순위표 |
| `/?code=K7P2QX` | 학생 | 코드가 미리 채워진 주소 (선생님이 공유) |
| `/edit` | 선생님 | 이야기 고르기, 문제 입력, 저장 → 코드 발급, 미리 해보기, 순위표 관리 |
| 코드 `DEMO` | 누구나 | 서버 없이 해 보는 체험판 (예시 문제) |

## 게임 구성
- **이야기 3종** (편집 모드에서 선택): 설화 선인의 보주 · 홍길동의 금궤 · 김삿갓의 마지막 시첩
- **퍼즐 1~7 (교과 문제)**: 우물 → 눈사람 → 정자 → 서당 → 대감댁 → 약방 → 별당
  - 정답 종류: **숫자**(정수·소수·분수·음수) 또는 **방향**(동서남북 순서, 최대 10개)
  - 1번(우물)을 풀면 대감댁 열쇠, 5번(대감댁)을 풀면 별당에 들어갈 등잔이 나옵니다.
  - 문제를 하나 풀 때마다 조각(예: `〔三〕 해가 뜨는 쪽으로 한 걸음`)을 얻습니다.
- **퍼즐 8 (방위 석단)**: 일곱 조각의 차례(一~七)와 방위대로 석단을 밟으면 계단이 열립니다.
  이 정답은 구성마다 서버가 무작위로 정합니다.
- **순위**: 기록 = 걸린 시간 + 힌트 1개당 1분. 시작·끝 시각과 정답 확인은 모두 서버가 합니다.
  (정답은 학생 브라우저로 보내지 않습니다.)

## 처음 설정 (Supabase + GitHub + Vercel) — 약 15분
1. **Supabase**
   1. https://supabase.com 에서 새 프로젝트를 만듭니다.
   2. 왼쪽 메뉴 **SQL Editor** → `supabase/schema.sql` 내용을 붙여 넣고 **Run**.
   3. **Project Settings → API** 에서 두 값을 복사해 둡니다.
      - `Project URL` (https://xxxx.supabase.co)
      - `service_role` 키 (Legacy API Keys 탭) 또는 새 `Secret key` (sb_secret_…)
      - ⚠️ 이 키는 비밀입니다. 코드나 GitHub 에 넣지 말고 Vercel 환경변수에만 넣으세요.
2. **GitHub**: 새 저장소를 만들고 이 폴더 전체를 올립니다.
   ```bash
   git init && git add . && git commit -m "한옥마을 방탈출"
   git branch -M main
   git remote add origin https://github.com/<내아이디>/<저장소>.git
   git push -u origin main
   ```
3. **Vercel**
   1. https://vercel.com → **Add New… → Project** → 방금 만든 GitHub 저장소 **Import**.
   2. Framework Preset 은 **Other** 그대로, Build 설정은 비워 둡니다.
   3. **Environment Variables** 에 추가:
      - `SUPABASE_URL` = Project URL
      - `SUPABASE_SERVICE_ROLE_KEY` = service_role(또는 secret) 키
   4. **Deploy**. 이후 GitHub 에 push 할 때마다 자동으로 다시 배포됩니다.
4. 배포된 주소의 `/edit` 에서 구성을 만들고, 받은 코드(또는 학생용 주소)를 학생에게 알려 주세요.

## 폴더 구조
```
index.html, edit.html        학생 화면 / 교사 편집 화면
api/game.js                  학생 API (시작·정답 확인·힌트·탈출 기록·순위표)
api/editor.js                교사 API (구성 저장·불러오기·순위표 관리)
api/_lib.js                  Supabase 접속, 비밀번호 암호화
supabase/schema.sql          테이블 만들기
js/game/stories.js           이야기 3종 (문구 수정은 여기)
js/game/content.js           장소·힌트·체험판 문제
js/game/answer.js            정답 비교 (서버·브라우저 공용)
js/areas.js, js/3d/*.js      3D 마을·소품
js/world3d.js                이동·카메라·구역 전환·눈 내림
js/main.js, js/editor.js     화면(UI)
```

## 참고
- 편집 비밀번호는 암호화해서 저장하므로 잊어버리면 찾을 수 없습니다. (Supabase 대시보드 Table Editor 에서 직접 지우는 것만 가능)
- 문제 그림은 `https://` 로 시작하는 이미지 주소를 넣습니다. (구글 드라이브 공유 링크는 바로 보이지 않을 수 있어요)
- 학생 진행 상황은 브라우저에 저장되어 같은 기기에서 "이어하기"가 됩니다. 시간은 처음 시작한 때부터 계속 흐릅니다.
- 주소 끝에 `?debug` 를 붙이면 개발자 콘솔에서 `__hanok`, `__game` 으로 상태를 볼 수 있습니다.
- 캐릭터 모델: Kenney "Mini Characters" (CC0).
