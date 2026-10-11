#!/usr/bin/env python3
"""Extract attachments from a Gmail RAW message onto disk.

The Gmail MCP has no attachment-download tool: `get_message` and `get_thread`
return attachment metadata (filename, mimeType, id) and never the bytes. The
only route to the content is `messageFormat: "RAW"`, which returns the whole
MIME message base64url-encoded. This script turns that blob into files.

Input can be any of:
  - the JSON file the harness writes when an MCP result is too big
    (the `raw` field is pulled out of it, at any nesting depth)
  - a file holding just the base64url blob
  - an already-decoded .eml

Usage:
    python3 scripts/gmail-attachment.py <input> <output-dir> [filename-prefix]

Without a prefix every attachment is written. With one, only attachments whose
filename starts with it. One line is printed per part, so the listing shows what
was in the message whether or not anything matched.

Destination in this repo: `listings/{NNN}/`, keyed by tracker listing ID. Never
`inbox/` — that is the user's drop zone (CLAUDE.md, Inbox Folder).

Ported from the sibling ancestry repo (scripts/gmail-attachment.py there).

Read an extracted PDF with `pdftotext -layout <file> -`. Without `-layout`,
table columns interleave and figures attach to the wrong rows.
"""

import argparse
import base64
import email
import email.policy
import json
import os
import re
import sys

HEADER_STARTS = (
    b"Delivered-To",
    b"Received",
    b"Return-Path",
    b"MIME-Version",
    b"From:",
    b"Date:",
    b"Message-ID",
    b"X-",
)


def looks_like_mime(data):
    return data.lstrip()[:200].startswith(HEADER_STARTS)


def find_raw_in_json(obj):
    """Depth-first search for the first plausible base64 `raw` field."""
    if isinstance(obj, dict):
        for key in ("raw", "rawMessage", "content"):
            val = obj.get(key)
            if isinstance(val, str) and len(val) > 500:
                return val
        for val in obj.values():
            found = find_raw_in_json(val)
            if found:
                return found
    elif isinstance(obj, list):
        for val in obj:
            found = find_raw_in_json(val)
            if found:
                return found
    return None


def decode(data):
    if looks_like_mime(data):
        return data

    # An MCP result saved to disk: pull the base64 out without loading it
    # into anyone's context.
    try:
        blob = find_raw_in_json(json.loads(data))
        if blob:
            data = blob.encode()
    except (ValueError, UnicodeDecodeError):
        pass

    s = b"".join(data.split())
    # Some results wrap the blob in quotes.
    s = s.strip(b'"')
    s = re.sub(rb"\\[nr]", b"", s)
    pad = s + b"=" * (-len(s) % 4)

    # Gmail returns base64url. base64.b64decode() with the default
    # validate=False silently DROPS every '-' and '_' instead of failing,
    # so everything after the first one decodes to garbage and the message
    # looks like it has no attachments. Always try urlsafe first.
    decoded = base64.urlsafe_b64decode(pad)
    if not looks_like_mime(decoded):
        decoded = base64.b64decode(pad)
    if not looks_like_mime(decoded):
        sys.exit("input is neither MIME nor decodable base64/base64url")
    return decoded


def normalize_newlines(data):
    """Force CRLF. Mixed or bare CR line endings break the MIME parser."""
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n").replace(b"\n", b"\r\n")


def extract(src, out_dir, prefix=None):
    """Write matching attachments. Returns [(content_type, filename, written)]."""
    with open(src, "rb") as fh:
        data = decode(fh.read())

    msg = email.message_from_bytes(normalize_newlines(data), policy=email.policy.default)

    print("Subject: %s" % msg.get("Subject"))
    print("Date:    %s" % msg.get("Date"))

    os.makedirs(out_dir, exist_ok=True)
    parts = []
    for part in msg.walk():
        filename = part.get_filename()
        if not filename:
            continue
        written = prefix is None or filename.startswith(prefix)
        if written:
            with open(os.path.join(out_dir, filename), "wb") as fh:
                fh.write(part.get_payload(decode=True))
        parts.append((part.get_content_type(), filename, written))
        print("%s %-40s %s" % ("*" if written else " ", part.get_content_type(), filename))
    return parts


def main(argv):
    parser = argparse.ArgumentParser(
        description="Extract attachments from a Gmail RAW message.")
    parser.add_argument("input", help="saved MCP JSON result, bare base64url blob, or .eml")
    parser.add_argument("output_dir", help="directory to write attachments into")
    parser.add_argument("prefix", nargs="?", default=None,
                        help="write only attachments whose filename starts with this")
    # Unrecognised arguments are an error rather than being ignored: a typo in a
    # flag must not degrade into a different run (script-qa gate 11).
    args = parser.parse_args(argv[1:])

    parts = extract(args.input, args.output_dir, args.prefix)
    written = [p for p in parts if p[2]]
    if not written:
        sys.exit("no attachment written: check the prefix against the listing above")
    print("\n%d file(s) written to %s" % (len(written), args.output_dir))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
