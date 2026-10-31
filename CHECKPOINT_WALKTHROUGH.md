# ⏱️ 60-Second Checkpoint Walkthrough

*Quick-reference demonstration guide for mentors and hackathon judges.*

---

## 🎯 Demo Order (60 Seconds)

1. **Open Live Deployment:**
   - Navigate to [https://patiala-diwali-dashboard.vercel.app](https://patiala-diwali-dashboard.vercel.app).
   - Lands directly on the **Forecast** tab with **Nov 8 (Diwali)** pre-selected.
   - Point out the **ONE Big Answer**: **`119.8 µg/m³`**, **`Poor`** band, Diwali Day (D0).
   - Point out the station-level truth banner right below the header: single CPCB station (`site_1437`), not neighbourhood-exact.

2. **Select Predicted Peak Day:**
   - Click **Nov 10** in the day picker (marked with `★ Peak`).
   - Big Answer instantly updates: **`143.9 µg/m³`**, **`Very Poor`** band, 2 days after Diwali (D+2).
   - Note the KPI row below: **2.4x** CPCB 24-hr standard at predicted peak (Nov 10).

3. **Switch to "Graph" Tab:**
   - Click the **Graph** tab.
   - Shows the complete 13-day trajectory curve (Nov 1–13) with Diwali D0 marker, CPCB 24-hr standard (60 µg/m³), and WHO guideline (15 µg/m³).

4. **Switch to "Model & Method" Tab:**
   - Click the **Model & Method** tab.
   - Highlights the retrospective backtest chart on the held-out 2024 window (Oct 20 – Nov 10, 2024; 22 days) and model skill summary cards (17.5 µg/m³ 1-day lead vs 20.2 naive baseline).
   - Review multi-window validation and station metadata tabs.

5. **Deep-Dive on Testing & Replication (If Asked):**
   - Reference the `Validation` section in `README.md` for verified held-out error across 3 historical Diwali windows (2022, 2023, 2024) and multi-city replication notes (Amritsar, Ludhiana).

---

> ⚠️ **If internet fails during checkpoint:**
> Use the static PPT screenshots or the local recorded walkthrough video.
