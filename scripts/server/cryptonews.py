"""Operator-only server job. Never imported by Astro, never run during a build.
Provider reference: https://cryptonews-api.com/documentation
Endpoint and parameters checked against official documentation on 2026-11-01.
"""
import fcntl
import hashlib
import json
import os
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote_plus, urlsplit, parse_qsl, urlunsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

ENDPOINT = 'https://cryptonews-api.com/api/v1/category'
LIMIT = 5
MAX_BYTES = 2_000_000

class NewsError(Exception):
    """Safe message only: never include request URL, key or provider body."""

class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def safe_url(value):
    if not isinstance(value, str):
        raise NewsError('Invalid original source URL.')
    parsed = urlsplit(value)
    if parsed.scheme not in ('https', 'http') or not parsed.hostname or parsed.username or parsed.password:
        raise NewsError('Invalid original source URL.')
    if any(k.lower() in ('token', 'api_key', 'apikey', 'key', 'access_token') for k, _ in parse_qsl(parsed.query)):
        raise NewsError('Source URL contains a credential parameter; rejected.')
    return urlunsplit(parsed._replace(fragment=''))

def normalize(payload, key, expected=LIMIT):
    if not isinstance(payload, dict) or not isinstance(payload.get('data'), list):
        raise NewsError('Unexpected provider response. Nothing was stored.')
    rows = payload['data']
    if len(rows) != expected:
        raise NewsError('Provider returned an unexpected item count; manual review required.')
    result = []
    for row in rows:
        if not isinstance(row, dict):
            raise NewsError('Invalid provider item.')
        fields = {name: row.get(name) for name in ['title', 'source_name', 'date', 'news_url']}
        if not all(isinstance(v, str) and v.strip() for v in fields.values()):
            raise NewsError('A required title, source, date or original link is missing.')
        # Refuse any payload containing a reflected key before writing or displaying it.
        if key in json.dumps(row, ensure_ascii=False):
            raise NewsError('Credential reflection detected. Nothing was stored.')
        try:
            from email.utils import parsedate_to_datetime
            published = parsedate_to_datetime(fields['date'])
            if published.tzinfo is None:
                raise ValueError()
        except (ValueError, TypeError, OverflowError):
            raise NewsError('Unrecognized provider publication date.') from None
        fetched = datetime.now(timezone.utc)
        age = (fetched - published).total_seconds()
        if age < -900 or age > 7 * 86400:
            raise NewsError('News is future-dated or older than seven days; freshness not verified.')
        result.append({'title': fields['title'].strip(), 'source': fields['source_name'].strip(),
                       'date': published.isoformat(), 'url': safe_url(fields['news_url'])})
    if len({r['url'] for r in result}) != expected:
        raise NewsError('Duplicate original URLs; manual review required.')
    return result

def request_batch(key, count, opener=None, before=None):
    if not key or not key.strip():
        raise NewsError('CRYPTONEWS_API_KEY is missing in this execution environment.')
    # General news, first page, five items. Token is sent only to the fixed HTTPS host.
    # Proxy secret references must reach the proxy unchanged; URL-encoding their
    # ':'/'/' markers prevents injection. Real keys are encoded normally.
    proxy_reference = any(marker in key.lower() for marker in ('proxy', 'secret', 'placeholder'))
    raw_safe = key.isascii() and not any(c in key for c in '&?#=+ \r\n')
    token = key if proxy_reference and raw_safe else quote_plus(key)
    parameters = {'section': 'general', 'items': count, 'type': 'article'}
    if before:
        end = before - timedelta(seconds=1)
        start = end - timedelta(days=6)
        parameters['datetimerange'] = start.strftime('%m%d%Y %H%M%S') + '-' + end.strftime('%m%d%Y %H%M%S')
    url = ENDPOINT + '?' + urlencode(parameters) + '&token=' + token
    request = Request(url, headers={'Accept': 'application/json', 'User-Agent': 'EconoFlux-EditorialReview/1.0'})
    transport = opener or build_opener(NoRedirects())
    try:
        with transport.open(request, timeout=20) as response:
            body = response.read(MAX_BYTES + 1)
    except HTTPError as error:
        messages = {401: 'API authentication rejected.', 403: 'API access or subscription rejected.',
                    429: 'Provider quota or rate limit reached. No automatic retry.'}
        raise NewsError(messages.get(error.code, 'Provider HTTP failure (' + str(error.code) + '). No retry.')) from None
    except (URLError, TimeoutError, OSError):
        raise NewsError('Provider connection failed. No automatic retry.') from None
    if len(body) > MAX_BYTES:
        raise NewsError('Provider response exceeded size limit.')
    try:
        payload = json.loads(body)
    except (ValueError, UnicodeError):
        raise NewsError('Provider did not return valid JSON.') from None
    return normalize(payload, key, expected=count)

