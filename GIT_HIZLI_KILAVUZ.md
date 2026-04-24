# Git Hizli Kilavuz: add - commit - push

Bu kilavuz, degisikliklerini uzak depoya gondermek icin en temel 3 adimi kisa sekilde anlatir.

## 1) `git add` - Degisiklikleri hazirla (staging)

`git add`, commit'e girecek dosyalari secer.

En yaygin kullanimlar:

```bash
git add .
```

- Bulundugun klasordeki tum degisiklikleri (yeni + degisen dosyalar) stage eder.

```bash
git add dosya_adi.py
```

- Sadece belirli bir dosyayi stage eder.

Kontrol etmek icin:

```bash
git status
```

## 2) `git commit` - Anlamli bir kayit olustur

`git commit`, stage edilen degisiklikleri aciklamali bir kayit olarak saklar.

```bash
git commit -m "Kisa ve acik bir mesaj"
```

Ornek:

```bash
git commit -m "Kurulum rehberine Windows adimlari eklendi"
```

Iyi commit mesaji ipucu:

- Ne yaptigini kisa yaz
- Mumkunse neden yaptigini belirt
- 1 degisikligi 1 commit'te tutmaya calis

## 3) `git push` - Remote repoya gonder

`git push`, commit'lerini GitHub/GitLab gibi uzak depoya yollar.

```bash
git push
```

Eger ilk kez yeni branch push'luyorsan:

```bash
git push -u origin <branch-adi>
```

Ornek:

```bash
git push -u origin feature/kurulum-dokumani
```

## Tam akisin en kisa hali

```bash
git status
git add .
git commit -m "Degisiklikleri aciklayan mesaj"
git push
```

## SIk yapilan hatalar

- `nothing to commit`: `git add` yapmamis olabilirsin veya dosyada degisiklik yoktur.
- `non-fast-forward` / push reddedildi: once uzak degisiklikleri cek (`git pull`) sonra tekrar push et.
- Yanlis branch: `git branch` ile aktif branch'i kontrol et.

