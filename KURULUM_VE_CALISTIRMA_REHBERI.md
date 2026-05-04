# ECCM Project Group10 - Installation and Run Guide (Windows + macOS)

This document is prepared for users who want to clone and run the project from scratch.

## 1) Requirements

Since this project is an AMPL model, the following tools are required:

- `Git` (to clone the repository)
- `AMPL`
- `Gurobi` (used as the solver inside AMPL)
- `Python 3` (optional: for the scenario comparison script)
- `VS Code + Live Server` (optional: for Sankey HTML visualization)

## 2) Clone the repository

Open Terminal/PowerShell and run:

```bash
git clone <REPO_URL>
cd ECCM-Project-Group10
```

Note: replace `<REPO_URL>` with the course/repository URL.

## 3) macOS installation steps

### 3.1 Git and Python (if missing)

```bash
brew install git python
```

### 3.2 Install AMPL

1. Download and install AMPL from the official source.
2. Verify that the `ampl` command works:

```bash
ampl --version
```

If the command is not found, add the AMPL binary directory to your `PATH`.

### 3.3 Install Gurobi and activate license

1. Install Gurobi.
2. Activate your license.
3. Verify that the `gurobi` solver is visible in AMPL.

## 4) Windows installation steps

### 4.1 Git and Python (if missing)

- Install `Git for Windows`.
- Install `Python 3` (check **Add Python to PATH** during setup).

Verify:

```powershell
git --version
python --version
```

### 4.2 Install AMPL

1. Download and install AMPL for Windows.
2. Add the `ampl.exe` path from the installation directory to the `PATH` environment variable.
3. Test in a new PowerShell window:

```powershell
ampl --version
```

### 4.3 Install Gurobi and activate license

1. Install Gurobi for Windows.
2. Activate your license.
3. Verify that the `gurobi` solver can be used from AMPL.

## 5) Run the project

Run the following commands from the repository root.

### 5.1 Baseline scenario

```bash
ampl scenarios/baseline/ses_main.run
```

This command writes results under `output/` (e.g. `total_output.txt`, `cost_breakdown.txt`, `scenario_metrics.txt`, `sankey/input2sankey.csv`).

### 5.2 Drought scenario

```bash
ampl scenarios/drought/ses_main_drought.run
```

This command writes results under `output_drought/`.

### 5.3 Scenario comparison (optional)

```bash
python3 compare_scenarios.py
```

On Windows, if needed:

```powershell
python compare_scenarios.py
```

## 6) Sankey visualization (optional)

Sankey HTML files:

- `output/sankey/SES_sankey.html`
- `output_drought/sankey/SES_sankey.html`

Using VS Code:

1. Install the `Live Server` extension.
2. Right-click the HTML file.
3. Select **Open with Live Server**.

## 7) Common issues

- `ampl: command not found` / `'ampl' is not recognized`:
  - AMPL is not installed or `PATH` is not configured correctly.
- `error: could not load solver gurobi`:
  - Gurobi is not installed/licensed or the AMPL-Gurobi integration is missing.
- `Missing ... scenario_metrics.txt`:
  - Run the relevant AMPL run file first (`scenarios/baseline/ses_main.run` and/or `scenarios/drought/ses_main_drought.run`).

## 8) Quick checklist

- [ ] `ampl --version` works
- [ ] Gurobi license is active
- [ ] `ampl scenarios/baseline/ses_main.run` succeeds
- [ ] `ampl scenarios/drought/ses_main_drought.run` succeeds
- [ ] (Optional) `python3 compare_scenarios.py` produces output

