"""Validation of the timing tool (skgif/timing.js) against Chrome's own records.

Each case is loaded once in headless Chrome with timing.js switched on (as tools/measurements.html does).
In the same page load the script records, through the Chrome DevTools Protocol:
  - the times reported by timing.js (console lines and User Timing marks);
  - every request to the OpenCitations APIs (as the DevTools Network panel);
  - the screenshots of the page with their time (as the DevTools Performance panel).
For each measure it compares the number of API calls counted by timing.js with the requests seen by Chrome, and the
time of the measure with the first screenshot taken after it (the moment the content is painted on screen).
CSS animations are paused during the recording: otherwise the animated "Loading" dots fill Chrome's limit of
450 screenshots per trace. The measured times do not depend on them.

Requirements: Google Chrome, Python 3 with `websocket-client` (pip install websocket-client), the local server
on port 5500 started from the repository root (python -m http.server 5500).

Usage (from the repository root):
    python tools/validate_timing.py                 # the three default cases
    python tools/validate_timing.py venue person    # only some cases
Output: a table in the terminal and, for each case, the screenshots in timing-validation/<case>/
(file name = milliseconds from the start of the page load).
"""
import base64, json, os, shutil, subprocess, sys, tempfile, time, urllib.request
import websocket

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SITE = 'http://127.0.0.1:5500/example/oc/html_template/'
OUTPUT = 'timing-validation'
PORT = 9333
MAX_PAINT_DELAY = 400  # ms: no screen change within this time = the content is not on screen (e.g. a hidden tab)

CASES = {
    'venue': {'name': 'Venue Scientometrics', 'value': 'br/06010060186', 'wait': 40},
    'person': {'name': 'Person, 18 publications', 'value': 'ra/0614010840740', 'wait': 60},
    'product': {'name': 'Research product, 266 citations ("Load all")', 'value': 'br/061301512373', 'wait': 90,
                'click': 'button.br-load-chart[type=button]'},
}
TRACE = {'includedCategories': ['disabled-by-default-devtools.screenshot', 'blink.user_timing', 'devtools.timeline']}


