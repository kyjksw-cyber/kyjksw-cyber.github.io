"""
HTML → 정적 PNG 1장.
모션이 끝난 최종 상태를 캡처.

사용:
  python3 _capture_png.py asset-A-series-spine 1200 600
  python3 _capture_png.py asset-B-inefficiency 1200 720
  python3 _capture_png.py asset-C-three-layers 760 760
"""
import sys, subprocess
from pathlib import Path

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HERE = Path(__file__).parent.resolve()

def capture(name, width, height):
    html = HERE / f"{name}.html"
    out = HERE / f"{name}.png"
    if not html.exists():
        print(f"[ERR] HTML not found: {html}")
        sys.exit(1)

    # as_uri() 사용해서 한글 경로도 안전하게 file:// URL 생성
    url = html.as_uri()

    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--window-size={width},{height}",
        f"--screenshot={out}",
        "--virtual-time-budget=12000",  # 모션 다 끝난 시점
        "--default-background-color=ffffffff",
        url,
    ]

    print(f"[CAPTURE] {name} ({width}x{height})")
    print(f"  URL: {url}")
    result = subprocess.run(cmd, capture_output=True)

    if not out.exists():
        print(f"[ERR] capture failed")
        sys.exit(2)

    size = out.stat().st_size
    print(f"[DONE] {out.name} ({size:,} bytes)")

    # Thinking Guard: 5KB 이하면 빈 화면 의심 (feedback_chrome-headless-viewport)
    # 콘텐츠가 viewport 밖으로 잘렸을 가능성 → window-size 키울 것
    if size < 5_000:
        print(f"  ⚠️  WARN: PNG 사이즈 {size:,} bytes — 빈 화면 의심")
        print(f"  ⚠️  콘텐츠가 viewport({width}x{height}) 밖으로 잘렸을 수 있음")
        print(f"  ⚠️  HTML 콘텐츠 실제 높이 추정: padding+heading+main+footer +100px 여유 → window-size 키우기")

    return out

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    capture(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
