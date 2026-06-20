from __future__ import annotations

import argparse
import json
import mimetypes
import threading
import urllib.parse
import webbrowser
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from typing import Any

from comic_pack_schema import export_pack, load_project, safe_relative_path, save_project, validate_project
from translation import OpenAICompatibleLocalProvider


class ReviewApplication:
    def __init__(self, project_dir: Path):
        self.project_dir = project_dir.resolve()
        self.tool_dir = Path(__file__).resolve().parent
        self.lock = threading.Lock()

    def project(self) -> dict[str, Any]:
        with self.lock:
            return load_project(self.project_dir)

    def save(self, project: dict[str, Any]) -> None:
        with self.lock:
            save_project(self.project_dir, project)


def make_handler(application: ReviewApplication):
    class ReviewHandler(BaseHTTPRequestHandler):
        server_version = "ChunkyComicBuilder/1.0"

        def do_GET(self) -> None:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path == "/":
                self._send_file(application.tool_dir / "templates" / "review.html", "text/html; charset=utf-8")
                return
            if parsed.path.startswith("/static/"):
                relative = parsed.path.removeprefix("/static/")
                target = application.tool_dir / "static" / relative
                self._send_file(target)
                return
            if parsed.path == "/api/project":
                self._send_json(application.project())
                return
            if parsed.path == "/api/image":
                query = urllib.parse.parse_qs(parsed.query)
                requested = query.get("path", [""])[0]
                try:
                    relative = safe_relative_path(requested, "image path")
                    target = application.project_dir / Path(*PurePosixPath(relative).parts)
                    target.resolve().relative_to(application.project_dir)
                except (ValueError, OSError):
                    self._send_json({"error": "Invalid image path."}, HTTPStatus.BAD_REQUEST)
                    return
                self._send_file(target)
                return
            self._send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)

        def do_POST(self) -> None:
            parsed = urllib.parse.urlparse(self.path)
            try:
                body = self._read_json()
                if parsed.path == "/api/project":
                    if body.get("format") != "chunky-comic-builder-project":
                        raise ValueError("Invalid builder project format.")
                    body["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    application.save(body)
                    self._send_json({"ok": True})
                    return
                if parsed.path.startswith("/api/page/") and parsed.path.endswith("/bubbles"):
                    page_id = urllib.parse.unquote(parsed.path.split("/")[3])
                    project = application.project()
                    page = find_page(project, page_id)
                    if not page:
                        self._send_json({"error": f'Page "{page_id}" was not found.'}, HTTPStatus.NOT_FOUND)
                        return
                    page["bubbles"] = body.get("bubbles", [])
                    application.save(project)
                    self._send_json({"ok": True, "pageId": page_id})
                    return
                if parsed.path == "/api/validate":
                    self._send_json(validate_project(application.project_dir))
                    return
                if parsed.path == "/api/export":
                    project = application.project()
                    output = body.get("out") or str(
                        application.project_dir / "exports" / f"{project['packId']}.comicpack.zip"
                    )
                    self._send_json(export_pack(application.project_dir, output))
                    return
                if parsed.path == "/api/translate-page":
                    project = application.project()
                    page = find_page(project, body.get("pageId", ""))
                    if not page:
                        self._send_json({"error": "Page was not found."}, HTTPStatus.NOT_FOUND)
                        return
                    provider = OpenAICompatibleLocalProvider(
                        endpoint=body.get("endpoint", "http://127.0.0.1:11434/v1/chat/completions"),
                        model=body.get("model", "hy-mt2:1.8b"),
                    )
                    translations = provider.translate_page(page.get("bubbles", []))
                    by_id = {item["id"]: item["english"] for item in translations}
                    for bubble in page.get("bubbles", []):
                        if bubble["id"] in by_id:
                            bubble["english"] = by_id[bubble["id"]]
                            if "[REVIEW]" in bubble["english"]:
                                bubble["needsReview"] = True
                    application.save(project)
                    self._send_json({"translations": translations})
                    return
                self._send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)
            except (ValueError, RuntimeError, KeyError, json.JSONDecodeError) as error:
                self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
            except OSError as error:
                self._send_json({"error": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)

        def log_message(self, format_string: str, *args: Any) -> None:
            print(f"[review] {self.address_string()} {format_string % args}")

        def _read_json(self) -> dict[str, Any]:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                return {}
            return json.loads(self.rfile.read(length).decode("utf-8"))

        def _send_json(self, value: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
            payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)

        def _send_file(self, path: Path, content_type: str | None = None) -> None:
            if not path.is_file():
                self._send_json({"error": "File not found."}, HTTPStatus.NOT_FOUND)
                return
            payload = path.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header(
                "Content-Type",
                content_type or mimetypes.guess_type(path.name)[0] or "application/octet-stream",
            )
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)

    return ReviewHandler


def find_page(project: dict[str, Any], page_id: str) -> dict[str, Any] | None:
    return next(
        (
            page
            for chapter in project.get("chapters", [])
            for page in chapter.get("pages", [])
            if page.get("id") == page_id
        ),
        None,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local comic pack review UI.")
    parser.add_argument("project")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if args.host not in {"127.0.0.1", "localhost"}:
        raise SystemExit("For privacy, the review server only binds to localhost.")

    application = ReviewApplication(Path(args.project))
    load_project(application.project_dir)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(application))
    url = f"http://{args.host}:{args.port}/"
    print(f"Comic Pack Builder review: {url}")
    print("Press Ctrl+C to stop.")
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping review server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