def request_five(key, opener=None):
    # Trial plans permit at most three items and no pagination. Two bounded
    # batches, with a documented date/time cutoff, retrieve five distinct items.
    first = request_batch(key, 3, opener)
    oldest = min(datetime.fromisoformat(row['date']) for row in first)
    second = request_batch(key, 2, opener, before=oldest)
    result = first + second
    if len({row['url'] for row in result}) != LIMIT:
        raise NewsError('Provider date filter returned duplicates. No further request made.')
    if any(datetime.fromisoformat(row['date']) >= oldest for row in second):
        raise NewsError('Provider did not honor date cutoff. No further request made.')
    return result

def run_manual(directory, key, fetcher=request_five, retry_failed=False):
    if not key:
        raise NewsError('CRYPTONEWS_API_KEY is missing in this execution environment.')
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (directory / '.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        today = datetime.now(timezone.utc).date().isoformat()
        cache = directory / 'latest.json'
        budget = directory / 'request-day.txt'
        if budget.exists() and budget.read_text() == today:
            if cache.exists():
                stored = json.loads(cache.read_text())
                if stored.get('fetchedAt', '').startswith(today):
                    return stored['items']
            retry_budget = directory / 'retry-day.txt'
            if not retry_failed or (retry_budget.exists() and retry_budget.read_text() == today):
                raise NewsError('Daily manual request already attempted. No automatic retry.')
            retry_budget.write_text(today)
            retry_budget.chmod(0o600)
        budget.write_text(today)
        budget.chmod(0o600)
        rows = fetcher(key)
        cache.write_text(json.dumps({'fetchedAt': datetime.now(timezone.utc).isoformat(), 'items': rows}, ensure_ascii=False, indent=2))
        cache.chmod(0o600)
        return rows

def save_draft(directory, source, english, spanish):
    """Called only after an editor verifies the original source and both languages.
    No headline expansion or machine-written facts are generated here.
    """
    for version in [english, spanish]:
        if not all(isinstance(version.get(k), str) and version[k].strip() for k in ['title', 'body']):
            raise NewsError('Both editorial title and body are required.')
    # Exact numeric parity across translations; editors still verify meanings and sources.
    numbers = lambda v: sorted(re.findall(r'\d+(?:[.,]\d+)*', v['title'] + ' ' + v['body']))
    if numbers(english) != numbers(spanish):
        raise NewsError('Numbers differ between translations.')
    original = safe_url(source['url'])
    identity = hashlib.sha256(original.encode()).hexdigest()[:20]
    draft = {'translationId': identity, 'status': 'draft', 'indexable': False,
             'createdAt': datetime.now(timezone.utc).isoformat(), 'sources': [source],
             'translations': {'en': english, 'es': spanish}, 'publicationEnabled': False}
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = directory / ('draft-' + identity + '.json')
    if target.exists():
        raise NewsError('Draft already exists. Review the existing file instead of overwriting it.')
    target.write_text(json.dumps(draft, ensure_ascii=False, indent=2))
    target.chmod(0o600)
    return target

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='One manual server job, two bounded batches, five news records, no publishing.')
    parser.add_argument('--live', action='store_true', help='Explicitly authorize a bounded five-item job (two trial-compatible batches).')
    parser.add_argument('--retry-failed', action='store_true', help='One explicitly authorized retry after a diagnosed failed request, never automatic.')
    args = parser.parse_args()
    if not args.live:
        parser.error('--live is required; no request was made')
    try:
        rows = run_manual(Path(__file__).resolve().parents[2] / '.local/editorial/cryptonews', os.environ.get('CRYPTONEWS_API_KEY'), retry_failed=args.retry_failed)
        # Standard output contains only the four requested fields.
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    except NewsError as error:
        import sys
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from None
    except Exception:
        import sys
        print('Manual news job failed safely. No provider details or credentials logged.', file=sys.stderr)
        raise SystemExit(1) from None
