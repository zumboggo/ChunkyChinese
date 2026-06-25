# Bridge to the surrounding React app when running as an embedded web export.
# Mirrors the Just Friends prototype: posts events to the parent window so the
# app can record progress. No-ops outside the browser build.

init python:
    import json as _chunky_json

    def chunky_event(name, payload=None):
        if payload is None:
            payload = {}
        payload["type"] = name
        payload["storyId"] = "lms"
        if renpy.emscripten:
            renpy.emscripten.run_script(
                "window.parent && window.parent.postMessage("
                + _chunky_json.dumps({"source": "chunky-renpy", "payload": payload})
                + ", '*')"
            )

    def chunky_chapter_start(chapter_id):
        chunky_event("chapterStart", {"chapterId": chapter_id})

    def chunky_chapter_complete(chapter_id, outcome=None):
        chunky_event("chapterComplete", {"chapterId": chapter_id, "outcome": outcome})

    def chunky_ending(ending_id):
        chunky_event("endingReached", {"endingId": ending_id})
