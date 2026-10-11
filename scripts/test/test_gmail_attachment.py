"""Tests for scripts/gmail-attachment.py (Gmail RAW attachment extraction).

The defect these guard is silent: base64.b64decode() defaults to
validate=False, so it DROPS every '-' and '_' rather than raising. The decode
then "succeeds", the MIME parser finds zero parts, and the message reads as one
that never carried an attachment. So the base64url test carries its own negative
control: the same blob put through standard base64 must fail to yield the file.
"""

import base64
import binascii
import importlib.util
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "gmail_attachment", REPO / "scripts" / "gmail-attachment.py"
)
ga = importlib.util.module_from_spec(SPEC)
sys.modules["gmail_attachment"] = ga
SPEC.loader.exec_module(ga)

# Every byte value, so the base64url encoding is guaranteed to contain both
# '-' and '_'. A payload without them would pass under the broken decode too.
PAYLOAD = bytes(range(256)) * 4


def build_raw(filename="Rechnung.pdf"):
    """A two-part MIME message, base64url-encoded the way Gmail returns RAW.

    The outer encoding only reaches alphabet positions 62 and 63 (the '-' and
    '_' the trap turns on) when a '>' or '?' lands on a byte whose offset is
    2 mod 3, so the body carries a quoted line and the padding is nudged until
    the encoding actually exercises them. Without that the fixture would pass
    under the broken decode as well and prove nothing.
    """
    from email.message import EmailMessage

    for pad in range(3):
        msg = EmailMessage()
        msg["Delivered-To"] = "mario@niebes.net"
        msg["Subject"] = "Scan Ihrer Anfrage"
        msg["From"] = "archiv@example.org"
        msg["To"] = "mario@niebes.net"
        msg["Date"] = "Tue, 2 Sep 2026 09:00:00 +0200"
        msg.set_content("Anbei der Scan." + " " * pad + "\n> Ihre Anfrage?\n")
        msg.add_attachment(PAYLOAD, maintype="application", subtype="pdf",
                           filename=filename)
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode().rstrip("=")
        if "-" in raw or "_" in raw:
            return raw
    raise AssertionError("fixture must exercise the base64url alphabet")


def test_base64url_blob_yields_the_attachment(tmp_path):
    src = tmp_path / "raw.txt"
    src.write_text(build_raw(), encoding="utf-8")
    out = tmp_path / "out"

    parts = ga.extract(str(src), str(out))

    assert [(t, f) for t, f, w in parts if w] == [("application/pdf", "Rechnung.pdf")]
    assert (out / "Rechnung.pdf").read_bytes() == PAYLOAD


def test_standard_base64_on_the_same_blob_loses_the_attachment(tmp_path):
    """Negative control: the trap is real, so the urlsafe path is doing work.

    Dropping every '-' and '_' shortens the blob, so standard base64 either
    raises on the length or returns shifted bytes. Both lose the attachment;
    neither is distinguishable from a message that had none.
    """
    raw = build_raw()
    padded = raw + "=" * (-len(raw) % 4)
    try:
        broken = base64.b64decode(padded)  # validate=False drops '-' and '_'
    except binascii.Error:
        return
    assert not ga.looks_like_mime(broken)


def test_mcp_json_result_is_unwrapped(tmp_path):
    src = tmp_path / "result.json"
    src.write_text(json.dumps({"result": {"message": {"raw": build_raw()}}}),
                   encoding="utf-8")
    out = tmp_path / "out"

    ga.extract(str(src), str(out))

    assert (out / "Rechnung.pdf").read_bytes() == PAYLOAD


def test_already_decoded_eml_is_passed_through(tmp_path):
    from email.message import EmailMessage

    msg = EmailMessage()
    msg["From"] = "archiv@example.org"
    msg["Date"] = "Tue, 2 Sep 2026 09:00:00 +0200"
    msg.set_content("Anbei.")
    msg.add_attachment(PAYLOAD, maintype="application", subtype="pdf",
                       filename="Rechnung.pdf")
    src = tmp_path / "mail.eml"
    src.write_bytes(msg.as_bytes())
    out = tmp_path / "out"

    ga.extract(str(src), str(out))

    assert (out / "Rechnung.pdf").read_bytes() == PAYLOAD


def test_prefix_filters_but_still_lists_every_part(tmp_path):
    src = tmp_path / "raw.txt"
    src.write_text(build_raw(filename="Scan_0001.pdf"), encoding="utf-8")
    out = tmp_path / "out"

    parts = ga.extract(str(src), str(out), prefix="Rechnung")

    assert [f for t, f, w in parts] == ["Scan_0001.pdf"]
    assert not any(w for t, f, w in parts)
    assert not list(out.iterdir())


def test_unrecognised_flag_is_an_error(tmp_path):
    src = tmp_path / "raw.txt"
    src.write_text(build_raw(), encoding="utf-8")
    try:
        ga.main(["gmail-attachment.py", str(src), str(tmp_path / "o"), "--no-write"])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("an unrecognised flag must exit non-zero")
