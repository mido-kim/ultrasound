# Element array v2 — JLCPCB flex files

Four single-layer FPCs. Upload each `*_JLC.zip` as its own flex PCB order.

| Zip | What | Size (mm) | Stiffener |
|---|---|---|---|
| `array_v2-1_FPC1_signal_JLC.zip` | 2-1 signal: tail + 254 mm ribbon + array | 42.0 × 301.0 | PI 0.225 mm on the tail |
| `array_v2-1_FPC2_ground_JLC.zip` | 2-1 ground layer | 42.0 × 20.0 | none |
| `array_v2-2_FPC1_signal_JLC.zip` | 2-2 signal, wavy, cut to the traces | 41.0 × 299.7 | PI 0.225 mm on the tail |
| `array_v2-2_FPC2_ground_JLC.zip` | 2-2 ground layer, wavy, cut to the traces | 41.0 × 18.7 | none |

Pictures: `previews/v2-1_stack.png`, `previews/v2-2_stack.png` (the stack seen from the FPC 1 side) and `previews/v2-*_layout.png` (each FPC from its copper side, the tail, the whole length).

## JLCPCB order settings (all four)

- Flex PCB, **1 layer**
- Thickness **0.11 mm** (25 µm PI), copper **1 oz (35 µm)**
- Coverlay yellow, surface finish **ENIG**, no silkscreen
- **FPC 1 only:** stiffener **PI 0.225 mm** — area in the `*-Stiffener_PI_0.225mm.gbr` file. Remark to paste:
  > Single-sided FPC. PI stiffener 0.225 mm on the non-copper side under the gold fingers, 7 mm from the tip, full width (see Stiffener layer). Finger area total thickness 0.30 ± 0.03 mm for a Molex 54132 ZIF connector.
- **2-2 only:** remark "Outline has narrow cuts (min 0.36 mm) between strips and islands; please laser-cut as drawn."

FPC 1 is 301 mm long, inside JLC's regular flex maximum (234 × 490 mm).

## How the pieces go together

```
looking down from the FPC 1 side, ribbon pointing up
  FPC 1   copper facing DOWN    signal pads, ground transfer pads
  ACF + 3×3×0.55 mm elements
  FPC 2   copper facing UP      ground pads, ground transfer pads
```

- **Tail:** goes into J1001 **copper side down** (J1001 is bottom-contact). Finger 1 = EL0 is at the right when you look at the copper side with the tail pointing up; it lands on J1001 pin 1. Fingers alternate EL / GND like the board: odd = EL0–EL15, even = GND.
- **Ribbon:** 32 traces at 0.5 mm, signal and ground alternating, 254 mm long.
- **Ground transfer row:** FPC 1's 16 ground traces end in 16 pads (1.0 × 2.0 mm) just above the array. FPC 2 has the same 16 pads facing up. Bond them face to face with ACF; FPC 1 has no ground past this row.
- **FPC 2 ground traces:** each one runs on the same path as its element's signal trace on FPC 1, so every leg is a signal / ground pair.
- **Alignment holes** (1.0 mm, non-plated) at the same spots on FPC 1 and FPC 2: 4 on 2-1, 2 on 2-2 (ends of the transfer row). Pin them together while bonding.
- **Step at the transfer row:** at the elements the two FPCs are 0.55 mm apart; at the transfer row they touch. 2-1 leaves 4 mm between the row and the elements for that bend, 2-2 leaves 8 mm.

## Element map

Looking from the FPC 1 side, ribbon up. Near = row next to the ribbon. Columns left to right, 4 mm pitch:

| Column | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| near row | EL0 | EL2 | EL4 | EL6 | EL8 | EL10 | EL12 | EL14 |
| far row | EL1 | EL3 | EL5 | EL7 | EL9 | EL11 | EL13 | EL15 |

To show the image row by row, the viewer takes channels 0, 2, 4 … 14 for the near row and 1, 3, 5 … 15 for the far row.

## Main dimensions

| | 2-1 | 2-2 |
|---|---|---|
| Element pad copper / coverlay opening | 2.6 / 2.4 mm | 1.8 / 1.6 mm |
| Island under each element | — (rectangle) | 2.44 mm |
| Traces in the array | 0.2 mm, straight | 0.2 mm, waves ±0.5 mm, 2 periods |
| Strip around each trace | — | 0.84 mm |
| Outline | 42 mm wide rectangle, ~5 mm margins | cut to the traces, min cut 0.36 mm |

Tail (Molex 54132 FPC drawing): 16.5 mm wide, fingers 0.35 mm on 0.5 mm, 4.0 mm exposed, R0.3 tip corners, 0.35 mm copper setback at the tip.
Rules used for the KiCad DRC: copper to outline ≥ 0.3 mm, copper gap ≥ 0.14 mm. All four boards pass with zero issues.

## Files

- `make_array_v2.py` — generates everything (KiCad boards, DRC, Gerbers, zips, pictures). Numbers at the top.
- `v2-*_FPC*/` — KiCad 9 board + project, `drc.json`, `gerber/`.
