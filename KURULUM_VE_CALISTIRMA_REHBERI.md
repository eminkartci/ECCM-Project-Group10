# ECCM Project Group10 - Kurulum ve Calistirma Rehberi (Windows + macOS)

Bu dokuman, projeyi sifirdan indirip calistirmak isteyenler icin hazirlanmistir.

## 1) Gereksinimler

Bu proje AMPL modeli oldugu icin asagidaki araclar gereklidir:

- `Git` (repo klonlamak icin)
- `AMPL`
- `Gurobi` (AMPL icinde cozumleyici olarak kullaniliyor)
- `Python 3` (opsiyonel: senaryo karsilastirma scripti icin)
- `VS Code + Live Server` (opsiyonel: Sankey HTML goruntuleme)

## 2) Repo'yu indirme

Terminal/PowerShell acip:

```bash
git clone <REPO_URL>
cd ECCM-Project-Group10
```

Not: `<REPO_URL>` yerine ders/depo URL'sini yazin.

## 3) macOS kurulum adimlari

### 3.1 Git ve Python (yoksa)

```bash
brew install git python
```

### 3.2 AMPL kurulumu

1. AMPL'i resmi kaynagindan indirip kurun.
2. `ampl` komutunun calistigini dogrulayin:

```bash
ampl --version
```

Eger komut bulunamazsa AMPL binary dizinini `PATH` degiskenine ekleyin.

### 3.3 Gurobi kurulumu ve lisans

1. Gurobi'yi kurun.
2. Lisansinizi aktif edin.
3. AMPL icinde `gurobi` cozumleyicisinin gorundugunu dogrulayin.

## 4) Windows kurulum adimlari

### 4.1 Git ve Python (yoksa)

- `Git for Windows` kurun.
- `Python 3` kurun (kurulumda **Add Python to PATH** secenegini isaretleyin).

Kontrol:

```powershell
git --version
python --version
```

### 4.2 AMPL kurulumu

1. AMPL'i Windows icin indirip kurun.
2. Kurulum dizinindeki `ampl.exe` yolunu `PATH` ortam degiskenine ekleyin.
3. Yeni PowerShell penceresinde test edin:

```powershell
ampl --version
```

### 4.3 Gurobi kurulumu ve lisans

1. Gurobi'yi Windows icin kurun.
2. Lisansinizi aktif edin.
3. AMPL tarafinda `gurobi` solver'inin kullanilabildigini dogrulayin.

## 5) Projeyi calistirma

Repo kok dizininde asagidaki komutlari calistirin.

### 5.1 Baseline senaryo

```bash
ampl scenarios/baseline/ses_main.run
```

Bu komut `output/` altina sonuclari yazar (or. `total_output.txt`, `cost_breakdown.txt`, `scenario_metrics.txt`, `sankey/input2sankey.csv`).

### 5.2 Drought senaryo

```bash
ampl scenarios/drought/ses_main_drought.run
```

Bu komut `output_drought/` altina sonuclari yazar.

### 5.3 Senaryo karsilastirma (opsiyonel)

```bash
python3 compare_scenarios.py
```

Windows'ta gerekirse:

```powershell
python compare_scenarios.py
```

## 6) Sankey gorsellestirme (opsiyonel)

Sankey HTML dosyalari:

- `output/sankey/SES_sankey.html`
- `output_drought/sankey/SES_sankey.html`

VS Code ile:

1. `Live Server` eklentisini kurun.
2. HTML dosyasina sag tiklayin.
3. **Open with Live Server** secin.

## 7) Sik karsilasilan problemler

- `ampl: command not found` / `'ampl' is not recognized`:
  - AMPL kurulu degil veya `PATH` ayari eksik.
- `error: could not load solver gurobi`:
  - Gurobi kurulu/lisansli degil veya AMPL-Gurobi baglantisi eksik.
- `Missing ... scenario_metrics.txt`:
  - Once ilgili AMPL run dosyasini calistirin (`scenarios/baseline/ses_main.run` ve/veya `scenarios/drought/ses_main_drought.run`).

## 8) Hizli kontrol listesi

- [ ] `ampl --version` calisiyor
- [ ] Gurobi lisansi aktif
- [ ] `ampl scenarios/baseline/ses_main.run` basarili
- [ ] `ampl scenarios/drought/ses_main_drought.run` basarili
- [ ] (Opsiyonel) `python3 compare_scenarios.py` cikti veriyor

