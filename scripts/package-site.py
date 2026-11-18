#!/usr/bin/env python3
"""Build an archive of the public files for the S3 website."""

import argparse
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

SITE_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_FILES = (
    "404.html",
    "certifications.html",
    "favicon.ico",
    "fonts/manrope-OFL.txt",
    "fonts/manrope-latin.woff2",
    "github_logo_icon.ico",
    "images/EEG.png",
    "images/RevisitedChatroomArchitecture.png",
    "images/audvy-mark.webp",
    "images/certifications.png",
    "images/chatroomarchitecture.jfif",
    "images/chatroomarchitecture.png",
    "images/hackathon-chatroom.webp",
    "images/logo.png",
    "images/neuropoly-brain.webp",
    "images/neuropoly-eeg.webp",
    "images/neuropoly.png",
    "images/projects.png",
    "images/satellite.png",
    "images/scalable-chatroom.webp",
    "images/ubh2024logo.PNG",
    "images/verticallyscalablearchitecture.PNG",
    "images/webapps.png",
    "index.html",
    "logo.jpg",
    "logo.png",
    "projects.html",
    "projects/audvyme.html",
    "projects/hackathonchatroom.html",
    "projects/horizontallyscalablechatroom.html",
    "projects/neuropoly.html",
    "scripts/neuropoly.js",
    "scripts/site.js",
    "styles.css",
    "webapps.html",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="Destination ZIP file")
    args = parser.parse_args()

    for name in PUBLIC_FILES:
        path = SITE_ROOT / name
        if not path.is_file() or path.resolve() != path:
            parser.error(f"Expected a regular public file at {path}")

    output = args.output.resolve()
    if output.suffix != ".zip":
        parser.error("The output must end in .zip")

    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for name in PUBLIC_FILES:
            archive.write(SITE_ROOT / name, arcname=name)
    print(f"Packaged {len(PUBLIC_FILES)} public files in {output}")


if __name__ == "__main__":
    main()
