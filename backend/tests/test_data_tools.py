"""Checks for the data tools: transaction simulator, dataset validator, training script.

The message rows below are tiny made-up fixtures for testing the tools, not the dataset.
"""
import importlib.util
from pathlib import Path

import pandas as pd

from backend.app.ml import train

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_script(name: str):
    spec = importlib.util.spec_from_file_location(name, DATA_DIR / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_simulator_is_deterministic_and_labelled():
    gen = load_script("generate_transactions")
    rows = gen.generate()
    assert rows == gen.generate()
    assert 180 <= len(rows) <= 220
    assert {r["label"] for r in rows} == {"scam", "legit"}
    assert all(bool(r["anomaly"]) == (r["label"] == "scam") for r in rows)


FIXTURE = [
    ("a1", "Your SBI KYC expires today, click bit.ly/x now", "+919800000001", "scam", "fake kyc", "a"),
    ("a2", "Your  SBI KYC expires today,   click bit.ly/x now", "+919800000001", "scam", "Fake KYC", "a"),  # exact dup after normalising
    ("a3", "Your SBI KYC expires today, click bit.ly/y now!", "+919800000009", "scam", "Fake KYC", "b"),  # near dup
    ("a4", "Rs 500 debited from A/c XX1111 at Campus Canteen", "VM-SBIINB", "legit", "", "a"),
    ("a5", "You have won a lucky draw prize", "+919800000002", "spam", "Lottery/prize", "a"),  # bad label
    ("a6", "Exam timetable is now on VTOP", "VM-VITUNI", "legit", "OTP theft", "b"),  # legit with scam type
    ("a7", "Approve the collect request to receive Rs 5000", "+919800000003", "scam", "Collect scam", "b"),  # bad type
    ("a4", "Library book is due tomorrow", "VM-VITLIB", "legit", "None", "b"),  # duplicate id
    ("a9", "", "VM-VITLIB", "legit", "None", "b"),  # empty text
]


def write_fixture(path: Path) -> None:
    pd.DataFrame(FIXTURE, columns=["id", "text", "sender", "label", "scam_type", "source"]).assign(tags="").to_csv(
        path, index=False)


def test_validator_cleans_dedupes_and_validates(tmp_path, capsys):
    validator = load_script("validate_dataset")
    write_fixture(tmp_path / "in.csv")
    out = tmp_path / "messages.csv"
    clean = validator.main([str(tmp_path / "in.csv"), "--out", str(out), "--adversarial", str(tmp_path / "none.csv")])
    assert sorted(clean["id"]) == ["a1", "a4"]
    assert clean.set_index("id").at["a1", "scam_type"] == "Fake KYC"  # case fixed
    assert clean.set_index("id").at["a4", "scam_type"] == "None"      # blank -> None for legit
    assert list(pd.read_csv(out).columns) == validator.COLUMNS
    printed = capsys.readouterr().out
    assert "Dropped 5 invalid, 1 exact duplicates, 1 near-duplicates" in printed
    assert "duplicate id 'a4'" in printed and "empty text" in printed


def test_validator_keeps_adversarial_cases_out_of_training(tmp_path):
    validator = load_script("validate_dataset")
    write_fixture(tmp_path / "in.csv")
    pd.DataFrame([{"id": "x1", "text": "Rs 500 debited from A/c XX1111 at the Campus Canteen", "label": "legit"}]).to_csv(
        tmp_path / "adv.csv", index=False)
    clean = validator.main([str(tmp_path / "in.csv"), "--out", str(tmp_path / "m.csv"),
                            "--adversarial", str(tmp_path / "adv.csv")])
    assert sorted(clean["id"]) == ["a1"]  # a4 is too close to adversarial case x1


def test_training_modes_run(tmp_path):
    scam = ["Share your OTP to unblock your account now", "You have won a lottery, pay fee to claim",
            "KYC expired, click link to update immediately", "Approve collect request to receive money",
            "Your account will be suspended, verify password", "Claim your cashback refund at this link"]
    legit = ["Rs 200 debited at Campus Canteen", "Your order has been delivered",
             "Exam timetable is now available", "Rs 5000 credited to your account by NEFT",
             "Your OTP is 1234. Do not share it", "Library book due tomorrow"]
    sources = ("claude", "gemini", "gpt")
    rows = [(f"s{i}{src}", t, "+919800000001", "scam", "Other", src) for i, t in enumerate(scam) for src in sources]
    rows += [(f"l{i}{src}", t, "VM-SBIINB", "legit", "None", src) for i, t in enumerate(legit) for src in sources]
    df = pd.DataFrame(rows, columns=["id", "text", "sender", "label", "scam_type", "source"]).assign(tags="")
    df.to_csv(tmp_path / "m.csv", index=False)
    df.head(4).assign(notes="human-only notes").to_csv(tmp_path / "adv.csv", index=False)
    model = tmp_path / "model.joblib"
    common = ["--data", str(tmp_path / "m.csv"), "--model-out", str(model), "--adversarial", str(tmp_path / "adv.csv")]

    held_out = train.main(common + ["--train-sources", "claude,gemini", "--test-source", "gpt"])
    assert set(held_out["test"]["all"]) == {"rules", "ML", "hybrid M+H", "hybrid High"}
    assert "adversarial" not in held_out  # experiments never see the adversarial set
    assert not model.exists()

    full = train.main(common + ["--all"])
    assert model.exists()
    assert "adversarial" in full


def test_sender_type():
    assert train.sender_type("+91 98000 00001") == "phone"
    assert train.sender_type("VM-SBIINB") == "shortcode"
    assert train.sender_type("x@gmail.com") == "freemail"
    assert train.sender_type("noreply@vit.ac.in") == "email"
    assert train.sender_type("") == "none"
