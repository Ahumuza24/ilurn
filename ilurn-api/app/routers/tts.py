import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter(tags=["tts"])

_GOOGLE_TTS_URL = "https://translate.google.com/translate_tts"
# Google's TTS endpoint rejects requests without a browser-like User-Agent.
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


@router.get("/tts")
def text_to_speech(
    text: str = Query(..., min_length=1, max_length=200),
    lang: str = Query("en", min_length=2, max_length=10),
) -> Response:
    """Return spoken audio (MP3) for a short phrase.

    Proxies an upstream TTS service so the browser plays a real audio clip via an
    <audio> element instead of depending on locally installed speech-synthesis voices.
    """
    params = {"ie": "UTF-8", "client": "tw-ob", "tl": lang, "q": text}
    try:
        with httpx.Client(timeout=10.0, headers={"User-Agent": _USER_AGENT}) as client:
            upstream = client.get(_GOOGLE_TTS_URL, params=params)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Text-to-speech service is unavailable.") from exc

    if upstream.status_code != 200 or not upstream.content:
        raise HTTPException(status_code=502, detail="Text-to-speech service returned an error.")

    return Response(
        content=upstream.content,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
