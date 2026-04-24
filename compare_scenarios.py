#!/usr/bin/env python3
"""Print scenario_metrics.txt for baseline vs drought after running both AMPL scripts."""
from pathlib import Path

def read_metrics(path: Path) -> dict[str, float]:
    out: dict[str, float] = {}
    for line in path.read_text().splitlines():
        parts = line.strip().split("\t")
        if len(parts) >= 2:
            out[parts[0]] = float(parts[1])
    return out

def main() -> None:
    root = Path(__file__).resolve().parent
    base = root / "output" / "scenario_metrics.txt"
    drought = root / "output_drought" / "scenario_metrics.txt"
    if not base.is_file():
        print(f"Missing {base} — run: ampl scenarios/baseline/ses_main.run")
        return
    if not drought.is_file():
        print(f"Missing {drought} — run: ampl scenarios/drought/ses_main_drought.run")
        return
    b, d = read_metrics(base), read_metrics(drought)
    print("Metric\t\tBaseline\tDrought\t\tDelta (drought - baseline)")
    for key in sorted(set(b) | set(d)):
        bv, dv = b.get(key), d.get(key)
        if bv is None or dv is None:
            print(f"{key}\t\t{bv}\t\t{dv}")
            continue
        print(f"{key}\t\t{bv:.6g}\t{dv:.6g}\t{dv - bv:+.6g}")

if __name__ == "__main__":
    main()
