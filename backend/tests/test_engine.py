import socket

import pytest

from backend.app.rules.engine import analyze_message, find_urls

PRD_EXAMPLE = "Dear customer your SBI KYC expires today. Click bit.ly/sbi-kyc now to avoid block"

SCAMS = [
    ("Dear customer, your SBI KYC expires today. Click bit.ly/sbi-kyc-upd now to avoid account block.", "+919800000001"),
    ("Congratulations! You have won Rs 25,00,000 in the Paytm Lucky Draw. Pay a processing fee of Rs 999 at paytm-lucky-winner.xyz to claim.", "winner.desk@gmail.com"),
    ("VIT Alert: Your student account will be suspended within 24 hours. Verify your password at http://vit-ac-in-login.com immediately.", "vit.helpdesk@outlook.com"),
    ("Hi, I am sending you Rs 5000 for the OLX item. Approve the collect request on PhonePe and enter UPI PIN to receive the money.", "+919800000002"),
    ("Your ICICI account has been blocked. Share the OTP sent to your phone to reactivate it immediately.", "+919800000003"),
]

LEGIT = [
    ("Rs 1,250.00 debited from A/c XX4821 on 24-10-26 to UPI merchant SWIGGY. Avl bal Rs 18,430.55. Not you? Call 1800-000-0000. -SBI", "VM-SBIINB"),
    ("482913 is your OTP for login to HDFC Bank NetBanking. Valid for 5 minutes. Do not share this OTP with anyone.", "VM-HDFCBK"),
    ("Your Amazon order #402-0000000 has been delivered. Thank you for shopping with us.", "AX-AMAZON"),
    ("VIT: Mid-term exam timetable for the Winter semester is now available on VTOP. -Academics Office", "VM-VITUNI"),
    ("Rs 5,000.00 credited to your A/c XX1093 by NEFT from PRIYA S. Avl bal Rs 22,180.00. -HDFC Bank", "VM-HDFCBK"),
]


@pytest.mark.parametrize("text,sender", SCAMS)
def test_scams_score_at_least_medium(text, sender):
    assert analyze_message(text, sender).rule_score >= 35


@pytest.mark.parametrize("text,sender", LEGIT)
def test_legit_messages_have_no_signals(text, sender):
    result = analyze_message(text, sender)
    assert result.signals == []
    assert result.rule_score == 0


def test_prd_example_matches_contract():
    result = analyze_message(PRD_EXAMPLE, "+919876543210")
    assert result.rule_score == 90
    assert result.scam_type == "Fake KYC"
    assert {s.id for s in result.signals} == {
        "generic_greeting", "brand_impersonation", "account_threat",
        "urgency_threat", "suspicious_link", "sender_mismatch",
    }


def test_highlight_offsets_point_at_matched_text():
    result = analyze_message(PRD_EXAMPLE, "+919876543210")
    link = next(h for h in result.highlights if h.signal_id == "suspicious_link")
    assert PRD_EXAMPLE[link.start:link.end] == "bit.ly/sbi-kyc"
    # highlights never overlap, so the UI can paint them directly
    spans = [(h.start, h.end) for h in result.highlights]
    assert all(a[1] <= b[0] for a, b in zip(spans, spans[1:]))


def test_otp_warning_is_not_penalised():
    result = analyze_message("Your OTP is 551203. Never share it with anyone, including bank staff.")
    assert "credential_request" not in {s.id for s in result.signals}


def test_otp_request_is_flagged():
    result = analyze_message("Please share the OTP you received to complete verification.")
    assert "credential_request" in {s.id for s in result.signals}
    assert result.scam_type == "OTP theft"


@pytest.mark.parametrize("text,reason", [
    ("go to bit.ly/abc", "shortener"),
    ("go to http://192.168.10.5/login", "raw_ip"),
    ("go to http://example.com", "not_https"),
    ("go to https://freegift.xyz", "odd_tld"),
    ("go to https://sbi-secure-kyc.com", "lookalike"),
])
def test_link_checks(text, reason):
    (_, _, reasons), = find_urls(text)
    assert reason in reasons


def test_clean_link_and_plain_words_are_not_flagged():
    assert find_urls("Pay at https://www.example.com today")[0][2] == []
    assert find_urls("Thanks from ABC Ltd.Your order is ready") == []


def test_sender_mismatch_needs_brand_and_wrong_sender():
    ids = lambda t, s: {x.id for x in analyze_message(t, s).signals}
    assert "sender_mismatch" in ids("Your SBI account will be blocked.", "+919800000001")
    assert "sender_mismatch" not in ids("Your SBI account will be blocked.", "VM-SBIINB")
    assert "sender_mismatch" not in ids("Hello, see you at 5.", "+919800000001")


def _ids(text, sender=None):
    return {s.id for s in analyze_message(text, sender).signals}


def test_code_requests_count_as_credential_requests():
    assert "credential_request" in _ids("A 6-digit verification code was sent to you, please forward it to us.")
    assert "credential_request" in _ids("Reply to this SMS with your debit card number and expiry date.")
    assert "credential_request" in _ids("Your account is locked. Log in at http://bank-secure-login.xyz to restore.")


def test_call_personal_number_signal():
    assert "call_unknown_number" in _ids("Your SIM will be deactivated. Call our officer on 9000012345 now.")
    assert "call_unknown_number" not in _ids("Not you? Call 1800-000-0000 to report.")


def test_kyc_needs_suspicious_link_or_mobile_number():
    assert "account_threat" in _ids("Complete re-KYC at https://bank-rekyc.top")
    assert "account_threat" not in _ids("Your e-KYC was done on 24-Oct. Details at https://www.example.com")


def test_appointment_times_are_not_urgency():
    assert "urgency_threat" not in _ids("Your appointment is confirmed for 29 Oct at 10:15 AM.")
    assert "urgency_threat" in _ids("Power supply will be cut at 8:30 PM tonight.")


def test_analysis_makes_no_network_calls(monkeypatch):
    def blocked(*args, **kwargs):
        raise AssertionError("network access attempted")

    monkeypatch.setattr(socket, "socket", blocked)
    monkeypatch.setattr(socket, "create_connection", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)
    for text, sender in SCAMS + LEGIT:
        analyze_message(text, sender)
