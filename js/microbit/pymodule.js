/*
 * Python-broncode van de gesimuleerde modules `microbit` en `music`.
 * Ze praten met JavaScript via de verborgen module `_mbhost` (zie host.js).
 */
(function () {
  'use strict';

  const IMAGES = {
    HEART: '09090:99999:99999:09990:00900', HEART_SMALL: '00000:09090:09990:00900:00000',
    HAPPY: '00000:09090:00000:90009:09990', SMILE: '00000:00000:00000:90009:09990',
    SAD: '00000:09090:00000:09990:90009', CONFUSED: '00000:09090:00000:09090:90909',
    ANGRY: '90009:09090:00000:99999:90909', ASLEEP: '00000:99099:00000:09990:00000',
    SURPRISED: '09090:00000:00900:09090:00900', SILLY: '90009:00000:99999:00909:00999',
    FABULOUS: '99999:99099:00000:09090:09990', MEH: '09090:00000:00090:00900:09000',
    YES: '00000:00009:00090:90900:09000', NO: '90009:09090:00900:09090:90009',
    CLOCK12: '00900:00900:00900:00000:00000', CLOCK1: '00090:00090:00900:00000:00000',
    CLOCK2: '00000:00099:00900:00000:00000', CLOCK3: '00000:00000:00999:00000:00000',
    CLOCK4: '00000:00000:00900:00099:00000', CLOCK5: '00000:00000:00900:00090:00090',
    CLOCK6: '00000:00000:00900:00900:00900', CLOCK7: '00000:00000:00900:09000:09000',
    CLOCK8: '00000:00000:00900:99000:00000', CLOCK9: '00000:00000:99900:00000:00000',
    CLOCK10: '00000:99000:00900:00000:00000', CLOCK11: '09000:09000:00900:00000:00000',
    ARROW_N: '00900:09990:90909:00900:00900', ARROW_NE: '00999:00099:00909:09000:90000',
    ARROW_E: '00900:00090:99999:00090:00900', ARROW_SE: '90000:09000:00909:00099:00999',
    ARROW_S: '00900:00900:90909:09990:00900', ARROW_SW: '00009:00090:90900:99000:99900',
    ARROW_W: '00900:09000:99999:09000:00900', ARROW_NW: '99900:99000:90900:00090:00009',
    TRIANGLE: '00000:00900:09090:99999:00000', TRIANGLE_LEFT: '90000:99000:90900:90090:99999',
    CHESSBOARD: '09090:90909:09090:90909:09090', DIAMOND: '00900:09090:90009:09090:00900',
    DIAMOND_SMALL: '00000:00900:09090:00900:00000', SQUARE: '99999:90009:90009:90009:99999',
    SQUARE_SMALL: '00000:09990:09090:09990:00000', RABBIT: '90900:90900:99990:99090:99990',
    COW: '90009:90009:99999:09990:00900', MUSIC_CROTCHET: '00900:00900:00900:99900:99900',
    MUSIC_QUAVER: '00900:00990:00909:99900:99900', MUSIC_QUAVERS: '09999:09009:09009:99099:99099',
    PITCHFORK: '90909:90909:99999:00900:00900', XMAS: '00900:09990:00900:09990:99999',
    PACMAN: '09999:99090:99900:99990:09999', TARGET: '00900:09990:99099:09990:00900',
    TSHIRT: '99099:99999:09990:09990:09990', ROLLERSKATE: '00099:00099:99999:99999:09090',
    DUCK: '09900:99900:09999:09990:00000', HOUSE: '00900:09990:99999:09990:09090',
    TORTOISE: '00000:09990:99999:09090:00000', BUTTERFLY: '99099:99999:00900:99999:99099',
    STICKFIGURE: '00900:99999:00900:09090:90009', GHOST: '99999:90909:99999:99999:90909',
    SWORD: '00900:00900:00900:09990:00900', GIRAFFE: '99000:09000:09000:09990:09090',
    SKULL: '09990:90909:99999:09990:09990', UMBRELLA: '09990:99999:00900:90900:09900',
    SNAKE: '99000:99099:09090:09990:00000', SCISSORS: '99009:99090:00900:99090:99009',
  };

  const imageConsts = Object.keys(IMAGES).map(k => 'Image.' + k + ' = Image("' + IMAGES[k] + '", True)').join('\n');

  const MICROBIT_PY = `
import _mbhost as _h

def _clamp_check(v, naam):
    if not isinstance(v, int):
        raise TypeError(naam + " moet een geheel getal zijn")
    return v

class Image:
    def __init__(self, *args):
        self._ro = False
        if len(args) == 0:
            self._w = 5
            self._h = 5
            self._px = [0] * 25
        elif len(args) == 2 and isinstance(args[1], bool):
            self._parse(args[0])
            self._ro = args[1]
        elif len(args) == 1:
            if not isinstance(args[0], str):
                raise TypeError("Image() verwacht een tekst zoals Image('09090:99999:99999:09990:00900')")
            self._parse(args[0])
        elif len(args) >= 2:
            w = _clamp_check(args[0], "breedte")
            h = _clamp_check(args[1], "hoogte")
            self._w = w
            self._h = h
            self._px = [0] * (w * h)
            if len(args) == 3:
                buf = list(args[2])
                for i in range(min(len(buf), w * h)):
                    self._px[i] = buf[i]
        else:
            raise TypeError("Image(): verkeerde waarden")

    def _parse(self, s):
        if len(s) == 1:
            px = _h.glyph(s)
            self._w = 5
            self._h = 5
            self._px = list(px)
            return
        s = s.replace("\\n", ":")
        rows = [r.strip() for r in s.split(":")]
        while len(rows) > 0 and rows[-1] == "":
            rows.pop()
        if len(rows) == 0:
            rows = ["00000"] * 5
        w = 0
        for r in rows:
            if len(r) > w:
                w = len(r)
        self._w = w
        self._h = len(rows)
        self._px = []
        for r in rows:
            for x in range(w):
                if x < len(r):
                    c = r[x]
                    if c not in "0123456789":
                        raise ValueError("In een Image mogen alleen cijfers 0 tot 9 staan, gescheiden door ':'")
                    self._px.append(int(c))
                else:
                    self._px.append(0)

    def width(self):
        return self._w

    def height(self):
        return self._h

    def _check(self, x, y):
        if not isinstance(x, int) or not isinstance(y, int):
            raise TypeError("x en y moeten gehele getallen zijn")
        if x < 0 or y < 0 or x >= self._w or y >= self._h:
            raise ValueError("Deze pixel ligt buiten de afbeelding (x en y van 0 tot " + str(self._w - 1) + ")")

    def get_pixel(self, x, y):
        self._check(x, y)
        return self._px[y * self._w + x]

    def set_pixel(self, x, y, value):
        if self._ro:
            raise TypeError("Een ingebouwde afbeelding kan je niet veranderen. Maak eerst een kopie met .copy()")
        self._check(x, y)
        if not isinstance(value, int) or value < 0 or value > 9:
            raise ValueError("Helderheid moet een geheel getal van 0 tot 9 zijn")
        self._px[y * self._w + x] = value

    def fill(self, value):
        if self._ro:
            raise TypeError("Een ingebouwde afbeelding kan je niet veranderen. Maak eerst een kopie met .copy()")
        self._px = [value] * (self._w * self._h)

    def copy(self):
        im = Image(self._w, self._h)
        im._px = list(self._px)
        return im

    def invert(self):
        im = self.copy()
        im._px = [9 - v for v in self._px]
        return im

    def _shift(self, dx, dy):
        im = Image(self._w, self._h)
        for y in range(self._h):
            for x in range(self._w):
                sx = x + dx
                sy = y + dy
                if 0 <= sx < self._w and 0 <= sy < self._h:
                    im._px[y * self._w + x] = self._px[sy * self._w + sx]
        return im

    def shift_left(self, n):
        return self._shift(n, 0)

    def shift_right(self, n):
        return self._shift(-n, 0)

    def shift_up(self, n):
        return self._shift(0, n)

    def shift_down(self, n):
        return self._shift(0, -n)

    def crop(self, x, y, w, h):
        im = Image(w, h)
        for yy in range(h):
            for xx in range(w):
                sx = x + xx
                sy = y + yy
                if 0 <= sx < self._w and 0 <= sy < self._h:
                    im._px[yy * w + xx] = self._px[sy * self._w + sx]
        return im

    def _frame(self):
        out = []
        for y in range(5):
            for x in range(5):
                if x < self._w and y < self._h:
                    out.append(self._px[y * self._w + x])
                else:
                    out.append(0)
        return out

    def _rows(self):
        rows = []
        for y in range(self._h):
            rows.append("".join([str(v) for v in self._px[y * self._w:(y + 1) * self._w]]))
        return rows

    def __repr__(self):
        return "Image('" + ":".join(self._rows()) + ":')"

    def __str__(self):
        return "Image(\\n    '" + ":'\\n    '".join(self._rows()) + ":'\\n)"

    def __add__(self, other):
        im = self.copy()
        for i in range(min(len(im._px), len(other._px))):
            im._px[i] = min(9, im._px[i] + other._px[i])
        return im

    def __mul__(self, n):
        im = self.copy()
        im._px = [max(0, min(9, int(round(v * n)))) for v in self._px]
        return im

    def __eq__(self, other):
        return isinstance(other, Image) and self._w == other._w and self._h == other._h and self._px == other._px

${imageConsts}
Image.ALL_CLOCKS = [Image.CLOCK12, Image.CLOCK1, Image.CLOCK2, Image.CLOCK3, Image.CLOCK4, Image.CLOCK5, Image.CLOCK6, Image.CLOCK7, Image.CLOCK8, Image.CLOCK9, Image.CLOCK10, Image.CLOCK11]
Image.ALL_ARROWS = [Image.ARROW_N, Image.ARROW_NE, Image.ARROW_E, Image.ARROW_SE, Image.ARROW_S, Image.ARROW_SW, Image.ARROW_W, Image.ARROW_NW]


class _Display:
    def show(self, value, delay=400, wait=True, loop=False, clear=False):
        if isinstance(value, Image):
            _h.show_px(value._frame(), "image")
            return
        if isinstance(value, bool):
            value = str(value)
        if isinstance(value, (int, float)):
            value = str(value)
        if isinstance(value, str):
            if len(value) == 0:
                return
            _h.log_show(value)
            if len(value) == 1 and not loop:
                _h.show_px(_h.glyph(value), "text")
                if clear:
                    _h.sleep(delay)
                    _h.show_px([0] * 25, "clear")
                return
            items = list(value)
        else:
            try:
                items = list(value)
            except TypeError:
                raise TypeError("display.show() kan alleen een Image, tekst, getal of lijst van afbeeldingen tonen")
        while True:
            for item in items:
                if isinstance(item, Image):
                    _h.show_px(item._frame(), "image")
                else:
                    _h.show_px(_h.glyph(str(item)), "text")
                _h.sleep(delay)
            if not loop:
                break
        if clear:
            _h.show_px([0] * 25, "clear")

    def scroll(self, text, delay=150, wait=True, loop=False, monospace=False):
        if isinstance(text, Image):
            raise TypeError("display.scroll() werkt met tekst of getallen. Gebruik display.show() voor een Image.")
        _h.scroll(str(text), delay, loop, monospace)

    def clear(self):
        _h.show_px([0] * 25, "clear")

    def _check(self, x, y):
        if not isinstance(x, int) or not isinstance(y, int):
            raise TypeError("x en y moeten gehele getallen zijn, bv. display.set_pixel(2, 3, 9)")
        if x < 0 or x > 4 or y < 0 or y > 4:
            raise ValueError("x en y moeten tussen 0 en 4 liggen (je gaf x=" + str(x) + ", y=" + str(y) + ")")

    def set_pixel(self, x, y, value):
        self._check(x, y)
        if not isinstance(value, int) or value < 0 or value > 9:
            raise ValueError("De helderheid moet een geheel getal van 0 tot 9 zijn")
        _h.set_pixel(x, y, value)

    def get_pixel(self, x, y):
        self._check(x, y)
        return _h.get_pixel(x, y)

    def on(self):
        pass

    def off(self):
        pass

    def is_on(self):
        return True

    def read_light_level(self):
        return _h.light()


class _Button:
    def __init__(self, naam):
        self._n = naam

    def is_pressed(self):
        return _h.btn_is(self._n)

    def was_pressed(self):
        return _h.btn_was(self._n)

    def get_presses(self):
        return _h.btn_presses(self._n)


class _Accelerometer:
    def get_x(self):
        return _h.accel(0)

    def get_y(self):
        return _h.accel(1)

    def get_z(self):
        return _h.accel(2)

    def get_values(self):
        return (_h.accel(0), _h.accel(1), _h.accel(2))

    def get_strength(self):
        x = _h.accel(0)
        y = _h.accel(1)
        z = _h.accel(2)
        return int((x * x + y * y + z * z) ** 0.5)

    def current_gesture(self):
        return _h.gesture_current()

    def is_gesture(self, name):
        return _h.gesture_current() == name

    def was_gesture(self, name):
        return _h.gesture_was(name)

    def get_gestures(self):
        return tuple(_h.gestures())


class _Pin:
    def __init__(self, n):
        self._n = n

    def is_touched(self):
        return _h.touched(self._n)

    def read_digital(self):
        return 0

    def write_digital(self, v):
        pass

    def read_analog(self):
        return 0

    def write_analog(self, v):
        pass


display = _Display()
button_a = _Button("a")
button_b = _Button("b")
accelerometer = _Accelerometer()
pin0 = _Pin(0)
pin1 = _Pin(1)
pin2 = _Pin(2)
pin_logo = _Pin("logo")


def sleep(ms):
    if not isinstance(ms, (int, float)):
        raise TypeError("sleep() verwacht een getal: het aantal milliseconden, bv. sleep(1000)")
    _h.sleep(ms)


def running_time():
    return _h.running_time()


def temperature():
    return _h.temperature()


def panic(n=0):
    raise RuntimeError("panic(" + str(n) + ")")


def reset():
    raise RuntimeError("reset()")
`;

  const MUSIC_PY = `
import _mbhost as _h

DADADADUM = ["r4:2", "g", "g", "g", "eb:8", "r:2", "f", "f", "f", "d:8"]
ENTERTAINER = ["d4:1", "d#", "e", "c5:2", "e4:1", "c5:2", "e4:1", "c5:3"]
PRELUDE = ["c4:1", "e", "g", "c5", "e", "g4", "c5", "e"]
ODE = ["e4", "e", "f", "g", "g", "f", "e", "d", "c", "c", "d", "e", "e:6", "d:2", "d:8"]
NYAN = ["f#5:2", "g#", "c#:1", "d#:2", "b4:1", "d5:1", "c#", "b4:2"]
RINGTONE = ["c4:1", "d", "e:2", "g", "d:1", "e", "f:2", "a"]
FUNK = ["c2:2", "c", "d#", "c:1", "f:2", "c:1", "f:2", "f#", "g"]
BLUES = ["c2:2", "e", "g", "a", "a#", "a", "g", "e"]
BIRTHDAY = ["c4:3", "c:1", "d:4", "c:4", "f", "e:8", "c:3", "c:1", "d:4", "c:4", "g", "f:8"]
WEDDING = ["c4:4", "f:3", "f:1", "f:8", "c:4", "g:3", "e:1", "f:8"]
FUNERAL = ["c3:4", "c:3", "c:1", "c:4", "d#:3", "d:1", "d:3", "c:1", "c:3", "b2:1", "c3:4"]
PUNCHLINE = ["c4:3", "g3:1", "f#", "g", "g#:3", "g", "r", "b", "c4"]
PYTHON = ["d5:1", "b4", "r", "b", "b", "a#", "b", "g5", "r", "d"]
BADDY = ["c3:3", "r", "d:2", "d#", "r", "c", "r", "f#:8"]
CHASE = ["a4:1", "b", "c5", "b4", "a:2", "r", "a:1", "b", "c5", "b4", "a:2", "r"]
BA_DING = ["b5:1", "e6:3"]
WAWAWAWAA = ["e3:3", "r:1", "d#:3", "r:1", "d:4", "r:1", "c#:8"]
JUMP_UP = ["c5:1", "d", "e", "f", "g"]
JUMP_DOWN = ["g5:1", "f", "e", "d", "c"]
POWER_UP = ["g4:1", "c5", "e", "g:2", "e:1", "g:3"]
POWER_DOWN = ["g5:1", "d#", "c", "g4:2", "b:1", "c5:3"]


def play(music, pin=None, wait=True, loop=False):
    _h.notice("music")
    if isinstance(music, str):
        music = [music]
    while True:
        for note in music:
            d = 4
            if ":" in note:
                try:
                    d = int(note.split(":")[1])
                except ValueError:
                    d = 4
            _h.sleep(d * 60)
        if not loop:
            break


def pitch(frequency, duration=-1, pin=None, wait=True):
    _h.notice("music")
    if duration > 0:
        _h.sleep(duration)


def stop(pin=None):
    pass


def set_tempo(ticks=4, bpm=120):
    pass


def reset():
    pass
`;

  window.MB_IMAGES = IMAGES;
  window.MB_PY_FILES = {
    'src/lib/microbit.py': MICROBIT_PY,
    'src/lib/music.py': MUSIC_PY,
    'src/lib/_mbhost.js': 'var $builtinmodule = function (name) { return window.MBHost.makeModule(); };',
  };
})();
