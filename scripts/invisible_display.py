"""Hardening for invisible_core's Linux Xvfb display — monkeypatches on import.

Import this BEFORE starting an InvisiblePlaywright(headless=True) session
(invisible-driver.py, invisible-playwright-mcp.py). The vendored library stays
untouched, so scripts/rebuild-invisible.sh can re-vendor it without losing this.

Two failures after the Ubuntu 26.04 upgrade (2026-10-13; first hard failure 2026-10-24):

1. LEAK. The library spawns Xvfb in its own session (start_new_session=True) and stops
   it only from __aexit__. Every driver death that skips __aexit__ — scan.mjs killing
   the driver right after `quit`, the SIGKILL escalation on restart, Claude Code killing
   the MCP server — orphaned one Xvfb. 17 had piled up (:99–:115), one or two per scan.
   Fix: PR_SET_PDEATHSIG, so the kernel sends Xvfb SIGTERM when its spawning process
   dies, however it dies.

2. PICKER. The library treats "no /tmp/.X{n}-lock" as "display free". 26.04 mounts /tmp
   as tmpfs and systemd-tmpfiles ages it out after 10 days (`q /tmp 1777 root root 10d`),
   so it deleted the lock of a still-running orphan. A new Xvfb on that number then
   fails to bind its TCP port and removes the lock it had just created — the picker
   returns the same number on all 10 retries ("Xvfb :99 exited immediately").
   Fix: a number is busy if its lock names a live PID OR its port 6000+n is bound.
"""
import ctypes
import errno
import os
import signal
import socket
import subprocess

from invisible_core import _headless

_PR_SET_PDEATHSIG = 1
_X_TCP_BASE = 6000


def _die_with_parent():
    # Runs in the child between fork and exec. PDEATHSIG fires when the spawning
    # THREAD exits — both callers start the display from their main thread.
    ctypes.CDLL("libc.so.6", use_errno=True).prctl(_PR_SET_PDEATHSIG, signal.SIGTERM)


def _lock_is_live(n):
    try:
        with open(f"/tmp/.X{n}-lock") as f:
            pid = int(f.read().strip())
    except FileNotFoundError:
        return False
    except (OSError, ValueError):
        return True  # unreadable / garbled: assume taken
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False  # stale lock; Xvfb itself replaces a lock whose PID is gone
    except PermissionError:
        pass  # another user's server
    return True


def _port_in_use(port):
    for family, host in ((socket.AF_INET, "0.0.0.0"), (socket.AF_INET6, "::")):
        s = socket.socket(family, socket.SOCK_STREAM)
        try:
            s.bind((host, port))
        except OSError as e:
            if e.errno == errno.EADDRINUSE:
                return True
        finally:
            s.close()
    return False


def _pick_display(self):
    for n in range(99, 400):
        if _lock_is_live(n) or os.path.exists(f"/tmp/.X11-unix/X{n}") or _port_in_use(_X_TCP_BASE + n):
            continue
        return f":{n}"
    raise RuntimeError("no free X display number in :99–:399")


def _spawn(self, display):
    # Same argv as the library's _spawn, plus the parent-death signal.
    self._proc = subprocess.Popen(
        [
            "Xvfb", display,
            "-screen", "0", self._geometry,
            "+extension", "GLX",
            "+extension", "RENDER",
            "-nolisten", "unix",
            "-listen", "tcp",
            "-ac",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        preexec_fn=_die_with_parent,
    )


_headless._LinuxVirtualDisplay._pick_display = _pick_display
_headless._LinuxVirtualDisplay._spawn = _spawn
