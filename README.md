# Badminton Finder — Deploy Guide (GitHub Pages + GAS API)

## ໄຟລ໌ໃນ folder ນີ້
| ໄຟລ໌ | ໃຊ້ສຳລັບ |
|-------|---------|
| `index.html` | ອັປໂຫຼດໃສ່ GitHub repo (frontend) |
| `Code.gs` | ວາງໃສ່ Google Apps Script (backend) |
| `CNAME` | ແກ້ໃສ່ domain ທ່ານ ແລ້ວ ອັປໂຫຼດ GitHub |

---

## ຂັ້ນຕອນ 1 — ຕັ້ງ Google Apps Script

1. ເປີດ [script.google.com](https://script.google.com)
2. ສ້າງ project ໃໝ່ → ລຶບ code ເກົ່າ → ວາງ `Code.gs` ທັງໝົດ
3. ກົດ **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy URL ທີ່ໄດ້ (ຄ້າຍ: `https://script.google.com/macros/s/AKfycb.../exec`)
5. ເປີດ `index.html` → ຊອກຫາ `PASTE_YOUR_DEPLOYMENT_ID_HERE`
   → ແທນທີ່ດ້ວຍ URL ທີ່ copy ມາ

---

## ຂັ້ນຕອນ 2 — ສ້າງ GitHub Repository

1. ໄປ [github.com](https://github.com) → **New repository**
2. ຕັ້ງຊື່ (ເຊັ່ນ `badminton-finder`) → Public → Create
3. ອັປໂຫຼດ 3 ໄຟລ໌: `index.html`, `CNAME`, `README.md`
4. ໃນ `CNAME` ແກ້ `yourdomain.com` ເປັນ domain ທ່ານ

---

## ຂັ້ນຕອນ 3 — ເປີດ GitHub Pages

1. Settings → Pages → Source: **Deploy from a branch**
2. Branch: `main` → `/ (root)` → **Save**
3. ລໍຖ້າ ~2 ນາທີ → URL `https://username.github.io/badminton-finder/`

---

## ຂັ້ນຕອນ 4 — Custom Domain DNS

ທີ Domain Registrar ຕັ້ງ **A records** 4 ໄລ:

```
Type: A    @    185.199.108.153
Type: A    @    185.199.109.153
Type: A    @    185.199.110.153
Type: A    @    185.199.111.153
Type: CNAME  www  username.github.io
```

ຈາກນັ້ນ Settings → Pages → Custom domain ໃສ່ domain ທ່ານ → **Enforce HTTPS**

DNS propagate 24-48 ຊົ່ວໂມງ.

---

## ຂໍ້ຄວນລະວັງ

- ໝາກ GAS deploy **ທຸກຄ່ຽງ** ທີ່ແກ້ `Code.gs` ຕ້ອງ **deploy ໃໝ່** (New deployment ຫຼື Manage deployments → update)
- URL ຂອງ GAS ຈະປ່ຽນທຸກຄ່ຽງທີ່ deploy ໃໝ່ — ຕ້ອງ update `GAS_URL` ໃນ `index.html` ດ້ວຍ
- ຖ້າ fetch ຂຶ້ນ CORS error ກວດສອບ `doGet`/`doPost` ໃຫ້ return `_cors()` ຄົບ
