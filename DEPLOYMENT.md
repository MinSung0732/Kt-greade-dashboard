# GitHub Pages 배포

## 최초 1회 설정

1. 이 폴더를 GitHub 저장소의 `main` 브랜치에 올립니다.
2. 저장소의 `Settings > Pages`로 이동합니다.
3. `Build and deployment > Source`를 `GitHub Actions`로 선택합니다.
4. `Actions` 탭에서 `Deploy dashboard to GitHub Pages` 작업 완료를 확인합니다.

완료 후 표시되는 `https://계정명.github.io/저장소명/` 주소를 공유하면 됩니다.
이후에는 `main` 브랜치에 변경사항을 올릴 때마다 자동으로 다시 배포됩니다.

## 데이터 연동 확인

`config.js`에는 현재 Apps Script Web App 주소가 들어 있습니다. Apps Script 배포 설정은 다음과 같아야 합니다.

- 실행 사용자: 본인
- 액세스 권한: 모든 사용자
- `Code.gs` 수정 후: 새 버전으로 다시 배포

화면 우측 상단에 `Google Sheets 연동`이 표시되고 최근 기록이 조회되면 정상입니다.
