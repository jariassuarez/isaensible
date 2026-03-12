import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        prog="isaensible",
        description="Cluster management dashboard",
    )
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (development)")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes")
    args = parser.parse_args()

    try:
        import uvicorn
    except ImportError:
        print("uvicorn is required: pip install uvicorn[standard]", file=sys.stderr)
        sys.exit(1)

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers if not args.reload else 1,
    )
