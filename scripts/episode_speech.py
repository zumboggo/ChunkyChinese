"""Resolve an existing Whisper model without downloads or generation requests."""
import argparse
import json
import os
from pathlib import Path


def cache_candidates(explicit=None, root=None, environ=None, home=None):
    env = os.environ if environ is None else environ
    root = Path.cwd() if root is None else Path(root)
    home = Path.home() if home is None else Path(home)
    if explicit is not None:
        return [Path(explicit).expanduser().resolve()]
    paths = [root / '.local/speech-cache']
    for key in ('HF_HUB_CACHE', 'HUGGINGFACE_HUB_CACHE'):
        if env.get(key):
            paths.append(Path(env[key]).expanduser())
    if env.get('HF_HOME'):
        paths.append(Path(env['HF_HOME']).expanduser() / 'hub')
    paths.append(Path(env.get('XDG_CACHE_HOME', home / '.cache')).expanduser() / 'huggingface/hub')
    return list(dict.fromkeys(path.resolve() for path in paths))


def resolve_speech_model(model='base.en', cache=None, *, root=None, environ=None, home=None, lookup=None):
    candidates = cache_candidates(cache, root, environ, home)
    local = Path(model).expanduser()
    if local.is_dir():
        candidates = [None]
    elif lookup is None:
        from faster_whisper.utils import download_model
        lookup = download_model
    for candidate in candidates:
        if candidate is not None and not candidate.is_dir():
            continue
        try:
            path = local.resolve() if candidate is None else Path(lookup(model, cache_dir=str(candidate), local_files_only=True))
            if all((path / file).is_file() for file in ('model.bin', 'config.json', 'tokenizer.json')):
                return {'model': model, 'cache': str(candidate) if candidate else None, 'modelPath': str(path.resolve())}
        except (OSError, ValueError):
            continue
    searched = ', '.join(str(p) for p in candidates if p is not None) or str(local)
    raise ValueError(f'No complete cached speech model {model!r} found in {searched}. Supply an existing --speech-cache or local --speech-model directory. No model was downloaded and no media was processed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', default='base.en')
    parser.add_argument('--cache', type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(resolve_speech_model(args.model, args.cache)))
    except (ImportError, ValueError) as error:
        parser.error(str(error))
