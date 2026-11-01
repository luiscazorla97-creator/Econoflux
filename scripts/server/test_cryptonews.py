import io
import json
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from cryptonews import request_five, normalize, run_manual, save_draft, NewsError

KEY = 'private-test-credential-never-print'

def sample():
    return {'data': [{'title': 'Fixture headline ' + str(i), 'source_name': 'Fixture source',
                       'date': format_datetime(datetime.now(timezone.utc) - timedelta(minutes=i)),
                       'news_url': 'https://example.org/news/' + str(i)} for i in range(5)]}

class Transport:
    def __init__(self, payload=None, error=None):
        self.payload, self.error, self.calls, self.request = payload, error, 0, None
    def open(self, request, timeout):
        self.calls += 1
        self.request = request
        if not hasattr(self, "requests"): self.requests = []
        self.requests.append(request)
        if self.error:
            raise self.error
        from urllib.parse import urlparse, parse_qs
        params = parse_qs(urlparse(request.full_url).query)
        count = int(params['items'][0])
        rows = self.payload['data']
        chosen = rows[-count:] if 'datetimerange' in params else rows[:count]
        return io.BytesIO(json.dumps({'data': chosen}).encode())

class CryptoNewsTests(unittest.TestCase):
    def test_missing_key_never_calls_transport(self):
        transport = Transport(sample())
        with self.assertRaisesRegex(NewsError, 'missing'):
            request_five('', transport)
        self.assertEqual(transport.calls, 0)

    def test_two_trial_batches_have_five_total_and_metadata_only(self):
        from urllib.parse import urlparse, parse_qs
        transport = Transport(sample())
        result = request_five(KEY, transport)
        self.assertEqual(transport.calls, 2)
        self.assertEqual([parse_qs(urlparse(r.full_url).query)['items'] for r in transport.requests], [['3'], ['2']])
        self.assertNotIn('page', parse_qs(urlparse(transport.requests[0].full_url).query))
        self.assertEqual(len(result), 5)
        self.assertEqual(set(result[0]), {'title', 'source', 'date', 'url'})
        self.assertNotIn(KEY, json.dumps(result))

    def test_errors_never_reflect_key_or_retry(self):
        for code in [301, 401, 403, 429, 500]:
            transport = Transport(error=HTTPError('https://example.org/?token='+KEY, code, KEY, {}, None))
            with self.assertRaises(NewsError) as caught:
                request_five(KEY, transport)
            self.assertNotIn(KEY, str(caught.exception))
            self.assertEqual(transport.calls, 1)
        with self.assertRaisesRegex(NewsError, 'connection failed'):
            request_five(KEY, Transport(error=URLError(KEY)))

    def test_invalid_dates_duplicates_and_reflected_credentials_rejected(self):
        for mode in ['date', 'duplicates', 'reflection', 'count']:
            data = sample()
            if mode == 'date': data['data'][0]['date'] = 'invalid'
            if mode == 'duplicates': data['data'][0]['news_url'] = data['data'][1]['news_url']
            if mode == 'reflection': data['data'][0]['title'] = KEY
            if mode == 'count': data['data'].pop()
            with self.assertRaises(NewsError): normalize(data, KEY)

    def test_cache_and_failed_attempt_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            calls = []
            def fetch(key):
                calls.append(1)
                return normalize(sample(), KEY)
            self.assertEqual(run_manual(tmp, KEY, fetch), run_manual(tmp, KEY, fetch))
            self.assertEqual(len(calls), 1)
            self.assertNotIn(KEY, (Path(tmp)/'latest.json').read_text())
        with tempfile.TemporaryDirectory() as tmp:
            def fail(key): raise NewsError('Quota reached')
            with self.assertRaises(NewsError): run_manual(tmp, KEY, fail)
            with self.assertRaisesRegex(NewsError, 'already attempted'): run_manual(tmp, KEY, fail)

    def test_drafts_stay_private_and_have_matching_numbers(self):
        source = normalize(sample(), KEY)[0]
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(NewsError, 'Numbers differ'):
                save_draft(tmp, source, {'title':'Fixture', 'body':'5'}, {'title':'Ejemplo', 'body':'6'})
            path = save_draft(tmp, source, {'title':'Fixture', 'body':'5'}, {'title':'Ejemplo', 'body':'5'})
            data = json.loads(path.read_text())
            self.assertEqual(data['status'], 'draft')
            self.assertFalse(data['publicationEnabled'])
            self.assertFalse(data['indexable'])
            self.assertEqual(set(data['translations']), {'en', 'es'})
            with self.assertRaisesRegex(NewsError, 'already exists'):
                save_draft(tmp, source, {'title':'Fixture', 'body':'5'}, {'title':'Ejemplo', 'body':'5'})

if __name__ == '__main__': unittest.main()

class ProxyReferenceTests(unittest.TestCase):
    def test_proxy_reference_reaches_proxy_without_encoding(self):
        from urllib.parse import urlparse, parse_qs
        from cryptonews import request_batch
        transport = Transport(sample())
        request_batch('proxy-secret://TEST_REFERENCE', 3, transport)
        self.assertIn('token=proxy-secret://TEST_REFERENCE', transport.request.full_url)
        self.assertEqual(parse_qs(urlparse(transport.request.full_url).query)['items'], ['3'])

    def test_explicit_retry_is_bounded(self):
        with tempfile.TemporaryDirectory() as tmp:
            def fail(key): raise NewsError('Failure fixture')
            for retry in [False, True]:
                with self.assertRaisesRegex(NewsError, 'Failure fixture'):
                    run_manual(tmp, KEY, fail, retry_failed=retry)
            with self.assertRaisesRegex(NewsError, 'already attempted'):
                run_manual(tmp, KEY, fail, retry_failed=True)
