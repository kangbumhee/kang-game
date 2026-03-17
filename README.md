# 🎉 워크샵 파티게임

뷰티강이 만든 김포지회 워크샵용 멀티플레이 파티게임 (Firebase 실시간 + Vercel 배포)

- **라이브 URL**: https://kang-game.vercel.app  
- **저장소**: https://github.com/kangbumhee/kang-game  

---

## 배포 (GitHub → Vercel)

### 1. GitHub 저장소

- 새 저장소: **kang-game** (Public)  
- 주소: `https://github.com/kangbumhee/kang-game`

### 2. 코드 업로드

**Git 사용 시:**
```bash
cd party-game
git init
git add .
git commit -m "뷰티강 워크샵 파티게임"
git branch -M main
git remote add origin https://github.com/kangbumhee/kang-game.git
git push -u origin main
```

**웹에서 업로드:**  
저장소 페이지에서 "uploading an existing file" → `index.html`, `js/`, `games/` 등 전체 드래그 후 Commit.

### 3. Vercel 배포

1. [vercel.com](https://vercel.com) 로그인 → **Add New…** → **Project**
2. GitHub에서 **kang-game** 선택 → **Import**
3. **Framework Preset**: Other  
4. **Build Command**: (비워두기)  
5. **Output Directory**: `./`  
6. **Deploy** 클릭

배포 후 주소: **https://kang-game.vercel.app**

---

## 게임 목록

- ⚖️ 다수결 살아남기  
- 👀 눈치게임  
- 💣 초성 폭탄  
- 🧠 숫자 텔레파시  
- 🌈 스펙트럼  
- 🏇 경마게임  
- 🔥 폭탄 돌리기  
- 🚀 같이 소리질러!

진행 중 막히는 부분 있으면 알려주세요.