def run_case(key, case):
    out = os.path.join(OUTPUT, key)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    chrome = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', f'--remote-debugging-port={PORT}',
                               f'--user-data-dir={tempfile.mkdtemp()}', 'about:blank'],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(80):
        try:
            tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json'))
            break
        except Exception:
            time.sleep(0.25)
    page = [t for t in tabs if t['type'] == 'page'][0]
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], suppress_origin=True)
    state = {'id': 0, 'lines': [], 'requests': {}, 'trace': [], 'trace_done': False}

    def handle(msg):
        method, params = msg.get('method'), msg.get('params', {})
        if method == 'Runtime.consoleAPICalled':
            text = ' '.join(str(a.get('value', a.get('description', ''))) for a in params['args'])
            if 'SKG-IF timing' in text:
                state['lines'].append(text)
        elif method == 'Network.requestWillBeSent' and 'opencitations.net' in params['request']['url']:
            state['requests'][params['requestId']] = {'url': params['request']['url'],
                                                     'start': params['wallTime'] * 1000}
        elif method == 'Tracing.dataCollected':
            state['trace'].extend(params['value'])
        elif method == 'Tracing.tracingComplete':
            state['trace_done'] = True

    def cmd(method, **params):
        state['id'] += 1
        my_id = state['id']
        ws.send(json.dumps({'id': my_id, 'method': method, 'params': params}))
        while True:
            msg = json.loads(ws.recv())
            handle(msg)
            if msg.get('id') == my_id:
                return msg.get('result', msg)

    cmd('Runtime.enable'); cmd('Page.enable'); cmd('Network.enable')
    cmd('Emulation.setDeviceMetricsOverride', width=1300, height=900, deviceScaleFactor=1, mobile=False)
    # timing.js is switched on by sessionStorage, as in measurements.html ("Measure manually in this tab")
    cmd('Page.navigate', url=SITE + 'home.html')
    time.sleep(2)
    cmd('Runtime.evaluate', expression="sessionStorage.setItem('skgifTiming', JSON.stringify({ preview: true, autoClick: false }))")
    cmd('Animation.enable'); cmd('Animation.setPlaybackRate', playbackRate=0)
    cmd('Tracing.start', transferMode='ReportEvents', traceConfig=TRACE)
    cmd('Page.navigate', url=SITE + 'browser.html?value=' + case['value'])
    end, clicked = time.time() + case['wait'], False
    while time.time() < end:
        cmd('Runtime.evaluate', expression='1')
        time.sleep(0.2)
        if case.get('click') and not clicked and any('page_shown' in l for l in state['lines']):
            time.sleep(3)
            cmd('Runtime.evaluate', expression=f"document.querySelector('{case['click']}')?.click()")
            clicked = True
    cmd('Tracing.end')
    while not state['trace_done']:
        handle(json.loads(ws.recv()))
    result = cmd('Runtime.evaluate', returnByValue=True, expression=(
        "JSON.stringify({ origin: performance.timeOrigin, marks: performance.getEntriesByType('mark')"
        ".map(m => ({ name: m.name, start: m.startTime })) })"))
    ws.close()
    chrome.kill()

    info = json.loads(result['result']['value'])
    marks = {m['name']: m['start'] for m in info['marks']}
    # Trace clock -> ms from the start of the page load, through a mark present both in the trace and in the page
    in_trace = [e for e in state['trace'] if e.get('cat', '').startswith('blink.user_timing') and e.get('name') in marks]
    base = in_trace[0]['ts'] / 1000 - marks[in_trace[0]['name']] if in_trace else None
    shots = []
    for e in state['trace']:
        if e.get('name') == 'Screenshot' and base is not None:
            at = e['ts'] / 1000 - base
            shots.append(at)
            with open(os.path.join(out, f'{max(0, round(at)):06d}.jpg'), 'wb') as f:
                f.write(base64.b64decode(e['args']['snapshot']))
    shots.sort()

    rows = []
    for name, start in sorted(marks.items(), key=lambda m: m[1]):
        line = next((l for l in state['lines'] if f'] {name}:' in l), '')
        script_calls = _calls(line)
        at = info['origin'] + start
        sent = [r for r in state['requests'].values() if r['start'] <= at]
        chrome_calls = (sum('/skg-if/' in r['url'] for r in sent), sum('/index/' in r['url'] for r in sent))
        after = [s for s in shots if s >= start]
        paint = after[0] - start if after and after[0] - start <= MAX_PAINT_DELAY else None
        rows.append((case['name'], name, start, paint, script_calls, chrome_calls))
    return rows


def _calls(line):
    """(SKG-IF calls, Index calls) from a timing.js console line."""
    def number(label):
        part = line.split(f' {label} calls')[0].rsplit(' ', 1)[-1] if f' {label} calls' in line else '0'
        return int(part) if part.isdigit() else 0
    return number('SKG-IF'), number('Index')


def main():
    keys = sys.argv[1:] or list(CASES)
    rows = []
    for key in keys:
        print(f'Loading {CASES[key]["name"]} ...', flush=True)
        rows += run_case(key, CASES[key])
    print()
    print(f'{"Case":<46}{"Measure":<26}{"timing.js":>11}{"painted":>11}{"delay":>9}   calls timing.js / Chrome')
    for case, name, start, paint, script_calls, chrome_calls in rows:
        painted = f'{(start + paint) / 1000:.3f} s' if paint is not None else 'not shown'
        delay = f'+{paint:.0f} ms' if paint is not None else '-'
        same = 'equal' if script_calls == chrome_calls else 'DIFFERENT'
        print(f'{case:<46}{name:<26}{start / 1000:>9.3f} s{painted:>11}{delay:>9}   '
              f'{script_calls[0]}+{script_calls[1]} / {chrome_calls[0]}+{chrome_calls[1]} ({same})')
    print(f'\n"calls" = SKG-IF + Index. "not shown" = no screen change within {MAX_PAINT_DELAY} ms (content in a hidden tab).')
    print(f'Screenshots in {OUTPUT}/<case>/ to check the painted frames.')


if __name__ == '__main__':
    main()
