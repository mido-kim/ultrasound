# Element array v2-3 — JLCPCB flex files

v2-2 with three changes. Everything else is the same as v2-2 (see README.md): tail, ribbon, fan-out, transfer pads, element map, 4 mm pitch, outline cut to the traces, order settings.

| | v2-2 | v2-3 |
|---|---|---|
| Element pad copper / coverlay opening | 1.8 / 1.6 mm | **1.2 / 1.0 mm** |
| Island under each element | 2.44 mm | **1.84 mm** |
| Far-row traces in the gaps | straight | **wavy, ±0.35 mm, 2 periods** |
| Legs from the transfer row | ±0.5 mm, 2 periods | **±0.6 mm, 3 periods** |
| Transfer pads to near-row elements | 8 mm | **13 mm** |
| Narrowest cut | 0.36 mm | 0.335 mm |

| Zip | Size (mm) | Stiffener |
|---|---|---|
| `array_v2-3_FPC1_signal_JLC.zip` | 41.0 × 304.4 | PI 0.25 mm on the tail (same as v2-1/v2-2) |
| `array_v2-3_FPC2_ground_JLC.zip` | 41.0 × 23.4 | none |

Order settings and remarks: same as v2-2 in README.md (1 layer, 0.11 mm, 1 oz, ENIG, yellow coverlay; gold fingers 0.30 mm with a PI stiffener 0.25 mm on FPC 1; laser-cut remark, now min cut 0.335 mm). Both boards pass the KiCad DRC with zero issues.

**Element edges over the far-row strips.** The 3 mm elements sit 1 mm apart, so a wavy far-row strip passes under the edges of the neighbouring elements, by up to 0.24 mm. At the wave peaks the trace copper is 0.08 mm outside a neighbour's outline; it stays under coverlay. Put ACF only on the pads, so the strips don't get bonded to the element edges.

Pictures: `previews/v2-3_stack.png`, `previews/v2-3_layout.png`.
Generator: `make_array_v2_3.py` (reuses `make_array_v2.py`; writes only the v2-3 files).
