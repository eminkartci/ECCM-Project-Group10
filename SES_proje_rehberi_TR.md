# Swiss-EnergyScope (SES) — Proje Rehberi (Türkçe)

Bu belge, `ses_main.mod`, `ses_main.dat` ve `ses_main.run` dosyalarına dayanarak **bu klasördeki modelin neyi temsil ettiğini** ve **nasıl çalıştığını** öğretmek amacıyla hazırlanmıştır. Model, Stefano Moret tarafından 2015’te yazılmış **Swiss-EnergyScope (SES)** MILP (karma tamsayılı doğrusal programlama) formülasyonudur; ders materyali olarak İsviçre enerji sistemi verileriyle birlikte kullanılmaktadır.

---

## 1. Özet: Tam olarak ne modelleniyor?

**Modellenen şey:** Bir yıllık ufukta, **sabit (veri ile verilmiş) yıllık talepleri** karşılayacak şekilde **hangi enerji kaynaklarının ve dönüşüm teknolojilerinin ne kadar kapasiteyle çalışacağının** seçilmesi; aylık **güç dengeleri**, **depolama**, **şebeke ve bölgesel ısıtma kayıpları** ve bir dizi **politika / fizik kısıtı** altında **toplam maliyetin (iskonto edilmiş yatırım + işletme + yakıt)** minimize edilmesi.

Bu bir **iklim veya atmosfer dinamiği modeli değildir**; **enerji–ekonomi optimizasyonu** modelidir. İklimle ilişkisi, isteğe bağlı olarak hesaplanabilen **GWP (küresel ısınma potansiyeli)** emisyon kalemlerinin tanımlanmış olmasıyla sınırlıdır; **amaç fonksiyonu maliyet minimizasyonudur**, karbon kısıtı bu sürümde amaçta yoktur.

---

## 2. Dosyaların rolleri

| Dosya | Rol |
|--------|-----|
| `ses_main.mod` | AMPL’de **kümeler, parametreler, karar değişkenleri, kısıtlar ve amaç fonksiyonu** (matematiksel model). |
| `ses_main.dat` | Sayısal **veri**: sektör talepleri, teknoloji maliyetleri, `layers_in_out` matrisi, aylık süreler, kapasite faktörleri vb. |
| `ses_main.run` | Modeli ve veriyi yükler, **Gurobi** ile çözer, `output/` altına **metin ve CSV çıktıları** yazar. |

Çalıştırma tipik olarak AMPL içinde: `ampl ses_main.run` (Gurobi lisansı ve AMPL kurulumu gerekir).

---

## 3. Zaman ve coğrafi kapsam

- **Zaman:** 12 **ay** (`PERIODS := 1..12`). Her ay için `period_duration[t]` ile **saat** cinsinden süre verilir (ör. Ocak 744 saat); yıl toplamı yaklaşık 8760 saat olur.
- **Coğrafya:** Veri seti ve teknoloji isimleri **İsviçre** enerji sistemine uygundur; model matematiksel olarak **herhangi bir ülkeye** benzer veri ile uyarlanabilir.
- **Talep:** Yıllık enerji talepleri **sektörlere** göre verilir; model bunları aylık **güç** (GW benzeri ölçek) talebine çevirir.

---

## 4. Birimler (veri dosyası başlığından)

Varsayılan birimler (`ses_main.dat` başında belirtildiği gibi):

- Enerji: **GWh**
- Güç: **GW**
- Maliyet: **MCHF** (milyon İsviçre frangı)
- Süre: **saat (h)**
- Yolcu taşımacılığı: **Mpkm** (milyon yolcu-km)
- Yük taşımacılığı: **Mtkm** (milyon ton-km)

---

## 5. Temel kavram: “Katmanlar” (LAYERS)

Model, enerji ve hizmetleri **katmanlar** üzerinden dengelemektedir:

- **Kaynaklar (RESOURCES):** İthal elektrik, yakıtlar (benzin, dizel, doğalgaz, kömür, uranyum, atık, H₂, …), ihracat (`ELEC_EXPORT`) vb.
- **Son kullanım tipleri (END_USES_TYPES):** Örneğin `ELECTRICITY`, `HEAT_HIGH_T`, `HEAT_LOW_T_DHN`, `HEAT_LOW_T_DECEN`, `MOB_PUBLIC`, `MOB_PRIVATE`, `MOB_FREIGHT_RAIL`, `MOB_FREIGHT_ROAD`.

**LAYERS** kümesi, kaynaklardan (ithal biyoyakıt ve ihracat hariç) bu son kullanım katmanlarının birleşimidir. Her dönem `t` için bir **katman dengesi** yazılır: teknoloji ve kaynak çıktıları/girdileri + depolama − talep = 0.

