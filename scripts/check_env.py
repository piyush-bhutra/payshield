"""Exit non-zero unless running inside the project's .venv.

Usage: python scripts/check_env.py
"""
import sys
from pathlib import Path


def in_project_venv() -> bool:
    """True when the interpreter is a virtual env whose folder is named .venv."""
    return sys.prefix != sys.base_prefix and Path(sys.prefix).name == ".venv"


if __name__ == "__main__":
    if not in_project_venv():
        print(f"ERROR: not inside .venv (sys.prefix = {sys.prefix}). Activate it first:")
        print(r"  PowerShell: .venv\Scripts\Activate.ps1")
        print("  macOS/Linux: source .venv/bin/activate")
        sys.exit(1)
    print(f"OK: using {sys.prefix}")