`layers_in_out[i, l]` matrisi: **birim çıktı** (referans: ilgili teknolojinin ana çıktısı 1 GW veya taşımada birim hareket) başına katman `l`’ye **net katkı** (pozitif: üretim/çıkış, negatif: tüketim/girdi). Böylece **verimlilik** ve **çoklu çıktılı** süreçler (KOG, ısı pompası) tek tabloda kodlanır.

---

## 6. Sektörler ve talep girdisi

`SECTORS`: `HOUSEHOLDS`, `SERVICES`, `INDUSTRY`, `TRANSPORTATION`.

`end_uses_demand_year[i, s]`: Her **son kullanım türü** `i` ve sektör `s` için **yıllık talep** (GWh veya taşıma birimi). Örneğin elektrik talebi konut/hizmet/sanayiye dağılır; yolcu ve yük hareketliliği tamamen **TRANSPORTATION** sütunundadır.

Model, `End_Uses_Input[i] = sum_s end_uses_demand_year[i,s]` ile toplam yıllık talebi birleştirir; sonra `end_uses_t` kısıtları ile bunu **aylık güç** talebine dönüştürür:

- **Aydınlatma** ve **uzay ısıtması** için `lighting_month[t]` ve `heating_month[t]` ile **mevsimsellik** (katsayıların yılda toplamı 1 olacak şekilde paylaşım).
- **Düşük sıcaklık ısı:** `Share_Heat_Dhn` ile talep **merkezi şebeke (DHN)** ve **dağınık** arasında bölünür.
- **Yolcu:** `Share_Mobility_Public` ile kamu / özel.
- **Yük:** `Share_Freight_Train` ile demiryolu / karayolu.

Bu paylar **kısıt aralıkları** ile sınırlıdır (ör. kamu mobilite %30–%50).

---

## 7. Karar değişkenleri (ne seçiliyor?)

Özetle optimizasyon şunları belirler:

| Değişken (özet) | Anlamı |
|------------------|--------|
| `F_Mult[i]` | Teknoloji `i` için **yüklü kapasite** (referans birim tablosuna göre çarpan). |
| `F_Mult_t[i,t]` | Dönem `t`’teki **çalışma düzeyi** (aylık; kapasite faktörleriyle üstte bağlı). |
| `Number_Of_Units` | (Altyapı hariç) **tam sayı** birim sayısı — `ref_size` ile uyumlu diskret büyüklük. |
| `Storage_In/Out` | Depolama giriş/çıkış güçleri. |
| `Share_*` | Isıtma ve mobilite bölüşümleri. |
| `Y_Solar_Backup` | Güneş termal yedeklemesi için **tek** yedek teknoloji (ikili değişken). |
| `Losses` | Şebeke / DHN kayıpları. |

**Amaç:** `TotalCost` minimizasyonu:

\[
\text{TotalCost} = \sum_{i \in \text{TECH}} \left( \tau_i \, C_{\text{inv},i} + C_{\text{maint},i} \right) + \sum_j C_{\text{op},j}
\]

Burada `tau[i]` verilen iskonto oranı `i_rate` ve ömür `lifetime[i]` ile **sermaye maliyetinin yıllıklaştırılması** (annuity) faktörüdür.

---

## 8. Önemli kısıt grupları (mod dosyasından)

1. **Kapasite ve kapasite faktörü:** `F_Mult_t[i,t] ≤ F_Mult[i] * c_p_t[i,t]` ve yıllık enerji üst sınırı `c_p[i]` ile.
2. **Katman dengesi:** Her `l`, `t` için üretim + depo net − `End_Uses[l,t] = 0`.
3. **Kaynak kullanılabilirliği:** Her kaynak için yıllık tüketim ≤ `avail[i]`.
4. **Depolama:** Katman uyumluluğu (`storage_eff_in/out`), dönem içinde **hem şarj hem deşarj olmaması** (ikili `y_sto_in`, `y_sto_out`), seviye denklemi (`prev(t)` ile **dairesel** yıl).
5. **Kayıplar:** `Losses[i,t]`, ilgili katmana giren enerjinin `loss_coeff[i]` oranı (ör. elektrik %7, DHN %5).
6. **Teknoloji payları:** `fmin_perc` / `fmax_perc` ile bir son kullanım katmanındaki teknolojilerin **yıllık enerji payı** sınırları.
7. **Dağınık düşük sıcaklık işletme stratejisi + güneş yedeği:** Doğrusallaştırılmış kısıtlar (`X_Solar_Backup_Aux`, `Y_Solar_Backup`).
8. **İsviçre’ye özel ekler:** Baraj mevsimsel depolama (`PUMPED_HYDRO` ile `NEW_HYDRO_DAM` bağlantısı), DHN tepe faktörü (`peak_dhn_factor`), şebeke maliyetinin rüzgâr+PV’ye bağlanması (`extra_grid`), Power-to-Gas birim boyutları, verimlilik “sanal” teknolojisi (`EFFICIENCY`), özel mobilite düzgün çalışma kısıtı.

---

## 9. Veri dosyasında neler var? (`ses_main.dat`)

- **Kümeler:** Tüm teknoloji ve kaynak listeleri (nükleer, CCGT, PV, rüzgâr, hidro, jeotermal, endüstriyel KOG/kazanlar, DHN ve dağınık ısıtma seçenekleri, toplu taşıma ve özel araç tipleri, tren/yük kamyonu, depolama: `PUMPED_HYDRO`, `POWER2GAS`, altyapı: `GRID`, `DHN`, H₂ rotaları, gazifikasyon, piroliz, …).
- **`layers_in_out`:** Her satır bir kaynak veya teknoloji; sütunlar katmanlar — **enerji dengesi ve verimlilik** burada kodlanır.
- **Maliyet ve teknik parametreler:** `c_inv`, `c_maint`, `ref_size`, `f_min`/`f_max`, `lifetime`, `c_p`, `c_p_t` (özellikle PV, rüzgâr, hidro, güneş termal için aylık profil).
- **Emisyon katsayıları:** `gwp_op` (kaynak kullanımı), `gwp_constr` (yapım, kapasiteye göre).
- **İskonto oranı:** `i_rate := 0.03215`.

---

## 10. Çalıştırma betiği (`ses_main.run`) ne yapıyor?

1. `model ses_main.mod;` ve `data ses_main.dat;` yüklenir.
2. Çözücü: **Gurobi** (`option solver gurobi`).
3. `solve;` ile MILP çözülür.
4. Kümeler ve parametreler `output/sets.txt`, `output/params.txt` içine yazdırılır (geçici `comfile.txt` ile).
5. Ek raporlar:
   - `total_output.txt`: Kaynak/teknoloji **yıllık enerji** (`sum_t F_Mult_t * period_duration`).
   - `cost_breakdown.txt`, `gwp_breakdown.txt`.
   - `f_mult_t.txt`, `f_mult.txt`, `End_Uses.txt`.
   - Depolama dosyaları: `PUMPED_HYDRO.txt`, `POWER2GAS.txt`.
   - `losses.txt`, `period_duration.txt`.
   - `output/sankey/input2sankey.csv`: **Sankey diyagramı** için kaynak–hedef akışları (eşik değer > 10 ile filtrelenmiş satırlar).

---

## 11. Bu modeli okurken dikkat edilmesi gerekenler

- **Talep dışsal:** Sektör talepleri veriye sabitlenir; model **ekonomik büyüme veya fiyat esnekliği ile talebi içten belirlemez**.
- **MILP:** `Number_Of_Units` ve depolama / güneş yedeği ikilileri nedeniyle çözüm **tam doğrusal değil**; çözücü tamsayı dallanma–sınır kullanır.
- **“ELECTRICITY” kaynağı:** Matriste pozitif sütun, **ithal veya sistem dışı elektrik** satırı gibi düşünülebilir; denge denkleminde diğer üretim ve tüketimle birlikte yer alır.
- **GWP:** `TotalGWP` tanımlıdır fakat **amaç maliyettir**; karbon fiyatı veya emisyon tavanı bu dosyada amaç veya kısıt olarak eklenmemiş olabilir (senaryo çalışması için ayrıca eklenebilir).

---

## 12. Öğrenme sırası (önerilen)

1. `ses_main.dat` içindeki **SECTORS** ve **END_USES_INPUT** tablosunu okuyun: sistemin **sınırları** netleşir.
2. Bir teknoloji seçin (ör. `CCGT` veya `DHN_COGEN_GAS`) ve **`layers_in_out`** satırını inceleyin: **hangi yakıttan ne üretiliyor** anlaşılır.
3. `ses_main.mod` içinde **`layer_balance`** ve **`end_uses_t`** kısıtlarını yan yana okuyun: **talep → denge → maliyet** zinciri kurulur.
4. `ses_main.run` çıktı dosyalarından **`total_output.txt`** ve **`cost_breakdown.txt`** ile optimal karışımı sayısal olarak takip edin.

---

## 13. Kaynak ve atıf

Model başlığında: **Swiss-EnergyScope (SES)**, yazar **Stefano Moret**, tarih **01.04.2015**. Ders bağlamında Polimi “Energy and Climate Change Modeling” materyali ile birlikte kullanılmaktadır.

---

*Bu rehber, depodaki `ses_main.mod`, `ses_main.dat`, `ses_main.run` dosyalarının doğrudan okunmasıyla üretilmiştir; çözücü sürümü veya veri güncellemeleri farklılık gösterebilir.*
